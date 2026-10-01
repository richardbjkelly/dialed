from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    pg.evaluate("""localStorage.setItem('dialin_v2', JSON.stringify({coffees:[
     {id:'c1',name:'Supernova',roaster:'Danelaw',country:'Colombia',process:'Natural',roastLevel:'Light',varietal:'Castillo, Colombia, Caturra',masl:1800,price:14,priceGBP:14,weight:250,decaf:true},
     {id:'c2',name:'Pepe Jijon Finca Soledad',roaster:'Ninth',country:'Ecuador',process:'Washed',roastLevel:'Light',varietal:'Sidra',masl:2600,roastDate:'2026-09-10',price:20,priceGBP:20,weight:150},
     {id:'c3',name:'Get Ground Tonight',roaster:'Neighbourhood Coffee Roasters',country:'Colombia',process:'Anaerobic',roastLevel:'Light',varietal:'Ombligón',masl:1900,roastDate:'2026-09-10',price:20,priceGBP:20,weight:150},
     {id:'c4',name:'Test',finishedBag:true}],
     recipes:[{id:'r1',coffeeId:'c1',method:'V60',dose:'15',yield:'250',createdAt:new Date().toISOString()}]}));localStorage.setItem('dialin_settings',JSON.stringify({coffeeLayout:'grid',darkMode:true}))""")
    pg.reload(); pg.wait_for_timeout(600); pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300)
    hs=pg.eval_on_selector_all('#coffees-list .coffee-card','es=>es.map(e=>Math.round(e.getBoundingClientRect().height))'); print('card heights', hs); assert len(set(hs))==1
    hh=pg.eval_on_selector_all('#coffees-list .coffee-card-header','es=>es.map(e=>Math.round(e.getBoundingClientRect().height))'); print('header heights', hh)
    pg.screenshot(path='shots/same.png')
    b.close()
print(errs); assert not errs; print('PASS')
