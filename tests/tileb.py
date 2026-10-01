from playwright.sync_api import sync_playwright
import json
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    seed={'coffees':[
      {'id':'c1','name':'Supernova','roaster':'Danelaw','country':'Colombia','process':'Natural','roastLevel':'Light','varietal':'Castillo, Colombia, Caturra','decaf':True,'createdAt':'2026-09-01T00:00:00Z'},
      {'id':'c2','name':'Get Ground Tonight','roaster':'Neighbourhood Coffee Roasters','country':'Colombia','process':'Anaerobic','roastLevel':'Light','rating':8,'createdAt':'2026-09-02T00:00:00Z'},
      {'id':'c3','name':'Pepe Jijon Finca Soledad','roaster':'Ninth','country':'Ecuador','process':'Washed','roastLevel':'Light','createdAt':'2026-09-03T00:00:00Z'},
      {'id':'c4','name':'Test','finishedBag':True,'createdAt':'2026-09-04T00:00:00Z'}],
      'recipes':[{'id':'r1','coffeeId':'c1','method':'AeroPress','createdAt':'2026-09-30T08:00:00Z'},{'id':'r2','coffeeId':'c2','method':'AeroPress','createdAt':'2026-09-29T08:00:00Z'}]}
    pg.evaluate(f"localStorage.setItem('dialin_v2', JSON.stringify({json.dumps(seed)})); localStorage.setItem('dialin_settings', JSON.stringify({{coffeeLayout:'grid', darkMode:true}}))")
    pg.reload(); pg.wait_for_timeout(600)
    # give two coffees label photos the normal way (state + save -> IndexedDB)
    pg.evaluate("""(()=>{ function img(a,b,t){const c=document.createElement('canvas');c.width=300;c.height=400;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,300,400);g.addColorStop(0,a);g.addColorStop(1,b);x.fillStyle=g;x.fillRect(0,0,300,400);x.fillStyle='rgba(255,255,255,.85)';x.font='bold 34px sans-serif';x.fillText(t,30,200);return c.toDataURL('image/jpeg',.8)}
      state.coffees.find(c=>c.id==='c1').labelPhoto=img('#6b2a1c','#1b0d08','supernova'); state.coffees.find(c=>c.id==='c2').labelPhoto=img('#e8e0ee','#8b7d99','GET GROUND');
      state.coffees.find(c=>c.id==='c3').labelPhoto=img('#d9a27a','#5a3322','NINTH'); save(); })()""")
    pg.wait_for_timeout(400); pg.evaluate("showView('coffees')"); pg.wait_for_timeout(500)
    hs=pg.eval_on_selector_all('#coffees-list .coffee-card','es=>es.map(e=>Math.round(e.getBoundingClientRect().height))'); ok('all tiles same height', len(set(hs))==1, hs)
    ok('4 tiles', len(hs)==4, hs)
    ok('photos shown', pg.locator('#coffees-list img.tile-photo').count()==3)
    ok('placeholder initial when no photo', pg.locator('#coffees-list .tile-photo-empty').count()==1)
    ok('frosted panel', 'blur' in pg.eval_on_selector('#coffees-list .tile-body','e=>getComputedStyle(e).backdropFilter'))
    ok('text panel inside tile, over photo', pg.evaluate("(()=>{const c=document.querySelector('#coffees-list .coffee-card').getBoundingClientRect(), b=document.querySelector('#coffees-list .tile-body').getBoundingClientRect(), p=document.querySelector('#coffees-list .tile-banner').getBoundingClientRect(); return Math.abs(b.bottom-c.bottom)<2 && p.bottom>=b.bottom-2})()"))
    ok('rating badge 8/10', pg.inner_text('#coffees-list .tile-rating')=='8/10')
    ok('decaf badge', pg.locator('#coffees-list .tile-decaf').count()==1)
    ok('finished badge', pg.locator('#coffees-list .tile-fin').count()==1)
    sw=pg.evaluate("document.documentElement.scrollWidth"); ok('no sideways scroll', sw<=412, sw)
    pg.screenshot(path='shots/tb_dark.png')
    # ⋯ menu on tile
    pg.locator('#coffees-list .tile-more').first.click(); pg.wait_for_timeout(250)
    ok('⋯ opens menu', pg.evaluate("[...document.querySelectorAll('.card-edit-overlay.visible')].filter(o=>o.getClientRects().length).length")==1)
    ok('⋯ did not open coffee', pg.locator('.btn-delete-coffee').count()==0)
    pg.screenshot(path='shots/tb_menu.png'); pg.evaluate("hideAllOverlays()")
    # tap opens coffee
    pg.locator('#coffees-list .tile-body').first.click(); pg.wait_for_timeout(500); ok('tap opens coffee page', pg.locator('.btn-delete-coffee').count()==1)
    pg.evaluate("restoreCoffeeList()"); pg.wait_for_timeout(300)
    # light mode
    pg.evaluate("toggleDarkMode()"); pg.wait_for_timeout(300); pg.screenshot(path='shots/tb_light.png')
    # list view unchanged
    pg.click('.layout-toggle [data-layout=list]'); pg.wait_for_timeout(300)
    ok('list view uses original tiles', pg.locator('#coffees-list .tile-b').count()==0 and pg.locator('#coffees-list .coffee-card-header').count()==4)
    # extra large text -> one per row still consistent
    pg.click('.layout-toggle [data-layout=grid]'); pg.evaluate("setTextSize('xlarge')"); pg.wait_for_timeout(300)
    hs=pg.eval_on_selector_all('#coffees-list .coffee-card','es=>es.map(e=>Math.round(e.getBoundingClientRect().height))'); ok('xl text: same height', len(set(hs))==1, hs)
    pg.screenshot(path='shots/tb_xl.png'); pg.evaluate("setTextSize('default')")
    b.close()
print(f"{sum(res)}/{len(res)} passed; errors {errs}"); assert all(res) and not errs; print('PASS')
