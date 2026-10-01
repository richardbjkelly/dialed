from playwright.sync_api import sync_playwright
import json
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    pg.evaluate("localStorage.setItem('dialin_v2', JSON.stringify({coffees:[{id:'c1',name:'Get Ground Tonight',roaster:'Neighbourhood',rating:8}],recipes:[]}))"); pg.reload(); pg.wait_for_timeout(500)
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300)
    t=pg.inner_text('.coffee-card-rating'); print('tile', t); assert t=='8/10' and pg.locator('#coffees-list svg[viewBox="0 0 14 14"]').count()==0
    pg.evaluate("showCoffeeDetail('c1')"); pg.wait_for_timeout(300); t=pg.inner_text('.detail-rating'); print('detail', t); assert '8/10' in t
    b.close()
print(errs); assert not errs; print('PASS')
