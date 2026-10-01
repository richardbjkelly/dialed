from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    pg.evaluate("""localStorage.setItem('dialin_v2', JSON.stringify({coffees:[
      {id:'a',name:'A old brew',createdAt:'2026-09-01T10:00:00Z'},{id:'b',name:'B recent brew',createdAt:'2026-08-01T10:00:00Z'},
      {id:'c',name:'C never brewed new',createdAt:'2026-09-29T10:00:00Z'},{id:'d',name:'D finished',finishedBag:true},{id:'e',name:'E never brewed old',createdAt:'2026-07-01T10:00:00Z'}],
      recipes:[{id:'r1',coffeeId:'a',method:'V60',createdAt:'2026-09-10T08:00:00Z'},{id:'r2',coffeeId:'b',method:'V60',createdAt:'2026-09-28T08:00:00Z'},{id:'r3',coffeeId:'d',method:'V60',createdAt:'2026-09-30T08:00:00Z'},{id:'r4',coffeeId:'b',method:'V60',createdAt:'2026-09-02T08:00:00Z'}]}))""")
    pg.reload(); pg.wait_for_timeout(500); pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300)
    names=pg.eval_on_selector_all('#coffees-list .coffee-card-name','es=>es.map(e=>e.childNodes[0].textContent.trim())'); print(names)
    assert names==['B recent brew','A old brew','C never brewed new','E never brewed old','D finished']
    # logging a brew for A moves it to top
    pg.evaluate("state.recipes.unshift({id:'r9',coffeeId:'a',method:'V60',createdAt:new Date().toISOString()}); save(); renderCoffeesView()")
    names=pg.eval_on_selector_all('#coffees-list .coffee-card-name','es=>es.map(e=>e.childNodes[0].textContent.trim())'); print(names); assert names[0]=='A old brew'
    b.close()
print(errs); assert not errs; print('PASS')
