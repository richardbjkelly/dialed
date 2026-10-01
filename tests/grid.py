from playwright.sync_api import sync_playwright
import json
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    pg.evaluate("""localStorage.setItem('dialin_v2', JSON.stringify({coffees:[
      {id:'c1',name:'Kiambu Peaberry',roaster:'Square Mile',country:'Kenya',process:'Washed',roastLevel:'Light',varietal:'SL28',price:14,priceGBP:14,weight:250,roastDate:'2026-09-20',rating:4},
      {id:'c2',name:'La Esperanza Gesha Natural Anaerobic',roaster:'Origin Coffee Roasters',country:'Colombia',process:'Natural'},
      {id:'c3',name:'Halo Beriti',roaster:'Dak',country:'Ethiopia',process:'Washed',finishedBag:true},
      {id:'c4',name:'Santa Barbara',roaster:'Rave',country:'Honduras'},{id:'c5',name:'Nano Challa',roaster:'Assembly'}],
      recipes:[{id:'r1',coffeeId:'c1',method:'V60',dose:'15',yield:'250',createdAt:new Date().toISOString()}]}))""")
    pg.reload(); pg.wait_for_timeout(600)
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(400)
    assert pg.get_attribute('.layout-toggle [data-layout=list]','aria-pressed')=='true'
    pg.screenshot(path='shots/g_list.png')
    pg.click('.layout-toggle [data-layout=grid]'); pg.wait_for_timeout(300)
    boxes=[pg.locator('#coffees-list .card-wrap').nth(i).bounding_box() for i in range(2)]
    print('grid boxes', [(round(x['x']),round(x['width'])) for x in boxes]); assert abs(boxes[0]['y']-boxes[1]['y'])<2 and boxes[1]['x']>boxes[0]['x']
    sw=pg.evaluate("document.documentElement.scrollWidth"); print('scrollWidth', sw); assert sw<=412
    pg.screenshot(path='shots/g_grid.png')
    # menu in grid
    pg.locator('#coffees-list .card-more').first.click(); pg.wait_for_timeout(250); pg.screenshot(path='shots/g_menu.png'); pg.evaluate("hideAllOverlays()")
    # persists, and survives detail -> back
    pg.reload(); pg.wait_for_timeout(500); pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300)
    assert 'grid' in pg.get_attribute('#coffees-list','class')
    pg.locator('#coffees-list .coffee-card').first.click(); pg.wait_for_timeout(400); pg.evaluate("restoreCoffeeList()"); pg.wait_for_timeout(300)
    assert 'grid' in pg.get_attribute('#coffees-list','class') and pg.get_attribute('.layout-toggle [data-layout=grid]','aria-pressed')=='true'
    pg.evaluate("toggleDarkMode()"); pg.wait_for_timeout(200); pg.screenshot(path='shots/g_dark.png')
    pg.click('.layout-toggle [data-layout=list]'); pg.wait_for_timeout(200); assert 'grid' not in (pg.get_attribute('#coffees-list','class') or '')
    b.close()
print(errs); assert not errs; print('PASS')
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page()
    pg.goto('http://localhost:8765/dialed/index.html')
    pg.evaluate("""localStorage.setItem('dialin_v2', JSON.stringify({coffees:[{id:'c1',name:'Kiambu Peaberry',roaster:'Square Mile',country:'Kenya',process:'Washed',roastLevel:'Light',varietal:'SL28, SL34',masl:1800,price:14,priceGBP:14,weight:250,roastDate:'2026-09-20'},{id:'c2',name:'Two',roaster:'R',country:'Peru'}],recipes:[{id:'r1',coffeeId:'c1',method:'V60',dose:'15',yield:'250',createdAt:new Date().toISOString()}]}));localStorage.setItem('dialin_settings',JSON.stringify({coffeeLayout:'grid'}))""")
    pg.reload(); pg.wait_for_timeout(500); pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300)
    t=pg.locator('#coffees-list .tile-summary').first.inner_text(); print('grid summary', t)
    assert t=='Kenya · Washed · Light'
    pg.screenshot(path='shots/g_more.png')
    pg.click('.layout-toggle [data-layout=list]'); pg.wait_for_timeout(200)
    print('list pills', pg.locator('#coffees-list .coffee-meta').first.inner_text().split('\n'))
    b.close()
print('PASS2')
