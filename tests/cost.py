from playwright.sync_api import sync_playwright
import json
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    pg.evaluate("""localStorage.setItem('dialin_v2', JSON.stringify({coffees:[{id:'c1',name:'Test Bean',roaster:'R',process:'Washed',roastLevel:'Light',price:14,currency:'GBP',priceGBP:14,weight:250,createdAt:Date.now()}],recipes:[{id:'r1',coffeeId:'c1',method:'V60',dose:'15',yield:'250',rating:4,extraction:'good',createdAt:Date.now()}]}))""")
    pg.reload(); pg.wait_for_timeout(600)
    def pound(): return pg.evaluate("document.body.innerText.replace(document.getElementById('settings-panel').innerText,'').split('\u00a3').length-1")
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300)
    pg.evaluate("showCoffeeDetail('c1')"); pg.wait_for_timeout(400)
    on_detail=pound(); pg.evaluate("showView('tracker')"); pg.wait_for_timeout(300); on_ins=pound()
    print('on: detail', on_detail, 'insights', on_ins); assert on_detail>0 and on_ins>0
    pg.evaluate("showView('coffees')"); pg.evaluate("showCoffeeDetail('c1')"); pg.wait_for_timeout(300)
    pg.evaluate("openSettings(); SETTINGS_SECTIONS.forEach(k=>setSettingsSection(k,true))"); pg.wait_for_timeout(300)
    pg.click('#settings-costs-switch'); pg.wait_for_timeout(200)
    assert pg.get_attribute('#settings-costs-switch','aria-checked')=='false'
    pg.screenshot(path='shots/cost_settings.png')
    pg.evaluate("closeSettings()"); pg.wait_for_timeout(300)
    off_detail=pound(); pg.evaluate("restoreCoffeeList()"); off_list=pound()
    pg.evaluate("showView('tracker')"); pg.wait_for_timeout(300); off_ins=pound()
    pg.evaluate("showView('dashboard')"); pg.wait_for_timeout(300); off_dash=pound()
    print('off: detail', off_detail, 'list', off_list, 'insights', off_ins, 'dash', off_dash)
    assert off_detail==0 and off_list==0 and off_ins==0 and off_dash==0
    pg.reload(); pg.wait_for_timeout(500)
    assert json.loads(pg.evaluate("localStorage.getItem('dialin_settings')"))['showCosts']==False
    pg.evaluate("showView('tracker')"); pg.wait_for_timeout(300); assert pound()==0
    pg.evaluate("openSettings(); SETTINGS_SECTIONS.forEach(k=>setSettingsSection(k,true))"); pg.wait_for_timeout(300); pg.click('#settings-costs-switch'); pg.evaluate("closeSettings()"); pg.wait_for_timeout(300)
    pg.evaluate("showView('tracker')"); pg.wait_for_timeout(300); assert pound()>0
    b.close()
print(errs); assert not errs; print('PASS')
