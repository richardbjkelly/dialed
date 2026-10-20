# Dial in fits on one screen (no scrolling) when brewing from Up next, on common phone sizes
from playwright.sync_api import sync_playwright
import json, sys, datetime
res=[]; errs=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
d=lambda n:(datetime.date.today()-datetime.timedelta(days=n)).isoformat()
seed={'coffees':[{'id':'c1','name':'Supernova','roaster':'Manhattan','roastDate':d(18)}],
 'recipes':[{'id':'r1','coffeeId':'c1','method':'Pourover','grind':'24','dose':'15','yield':'250','temp':'94','time':'180','extraction':'sour','rating':3,'date':d(1)}],
 'plannedBrews':[{'id':'p1','coffeeId':'c1','method':'Pourover','grind':'22','grindFrom':'24','grindDir':'finer','temp':'95','tempFrom':'94','dose':'15','yield':'250','fromExtraction':'sour'}]}
with sync_playwright() as p:
    b=p.chromium.launch()
    for dev in ['Pixel 7','Pixel 5','iPhone 13','Galaxy S9+']:
        pg=b.new_context(**p.devices[dev]).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(600)
        gid=pg.evaluate("GRINDERS.find(g=>!g.stepless && grinderScale(g)).id")
        pg.evaluate(f"state.plannedBrews[0].grinderId='{gid}'; state.recipes[0].grinderId='{gid}'; state.selectedGrinderId='{gid}'")
        pg.locator('#upnext-section .upnext-actions .btn-primary, #upnext-section button:has-text("Brew")').first.tap(); pg.wait_for_timeout(600)
        m=pg.evaluate("(()=>{const m=document.querySelector('#modal-recipe .modal'); return {page:brewPage, sh:m.scrollHeight, ch:m.clientHeight, folded:document.querySelectorAll('#brew-history .bh-col').length===0}})()")
        ok(f'{dev}: Up next → Dial in with Last & best folded', m['page']=='dial' and m['folded'], m)
        ok(f'{dev}: Dial in fits without scrolling', m['sh']<=m['ch']+1, m)
        if dev=='Pixel 7':
            pg.click('#brew-history .bh-strip'); pg.wait_for_timeout(150)
            ok('Last & best opens on tap', pg.locator('#brew-history .bh-col').count()>0)
            pg.click('#brew-history .bh-strip'); pg.wait_for_timeout(150)
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
