from playwright.sync_api import sync_playwright
import json
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    pg.evaluate("localStorage.setItem('dialin_v2', JSON.stringify({coffees:[{id:'c1',name:'Supernova'}],recipes:[{id:'r0',coffeeId:'c1',method:'AeroPress',dose:'11',taste:{sweetness:1,acidity:2,bitterness:3},createdAt:'2026-09-29T08:00:00Z'}]}))")
    pg.reload(); pg.wait_for_timeout(500)
    st=lambda: json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))
    pg.evaluate("state.selectedCoffeeId='c1'; openRecipeModal()"); pg.wait_for_timeout(500)
    ok('starts unset, Clear all hidden', pg.is_hidden('#taste-clear-all') and pg.is_disabled('#taste-sweetness-val'))
    for k,v in [('sweetness',4),('acidity',2),('body',3)]:
        pg.evaluate(f"const i=document.getElementById('taste-{k}'); i.value={v}; i.dispatchEvent(new Event('input',{{bubbles:true}}))")
    ok('value chips show ×', pg.inner_text('#taste-sweetness-val').replace('\n','')=='4×')
    ok('Clear all appears', pg.is_visible('#taste-clear-all'))
    pg.locator('#taste-sweetness-val').scroll_into_view_if_needed(); bb=pg.locator('.taste-head').bounding_box()
    pg.screenshot(path='shots/taste_set.png', clip={'x':0,'y':bb['y']-10,'width':412,'height':200})
    pg.click('#taste-acidity-val'); pg.wait_for_timeout(100)
    ok('tap chip clears one', pg.inner_text('#taste-acidity-val')=='–' and pg.evaluate("readTaste()")=={'sweetness':4,'body':3}, pg.evaluate("readTaste()"))
    ok('others kept', pg.inner_text('#taste-body-val').startswith('3'))
    pg.click('#taste-clear-all'); pg.wait_for_timeout(100)
    ok('Clear all clears everything', pg.evaluate("readTaste()") is None and pg.is_hidden('#taste-clear-all'))
    pg.screenshot(path='shots/taste_clear.png', clip={'x':0,'y':bb['y']-10,'width':412,'height':200})
    # save with one value
    pg.evaluate("const i=document.getElementById('taste-body'); i.value=5; i.dispatchEvent(new Event('input',{bubbles:true}))")
    pg.fill('#r-dose','11'); pg.evaluate("saveRecipe()"); pg.wait_for_timeout(700); pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))"); pg.wait_for_timeout(300)
    new=[x for x in st()['recipes'] if x['id']!='r0'][0]; ok('saves only set values', new.get('taste')=={'body':5}, new.get('taste'))
    # edit brew with taste: shows values, clear one and save
    pg.evaluate("editBrew('r0')"); pg.wait_for_timeout(500)
    ok('edit shows saved taste', pg.inner_text('#taste-bitterness-val').startswith('3') and pg.is_visible('#taste-clear-all'))
    pg.click('#taste-bitterness-val'); pg.evaluate("saveRecipe()"); pg.wait_for_timeout(600); pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))")
    r0=[x for x in st()['recipes'] if x['id']=='r0'][0]; ok('cleared value removed on edit', r0.get('taste')=={'sweetness':1,'acidity':2}, r0.get('taste'))
    pg.evaluate("toggleDarkMode(); editBrew('r0')"); pg.wait_for_timeout(500); pg.locator('#taste-sweetness-val').scroll_into_view_if_needed(); bb=pg.locator('.taste-head').bounding_box()
    pg.screenshot(path='shots/taste_dark.png', clip={'x':0,'y':bb['y']-10,'width':412,'height':200})
    b.close()
print(f"{sum(res)}/{len(res)} passed; errors {errs}"); assert all(res) and not errs; print('PASS')
