# Real taps (not function calls) through the main flows, to prove the handler dispatcher works end to end.
from playwright.sync_api import sync_playwright
import json, os
URL=os.environ.get('DIALED_URL','http://localhost:8765/dialed/index.html')
errs=[]; cons=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
st=lambda pg: json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page()
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:cons.append(m.text))
    pg.goto(URL); pg.evaluate("localStorage.setItem('dialin_v2', JSON.stringify({coffees:[],recipes:[]}))"); pg.reload(); pg.wait_for_timeout(600)
    # add a coffee by tapping
    pg.tap('.fab'); pg.wait_for_timeout(400); ok('+ opens the chooser', pg.locator('#modal-fab.open').count()==1)
    pg.tap('#modal-fab button:has-text("New Coffee")'); pg.wait_for_timeout(500); ok('New Coffee opens the form', pg.locator('#modal-coffee.open').count()==1)
    pg.fill('#c-name','Tap Coffee'); pg.fill('#c-weight','250'); pg.fill('#c-price','12'); pg.wait_for_timeout(200)
    ok('typing updates the price preview (input handler)', '4.80' in pg.inner_text('#c-price-preview'), pg.inner_text('#c-price-preview'))
    dec=pg.locator('#c-decaf'); row=dec.locator('xpath=..'); row.tap(position={'x':150,'y':10}); pg.wait_for_timeout(150)
    ok('tapping the decaf row ticks it', dec.is_checked())
    dec.tap(); pg.wait_for_timeout(150); ok('tapping the box itself unticks once (no double toggle)', not dec.is_checked())
    dec.tap(); pg.wait_for_timeout(150)
    pg.locator('#modal-coffee button:has-text("Save")').first.tap(); pg.wait_for_timeout(900)
    c=st(pg)['coffees']; ok('Save adds the coffee', len(c)==1 and c[0]['name']=='Tap Coffee' and c[0]['decaf']==True, c)
    # log a brew by tapping
    pg.tap('.fab'); pg.wait_for_timeout(400); pg.tap('#modal-fab button:has-text("Log Brew")'); pg.wait_for_timeout(600)
    ok('Log Brew opens', pg.locator('#modal-recipe.open').count()==1)
    pg.locator('#modal-recipe .method-tab', has_text='AeroPress').tap(); pg.wait_for_timeout(200)
    ok('method chip selects', pg.evaluate("state.selectedMethod")=='AeroPress' and pg.is_visible('#r-time-filter'))
    pg.fill('#r-dose','11'); pg.fill('#r-yield','200')
    pg.locator('#modal-recipe .extraction-btn.good').scroll_into_view_if_needed(); pg.locator('#modal-recipe .extraction-btn.good').tap()
    ok('extraction chip selects', pg.evaluate("state.selectedExtraction")=='good')
    pg.evaluate("const r=document.getElementById('r-rating-range'); r.value=8; r.dispatchEvent(new Event('input',{bubbles:true}))")
    ok('rating slider updates label', '8' in pg.inner_text('#r-rating-val'))
    sb=pg.locator('#modal-recipe button.btn-primary', has_text='Log Brew').last; sb.scroll_into_view_if_needed(); sb.tap(); pg.wait_for_timeout(1000)
    r=st(pg)['recipes']; ok('Save logs the brew', len(r)==1 and r[0]['method']=='AeroPress' and str(r[0]['rating'])=='8', r)
    pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))"); pg.wait_for_timeout(500)
    # navigation
    for label,view in [('Coffees','coffees'),('Insights','tracker'),('Overview','dashboard')]:
        pg.locator('.bottom-nav .nav-tab', has_text=label).tap(); pg.wait_for_timeout(450)
        ok(f'tab bar: {label}', pg.evaluate("state.currentView")==view)
    pg.locator('.bottom-nav .nav-tab', has_text='Coffees').tap(); pg.wait_for_timeout(400)
    pg.tap('.view-toggle button[data-layout=grid], button[data-layout=grid]'); pg.wait_for_timeout(300); ok('layout toggle', pg.evaluate("appSettings.coffeeLayout")=='grid')
    # card menu: ⋯ then tapping elsewhere on the tile must not also open the coffee
    pg.locator('#view-coffees .card-more').first.tap(); pg.wait_for_timeout(300)
    ok('⋯ opens the menu without opening the coffee', pg.locator('#view-coffees .card-edit-overlay.visible').count()==1 and 'attempt' not in pg.inner_text('#view-coffees').lower())
    pg.locator('#view-coffees .card-edit-overlay.visible button', has_text='Edit').tap(); pg.wait_for_timeout(500)
    ok('menu Edit opens the form filled in', pg.locator('#modal-coffee.open').count()==1 and pg.input_value('#c-name')=='Tap Coffee')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
    # right-click / long-press menu
    pg.evaluate("document.querySelectorAll('.card-edit-overlay').forEach(e=>e.classList.remove('visible'))")
    prevented=pg.evaluate("(()=>{const w=document.querySelector('#view-coffees .card-wrap'); const e=new MouseEvent('contextmenu',{bubbles:true,cancelable:true}); w.dispatchEvent(e); return e.defaultPrevented})()")
    ok('context menu opens the card menu and suppresses the browser menu', prevented and pg.locator('#view-coffees .card-edit-overlay.visible').count()==1)
    pg.evaluate("document.querySelectorAll('.card-edit-overlay').forEach(e=>e.classList.remove('visible'))")
    pg.locator('#view-coffees .coffee-card').first.tap(position={'x':60,'y':150}); pg.wait_for_timeout(500)
    ok('tapping a tile opens the coffee', pg.evaluate("!!detailShownId"))
    # settings switches
    pg.locator('.bottom-nav .nav-tab', has_text='Settings').tap(); pg.wait_for_timeout(450)
    before=pg.evaluate("appSettings.showCosts!==false"); pg.tap('#settings-panel .switch >> nth=0'); pg.wait_for_timeout(200)
    ok('a settings switch toggles', pg.evaluate("JSON.stringify(appSettings)")!='' and pg.locator('#settings-panel.open').count()==1)
    pg.tap('#text-size-options button[data-size=large]'); pg.wait_for_timeout(200); ok('text size buttons', pg.evaluate("appSettings.textSize")=='large')
    pg.tap('#text-size-options button[data-size=default]'); pg.tap('.settings-panel-close'); pg.wait_for_timeout(400)
    ok('close button closes Settings', pg.locator('#settings-panel.open').count()==0)
    # every handler on every screen and sheet is understood by the dispatcher
    bad=[]
    for v in ['dashboard','coffees','tracker','recipes','grinders']:
        pg.evaluate(f"showView('{v}')"); pg.wait_for_timeout(350)
        bad+=pg.evaluate("[...document.querySelectorAll('*')].flatMap(el=>[...el.attributes].filter(a=>a.name.startsWith('data-on-')).filter(a=>!parseAction(a.value)).map(a=>a.value))")
    pg.evaluate("showView('coffees'); showCoffeeDetail(state.coffees[0].id); openPlanNext && 0"); pg.wait_for_timeout(300)
    bad+=pg.evaluate("[...document.querySelectorAll('*')].flatMap(el=>[...el.attributes].filter(a=>a.name.startsWith('data-on-')).filter(a=>!parseAction(a.value)).map(a=>a.value))")
    ok('dispatcher understands every handler on every screen', not bad, bad[:5])
    ok('no ignored-handler warnings', not [c for c in cons if 'Ignored handler' in c], [c for c in cons if 'Ignored handler' in c][:3])
    ok('nothing blocked by the content policy', not [c for c in cons if 'Content Security Policy' in c], [c for c in cons if 'Content Security Policy' in c][:2])
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res))
import sys; sys.exit(0 if all(res) else 1)
