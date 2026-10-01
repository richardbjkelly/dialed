from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    pg.evaluate("""localStorage.setItem('dialin_v2', JSON.stringify({coffees:[
     {id:'c1',name:'Supernova',roaster:'Danelaw',country:'Colombia',process:'Natural',roastLevel:'Light',varietal:'Castillo, Colombia, Caturra',masl:1800,price:14,priceGBP:14,weight:250,roastDate:'2026-09-20'},
     {id:'c2',name:'Pepe Jijon Finca Soledad',roaster:'Ninth',country:'Ecuador',process:'Washed',roastLevel:'Light',varietal:'Sidra',masl:2600,roastDate:'2026-09-10',price:20,priceGBP:20,weight:150},
     {id:'c3',name:'Long',roaster:'R',country:'Democratic Republic of the Congo',process:'Double Anaerobic Thermal Shock Natural',roastLevel:'Medium-Light',varietal:'Pink Bourbon'}],
     recipes:[{id:'r1',coffeeId:'c1',method:'V60',dose:'15',yield:'250',createdAt:new Date().toISOString()}]}));localStorage.setItem('dialin_settings',JSON.stringify({coffeeLayout:'grid',darkMode:true}))""")
    pg.reload(); pg.wait_for_timeout(600); pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300)
    print([pg.locator('#coffees-list .tile-summary').nth(i).inner_text() for i in range(3)])
    # nothing wider than its tile
    over=pg.evaluate("[...document.querySelectorAll('#coffees-list .tile-summary, #coffees-list .tile-name, #coffees-list .tile-roaster')].filter(p=>p.getBoundingClientRect().right>p.closest('.coffee-card').getBoundingClientRect().right-1).length"); print('overflowing pills', over); assert over==0
    pg.screenshot(path='shots/var.png')
    pg.click('.layout-toggle [data-layout=list]'); pg.wait_for_timeout(200); print('list', pg.locator('#coffees-list .coffee-meta').first.inner_text().split('\n'))
    b.close()
print(errs); assert not errs; print('PASS')
