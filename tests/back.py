# Phone Back / swipe-back goes up one level at a time.
from playwright.sync_api import sync_playwright
import json, sys
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
seed={'coffees':[{'id':f'c{i}','name':f'Coffee {i:02d}','roaster':'R','country':'Kenya','createdAt':'2026-09-%02dT00:00:00Z'%(i+1)} for i in range(24)],
      'recipes':[{'id':'r1','coffeeId':'c20','method':'AeroPress','dose':'11','createdAt':'2026-09-25T07:00:00Z'}]}
detail=lambda pg: pg.locator('#view-coffees .detail-hero').count()==1
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(700)
    pg.locator('.bottom-nav .nav-tab', has_text='Coffees').tap(); pg.wait_for_timeout(500)
    pg.evaluate("setCoffeeLayout('list')"); pg.wait_for_timeout(300)
    card=pg.locator('#coffees-list .coffee-card').nth(15); card.scroll_into_view_if_needed(); pg.wait_for_timeout(200)
    y=pg.evaluate("scrollY"); name=card.locator('.coffee-card-name').inner_text(); card.tap(position={'x':60,'y':20}); pg.wait_for_timeout(600)
    ok('opened a coffee from far down the library', detail(pg) and y>300 and pg.evaluate("scrollY")==0, y)
    pg.go_back(); pg.wait_for_timeout(600)
    ok('Back from a coffee returns to the Coffee Library', pg.evaluate("state.currentView")=='coffees' and not detail(pg) and pg.locator('#coffees-list .coffee-card').count()==24)
    ok('library is back where it was scrolled to', abs(pg.evaluate("scrollY")-y)<=2, [pg.evaluate("scrollY"),y])
    pg.go_back(); pg.wait_for_timeout(600); ok('Back again goes to Overview', pg.evaluate("state.currentView")=='dashboard')
    pg.go_back(); pg.wait_for_timeout(400); ok('Back on Overview warns before leaving', 'again to exit' in pg.inner_text('#toast') and pg.evaluate("state.currentView")=='dashboard' and 'dialed' in pg.url)
    # on-screen Back button also restores scroll
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(400); card=pg.locator('#coffees-list .coffee-card').nth(18); card.scroll_into_view_if_needed(); pg.wait_for_timeout(200); y2=pg.evaluate("scrollY")
    card.tap(position={'x':60,'y':20}); pg.wait_for_timeout(500); pg.tap('.detail-back'); pg.wait_for_timeout(500)
    ok('on-screen Back also restores the scroll position', not detail(pg) and abs(pg.evaluate("scrollY")-y2)<=2)
    # layers close first, coffee page stays
    pg.evaluate("showCoffeeDetail('c20')"); pg.wait_for_timeout(400); pg.evaluate("openEditCoffee('c20')"); pg.wait_for_timeout(600); pg.go_back(); pg.wait_for_timeout(500)
    ok('Back closes an open sheet first and stays on the coffee', pg.locator('.modal-overlay.open').count()==0 and detail(pg))
    pg.evaluate("openSettings()"); pg.wait_for_timeout(400); pg.go_back(); pg.wait_for_timeout(500)
    ok('Back closes Settings first and stays on the coffee', pg.locator('#settings-panel.open').count()==0 and detail(pg))
    pg.go_back(); pg.wait_for_timeout(500); ok('then Back returns to the library', not detail(pg) and pg.evaluate("state.currentView")=='coffees')
    # coffee opened from elsewhere (roaster page) still goes back to the library
    pg.evaluate("showView('dashboard'); openCoffeeFromRoaster('c3')"); pg.wait_for_timeout(600); pg.go_back(); pg.wait_for_timeout(500)
    ok('a coffee opened from another screen also goes back to the library', pg.evaluate("state.currentView")=='coffees' and not detail(pg))
    # other tabs unchanged
    pg.evaluate("showView('tracker')"); pg.wait_for_timeout(400); pg.go_back(); pg.wait_for_timeout(500); ok('Back from Insights goes to Overview', pg.evaluate("state.currentView")=='dashboard')
    # ---- roaster country: every way of writing the US / UK becomes "US" / "UK"
    pg2=b.new_context(**p.devices['Pixel 7']).new_page(); pg2.on('pageerror',lambda e:errs.append(str(e)))
    vs=['US','usa','United States','United States of America','UK','United Kingdom ','united  kingdom','Germany']
    sd={'coffees':[{'id':f'k{i}','name':f'K{i}','roaster':f'R{i}','roasterCountry':v,'country':'USA','createdAt':'2026-09-01T00:00:00Z'} for i,v in enumerate(vs)],'recipes':[]}
    pg2.goto('http://localhost:8765/dialed/index.html'); pg2.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(sd)); pg2.reload(); pg2.wait_for_timeout(700)
    ok('saved coffees: US and UK spellings unified', pg2.evaluate("state.coffees.map(c=>c.roasterCountry)")==['US','US','US','US','UK','UK','UK','Germany'], pg2.evaluate("state.coffees.map(c=>c.roasterCountry)"))
    ok('origin country is left alone', pg2.evaluate("state.coffees[0].country")=='USA')
    ok('Insights counts them together', pg2.evaluate("topN(state.coffees,'roasterCountry')")==[['US',4],['UK',3],['Germany',1]], pg2.evaluate("topN(state.coffees,'roasterCountry')"))
    for typed,want in [('United States of America','US'),('u.s.a.','US'),('Great Britain','UK'),('United Kingdom','UK'),('Ukraine','Ukraine'),('Australia','Australia')]:
        pg2.evaluate("resetCoffeeModal(); openModal('modal-coffee')"); pg2.wait_for_timeout(250); pg2.fill('#c-name','N '+typed); pg2.fill('#c-roaster-country',typed); pg2.wait_for_timeout(750); pg2.evaluate("saveCoffee()"); pg2.wait_for_timeout(700)
        got=[c for c in json.loads(pg2.evaluate("localStorage.getItem('dialin_v2')"))['coffees'] if c['name']=='N '+typed][0]['roasterCountry']
        ok(f'typed "{typed}" is saved as "{want}"', got==want, got)
    pg2.close()
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
