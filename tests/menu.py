from playwright.sync_api import sync_playwright
import json
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    seed={'coffees':[{'id':'c1','name':'Supernova','roaster':'Danelaw','weight':1000,'createdAt':'2026-09-01T00:00:00Z'}],
          'recipes':[{'id':'r1','coffeeId':'c1','grinderId':'e29','method':'AeroPress','grind':'10','dose':'11','yield':'200','temp':'88','time':228,'rating':9,'extraction':'over','notes':'Decent acidity','createdAt':'2026-09-30T08:00:00Z'}]}
    pg.evaluate(f"localStorage.setItem('dialin_v2', JSON.stringify({json.dumps(seed)}))"); pg.reload(); pg.wait_for_timeout(600)
    vis = lambda: pg.evaluate("[...document.querySelectorAll('.card-edit-overlay.visible')].filter(o=>o.getClientRects().length).length")
    for where, go in [('coffee page', "showView('coffees'); showCoffeeDetail('c1')"), ('overview', "showView('dashboard')"), ('insights', "showView('tracker')")]:
        pg.evaluate(go); pg.wait_for_timeout(500)
        btn = pg.locator(".recipe-entry .card-more").locator("visible=true").first
        btn.scroll_into_view_if_needed(); btn.click(); pg.wait_for_timeout(250)
        ok(f'menu visible on {where}', vis()==1, vis())
        if where=='coffee page': pg.screenshot(path='shots/menu_detail.png')
        pg.locator('.card-edit-overlay.visible >> text=Cancel').click(); pg.wait_for_timeout(200); ok(f'cancel closes on {where}', vis()==0)
    # actions from coffee page
    pg.evaluate("showView('coffees'); showCoffeeDetail('c1')"); pg.wait_for_timeout(500)
    pg.locator(".recipe-entry .card-more").locator("visible=true").first.click(); pg.wait_for_timeout(250)
    pg.locator('.card-edit-overlay.visible >> text=Edit').click(); pg.wait_for_timeout(500)
    ok('edit opens log brew with values', pg.locator('#modal-recipe.open').count()==1 and pg.input_value('#r-grind')=='10', pg.input_value('#r-grind'))
    pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(300)
    pg.locator(".recipe-entry .card-more").locator("visible=true").first.click(); pg.wait_for_timeout(250)
    pg.locator('.card-edit-overlay.visible >> text=Plan next').click(); pg.wait_for_timeout(500)
    ok('plan next opens', pg.locator('#modal-plan.open').count()==1); pg.evaluate("closeModal('modal-plan')"); pg.wait_for_timeout(300)
    pg.locator(".recipe-entry .card-more").locator("visible=true").first.click(); pg.wait_for_timeout(250)
    pg.locator('.card-edit-overlay.visible >> text=Delete').click(); pg.wait_for_timeout(400); pg.click('#confirm-delete-btn'); pg.wait_for_timeout(400)
    ok('delete works', json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))['recipes']==[])
    b.close()
print(f"{sum(res)}/{len(res)} passed; errors {errs}"); assert all(res) and not errs; print('PASS')
