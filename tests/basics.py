from playwright.sync_api import sync_playwright
import json
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(**p.devices['Pixel 7']); pg=ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    pg.evaluate("""localStorage.setItem('dialin_v2', JSON.stringify({coffees:[{id:'c1',name:'Test Bean',roaster:'R',process:'Washed',roastLevel:'Light',createdAt:Date.now()}],recipes:[]}))""")
    pg.reload(); pg.wait_for_timeout(600)
    v=lambda i: pg.eval_on_selector('#'+i,'e=>e.value')
    # open Log Brew, AeroPress tab, pick Hoffmann
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(400)
    pg.click(".method-tab:has-text('AeroPress')"); pg.wait_for_timeout(200)
    pg.select_option('#r-recipe-select','aeropress-hoffmann'); pg.wait_for_timeout(200)
    rec=pg.evaluate("getAllRecipesForMethod('AeroPress').find(r=>r.id==='aeropress-hoffmann')")
    print('recipe', rec['dose'], rec['water'], '| fields', v('r-dose'), v('r-yield'))
    assert float(v('r-dose'))==rec['dose'] and float(v('r-yield'))==rec['water']
    # editable
    pg.fill('#r-dose','12'); pg.fill('#r-yield','200')
    assert v('r-dose')=='12' and v('r-yield')=='200'
    # suggestion card visible, apply keeps edits
    assert pg.inner_html('#brew-suggestion').strip()!='', 'suggestion should show'
    # method switch away and back keeps user edits
    pg.click(".method-tab:has-text('Espresso')"); pg.wait_for_timeout(150)
    print('after espresso', v('r-dose'), v('r-yield'))
    assert v('r-dose')=='12'
    pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(300)
    # reopen fresh on AeroPress with remembered recipe -> refilled
    pg.evaluate("state.selectedMethod='AeroPress'; state.selectedRecipeId='aeropress-hoffmann'; document.getElementById('r-dose').value=''; openRecipeModal()"); pg.wait_for_timeout(300)
    print('reopen', v('r-dose'), v('r-yield'))
    assert float(v('r-dose'))==rec['dose']
    # untouched autofill replaced on switching recipe via select to none
    pg.select_option('#r-recipe-select',''); assert v('r-dose')==''
    pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(300)
    # settings toggle
    pg.evaluate("openSettings(); SETTINGS_SECTIONS.forEach(k=>setSettingsSection(k,true))"); pg.wait_for_timeout(300)
    sw='#settings-suggest-switch'
    assert pg.get_attribute(sw,'aria-checked')=='true'
    pg.screenshot(path='shots/settings_on.png')
    pg.click(sw); assert pg.get_attribute(sw,'aria-checked')=='false'
    assert json.loads(pg.evaluate("localStorage.getItem('dialin_settings')"))['suggestedStart']==False
    pg.screenshot(path='shots/settings_off.png')
    pg.evaluate("closeSettings()"); pg.wait_for_timeout(300)
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(300)
    assert pg.inner_html('#brew-suggestion').strip()=='', 'suggestion hidden when off'
    pg.evaluate("closeModal('modal-recipe')")
    pg.reload(); pg.wait_for_timeout(500)
    pg.evaluate("openSettings(); SETTINGS_SECTIONS.forEach(k=>setSettingsSection(k,true))"); pg.wait_for_timeout(200)
    assert pg.get_attribute(sw,'aria-checked')=='false', 'persists'
    pg.evaluate("document.body.classList.add('dark-mode')"); pg.wait_for_timeout(100)
    pg.screenshot(path='shots/settings_dark.png')
    pg.click(sw); pg.evaluate("closeSettings()"); pg.wait_for_timeout(300)
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(300)
    assert pg.inner_html('#brew-suggestion').strip()!=''
    b.close()
print('errors', errs); assert not errs; print('PASS')
