from playwright.sync_api import sync_playwright
import json
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    pg.evaluate("""localStorage.setItem('dialin_v2', JSON.stringify({coffees:[{id:'c1',name:'Bean One',roaster:'R'},{id:'c2',name:'Bean Two',roaster:'R'}],recipes:[{id:'r1',coffeeId:'c1',method:'V60',dose:'15',yield:'250'},{id:'r2',coffeeId:'c2',method:'V60',dose:'15',yield:'250'}],plannedBrews:[{id:'p1',coffeeId:'c1',method:'V60'}]}))""")
    pg.reload(); pg.wait_for_timeout(600)
    pg.click(".bottom-nav >> text=Coffees") if pg.locator(".bottom-nav >> text=Coffees").count() else pg.evaluate("showView('coffees')")
    pg.wait_for_timeout(400)
    # via card menu
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300); pg.locator("#coffees-list .card-more").first.click(); pg.wait_for_timeout(200)
    pg.screenshot(path='shots/del_menu.png')
    pg.locator(".card-edit-overlay.visible >> text=Delete").click(); pg.wait_for_timeout(300)
    print('confirm:', pg.inner_text('#confirm-delete-title'), pg.inner_text('#confirm-delete-subtitle'))
    pg.screenshot(path='shots/del_confirm.png')
    pg.click('#confirm-delete-btn'); pg.wait_for_timeout(400)
    st=json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))
    print([c['id'] for c in st['coffees']], [r['id'] for r in st['recipes']], st.get('plannedBrews'))
    assert [c['id'] for c in st['coffees']]==['c2'] and [r['id'] for r in st['recipes']]==['r2'] and not st['plannedBrews']
    # via detail page
    pg.evaluate("showCoffeeDetail('c2')"); pg.wait_for_timeout(400)
    pg.locator('.btn-delete-coffee').scroll_into_view_if_needed(); pg.screenshot(path='shots/del_detail.png')
    pg.click('.btn-delete-coffee'); pg.wait_for_timeout(300); pg.click('#confirm-delete-btn'); pg.wait_for_timeout(400)
    st=json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))
    assert st['coffees']==[] and st['recipes']==[]
    assert pg.locator('#coffees-list').count()==1, 'back on list'
    print('stats', pg.inner_text('#stat-coffees'))
    b.close()
print(errs); assert not errs; print('PASS')
