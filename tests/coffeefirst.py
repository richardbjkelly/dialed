# The coffee being brewed is listed first in Log Brew.
from playwright.sync_api import sync_playwright
import json, sys
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
names=['Alpha','Bravo','Charlie','Delta','Echo','Foxtrot']
seed={'coffees':[{'id':f'c{i}','name':n,'roaster':'R'} for i,n in enumerate(names)]+[{'id':'cf','name':'Finished','finishedBag':True}],
      'recipes':[{'id':'r1','coffeeId':'c4','method':'AeroPress','dose':'11','rating':7,'createdAt':'2026-09-02T07:00:00Z'},{'id':'rf','coffeeId':'cf','method':'AeroPress','dose':'11','createdAt':'2026-08-02T07:00:00Z'}],
      'plannedBrews':[{'id':'p1','coffeeId':'c5','method':'AeroPress','createdAt':'2026-09-20T00:00:00Z'}]}
order=lambda pg: pg.evaluate("[...document.querySelectorAll('#coffee-selector .cs-name')].map(e=>e.textContent)")
sel=lambda pg: pg.evaluate("document.querySelector('#coffee-selector .coffee-selector-item.selected .cs-name')?.textContent")
close=lambda pg: (pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))"), pg.wait_for_timeout(400))
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(600)
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(400)
    ok('plain Log Brew: library order, first coffee selected', order(pg)==names and sel(pg)=='Alpha', order(pg)); close(pg)
    # Brew now from Up next
    pg.locator('#upnext-list .upnext-card button', has_text='Brew now').first.tap(); pg.wait_for_timeout(600)
    o=order(pg); ok('Brew now: planned coffee is first and selected', o[0]=='Foxtrot' and sel(pg)=='Foxtrot' and o[1:]==names[:5], o)
    ok('it is in view without scrolling the list', pg.evaluate("(()=>{const l=document.getElementById('coffee-selector'), s=l.querySelector('.selected'); const a=l.getBoundingClientRect(), b=s.getBoundingClientRect(); return l.scrollTop===0 && b.top>=a.top-1 && b.bottom<=a.bottom+1})()"))
    # tapping another coffee doesn't reshuffle
    pg.evaluate("[...document.querySelectorAll('#coffee-selector .coffee-selector-item')][3].click()"); pg.wait_for_timeout(200)
    ok('tapping another coffee selects it without reordering', order(pg)==o and sel(pg)==o[3]); close(pg)
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(400)
    ok('next open: the last-used coffee is first', order(pg)[0]==o[3] and sel(pg)==o[3], order(pg)); close(pg)
    # repeat / edit
    pg.evaluate("repeatBrew('r1')"); pg.wait_for_timeout(500); ok('Repeat: that coffee first', order(pg)[0]=='Echo' and sel(pg)=='Echo'); close(pg)
    pg.evaluate("editBrew('rf')"); pg.wait_for_timeout(500); ok('editing a brew of a finished bag: that coffee first', order(pg)[0]=='Finished' and sel(pg)=='Finished', order(pg)); close(pg)
    pg.evaluate("state.selectedCoffeeId='nope'; openRecipeModal()"); pg.wait_for_timeout(400)
    ok('unknown selection falls back to the first coffee', order(pg)==names and sel(pg)=='Alpha' and 'Finished' not in order(pg))
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
