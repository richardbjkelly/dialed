from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    pg.evaluate("""localStorage.setItem('dialin_v2', JSON.stringify({coffees:[{id:'c1',name:'Supernova',roaster:'Danelaw',country:'Colombia',process:'Natural'},{id:'c2',name:'Sugarcane Decaf',roaster:'Ninth',country:'Colombia',process:'EA',decaf:true}],recipes:[]}));localStorage.setItem('dialin_settings',JSON.stringify({coffeeLayout:'grid'}))""")
    pg.reload(); pg.wait_for_timeout(500); pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300)
    assert pg.locator('.tile-decaf').count()==1
    card=pg.locator('#coffees-list .coffee-card').nth(1).bounding_box(); lab=pg.locator('.tile-decaf').bounding_box()
    print('label right gap', round(card['x']+card['width']-(lab['x']+lab['width'])), 'bottom gap', round(card['y']+card['height']-(lab['y']+lab['height'])))
    shots=[]
    pg.screenshot(path='shots/dc1.png', clip={'x':0,'y':150,'width':412,'height':260})
    pg.click('.layout-toggle [data-layout=list]'); pg.wait_for_timeout(200); pg.screenshot(path='shots/dc2.png', clip={'x':0,'y':150,'width':412,'height':330})
    pg.evaluate("toggleDarkMode()"); pg.click('.layout-toggle [data-layout=grid]'); pg.wait_for_timeout(200); pg.screenshot(path='shots/dc3.png', clip={'x':0,'y':150,'width':412,'height':260})
    b.close()
print(errs); assert not errs; print('PASS')
