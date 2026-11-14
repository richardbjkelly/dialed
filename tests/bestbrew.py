# Best brew card: one swipeable card per method, overall best first; dots follow the swipe
from playwright.sync_api import sync_playwright
import json, datetime
res=[]; errs=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
T=datetime.date.today().isoformat()
B=lambda i,m,r,g,h,**k: {'id':i,'coffeeId':k.get('cf','a'),'grinderId':'e29','method':m,'grind':g,'dose':'15','yield':'250','temp':'93','time':'3:00','rating':r,'createdAt':T+'T%02d:00:00Z'%h,**{x:y for x,y in k.items() if x!='cf'}}
seed={'coffees':[{'id':'a','name':'Alpha','roaster':'R'},{'id':'b','name':'Beta','roaster':'R'},{'id':'c','name':'Gamma','roaster':'R'}],
 'recipes':[B('p1','Pourover',7,'8',8), B('p2','Pourover',8,'9',9), B('s1','Steep & Release',9,'10',10), B('a1','AeroPress',6,'5',11),
            B('a2','AeroPress',6,'6',12,extraction='good'), B('x','Pourover',0,'1',13),
            B('b1','Pourover',8,'8',8,cf='b'), B('b2','Pourover',5,'7',9,cf='b')]}
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(600)
    ids=pg.evaluate("bestBrewsByMethod('a').map(r=>r.id)")
    ok('one best per method, highest rating first; a tie goes to the good extraction', ids==['s1','p2','a2'], ids)
    ok('bestBrew still gives the overall best', pg.evaluate("bestBrew('a').id")=='s1')
    pg.evaluate("showView('coffees'); showCoffeeDetail('a')"); pg.wait_for_timeout(400)
    heads=pg.evaluate("[...document.querySelectorAll('.bb-slide')].map(s=>s.querySelector('span').textContent.trim())")
    ok('three cards: Best brew so far, then Best Pourover, Best AeroPress', heads==['Best brew so far','Best Pourover','Best AeroPress'], heads)
    ok('three dots, first lit', pg.locator('.bb-dot').count()==3 and pg.evaluate("document.querySelector('.bb-dot').classList.contains('on')"))
    ok('the next card peeks in from the right', pg.evaluate("(()=>{const t=document.querySelector('.bb-track'),r=t.getBoundingClientRect(),s=t.children[1].getBoundingClientRect();return s.left<r.right && s.left>r.left})()"))
    ok('the page itself does not scroll sideways', pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
    t=pg.locator('.bb-track'); box=t.bounding_box()
    pg.evaluate("(()=>{const t=document.querySelector('.bb-track');t.scrollLeft=t.children[1].offsetLeft-t.children[0].offsetLeft})()"); pg.wait_for_timeout(500)
    ok('swiping to card 2 lights dot 2', pg.evaluate("[...document.querySelectorAll('.bb-dot')].map(d=>d.classList.contains('on'))")==[False,True,False])
    pg.locator('.bb-dot').nth(2).tap(); pg.wait_for_timeout(900)
    ok('tapping dot 3 scrolls to the AeroPress card', pg.evaluate("[...document.querySelectorAll('.bb-dot')].map(d=>d.classList.contains('on'))")==[False,False,True])
    pg.locator('.bb-slide').nth(2).locator('button', has_text='Repeat').tap(); pg.wait_for_timeout(600)
    ok('Repeat on the AeroPress card opens Log Brew with that brew', pg.evaluate("document.getElementById('modal-recipe').classList.contains('open')") and pg.evaluate("document.getElementById('r-grind').value")=='6', pg.evaluate("document.getElementById('r-grind') && document.getElementById('r-grind').value"))
    pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))"); pg.wait_for_timeout(400)
    pg.evaluate("showCoffeeDetail('b')"); pg.wait_for_timeout(400)
    ok('one method: a single card, no swiping, no dots', pg.locator('.bb-slide').count()==1 and pg.locator('.bb-track').count()==0 and pg.locator('.bb-dot').count()==0)
    pg.evaluate("showCoffeeDetail('c')"); pg.wait_for_timeout(400)
    ok('no rated brews: no card', pg.locator('.bb-slide').count()==0)
    ok('no page errors', not errs, errs)
    b.close()
print(sum(res),'/',len(res)); import sys; sys.exit(0 if all(res) else 1)
