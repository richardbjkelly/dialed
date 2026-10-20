# Log Brew in two screens: Set up → (brew) → How was it?
from playwright.sync_api import sync_playwright
import json, sys, datetime
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
d=lambda n:(datetime.date.today()-datetime.timedelta(days=n)).isoformat()
seed={'coffees':[{'id':'c1','name':'Supernova','roaster':'Manhattan','roastDate':d(18)},{'id':'c2','name':'Red Brick','roaster':'Square Mile','roastDate':d(9)}],'recipes':[]}
st=lambda pg: json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))
vis=lambda pg,s: pg.is_visible(s)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(600)
    pg.tap('.fab'); pg.wait_for_timeout(300); pg.tap('#modal-fab button:has-text("Log Brew")'); pg.wait_for_timeout(500)
    ok('opens on Set up: step 1 of 2, setup fields shown, tasting hidden', 'Step 1 of 2' in pg.inner_text('#r-step-label') and vis(pg,'#r-dose') and not vis(pg,'#modal-recipe .extraction-picker') and not vis(pg,'#r-notes'))
    ok('footer: Skip timer + Start brew; no timer card yet', vis(pg,'#r-skip-btn') and pg.inner_text('#r-start-btn').lower().endswith('start brew') and not vis(pg,'#brew-timer-toggle') and not vis(pg,'#r-save-btn'))
    ok('footer stays on screen while scrolling', pg.evaluate("(()=>{const m=document.querySelector('#modal-recipe .modal'); m.scrollTop=9999; const r=document.getElementById('r-start-btn').getBoundingClientRect(); return r.bottom<=innerHeight+1 && r.top>innerHeight-140})()"))
    pg.evaluate("document.querySelector('#modal-recipe .modal').scrollTop=0")
    # compact pickers
    ok('coffee and grinder show only the current choice', pg.evaluate("[...document.querySelectorAll('#coffee-selector .coffee-selector-item')].filter(e=>e.offsetParent).length")==1 and pg.evaluate("[...document.querySelectorAll('#grinder-selector .coffee-selector-item')].filter(e=>e.offsetParent).length")==1)
    pg.locator('#coffee-selector .coffee-selector-item.selected').tap(); pg.wait_for_timeout(200)
    ok('tapping it opens the full list (oldest roast first)', pg.evaluate("[...document.querySelectorAll('#coffee-selector .coffee-selector-item')].filter(e=>e.offsetParent).length")==2)
    pg.locator('#coffee-selector .coffee-selector-item', has_text='Red Brick').tap(); pg.wait_for_timeout(200)
    ok('picking one selects it and closes the list', pg.evaluate("state.selectedCoffeeId")=='c2' and pg.evaluate("[...document.querySelectorAll('#coffee-selector .coffee-selector-item')].filter(e=>e.offsetParent).length")==1)
    ok('methods on one row', pg.evaluate("(()=>{const t=[...document.querySelectorAll('#method-tabs .method-tab')]; return new Set(t.map(x=>Math.round(x.getBoundingClientRect().top))).size})()")==1)
    pg.locator('#modal-recipe .method-tab', has_text='AeroPress').tap(); pg.fill('#r-dose','12'); pg.fill('#r-yield','200'); pg.fill('#r-temp','90')
    # brew
    pg.tap('#r-start-btn'); pg.wait_for_timeout(400); ok('Start brew opens brew mode', vis(pg,'#brew-mode'))
    pg.evaluate("brewTimer.startedAt=Date.now()-150000"); pg.wait_for_timeout(300); pg.tap('.bm-min'); pg.wait_for_timeout(300)
    ok('minimised: timer card appears, footer offers Back to the timer', vis(pg,'#brew-timer-toggle') and 'back to the timer' in pg.inner_text('#r-start-btn').lower())
    pg.tap('#r-start-btn'); pg.wait_for_timeout(300); ok('Back to the timer reopens brew mode', vis(pg,'#brew-mode'))
    pg.tap('#bm-stop'); pg.wait_for_timeout(400); pg.tap('#modal-brew-done button:has-text("Score now")'); pg.wait_for_timeout(500)
    ok('after Stop → Score now: How was it? (step 2 of 2)', 'Step 2 of 2' in pg.inner_text('#r-step-label') and vis(pg,'#modal-recipe .extraction-picker') and not vis(pg,'#r-dose') and vis(pg,'#r-save-btn') and vis(pg,'#r-later-btn'))
    s=pg.inner_text('#r-summary')
    ok('summary strip shows the brew', all(x in s for x in ['Red Brick','AeroPress','12g → 200ml','90°C','2:3']), s)
    pg.tap('#modal-recipe .extraction-btn.good'); pg.fill('#r-notes','Sweet')
    pg.tap('#r-back-setup'); pg.wait_for_timeout(200)
    ok('‹ Set up returns to step 1 with everything kept', vis(pg,'#r-dose') and pg.input_value('#r-dose')=='12' and pg.input_value('#r-notes')=='Sweet' and pg.evaluate("state.selectedExtraction")=='good')
    ok('with a time recorded, the footer says Next ›', pg.inner_text('#r-start-btn').lower().startswith('next') and not vis(pg,'#r-skip-btn'))
    pg.tap('#r-start-btn'); pg.wait_for_timeout(200); ok('Next › goes to step 2', vis(pg,'#r-notes'))
    pg.go_back(); pg.wait_for_timeout(400); ok('phone Back on step 2 returns to step 1 (sheet stays open)', vis(pg,'#r-dose') and pg.locator('#modal-recipe.open').count()==1)
    pg.tap('#r-start-btn'); pg.wait_for_timeout(200); pg.keyboard.press('Escape'); pg.wait_for_timeout(300); ok('Escape on step 2 also returns to step 1', vis(pg,'#r-dose'))
    pg.tap('#r-start-btn'); pg.wait_for_timeout(200)
    if len(sys.argv)>1: pg.screenshot(path='shots/two_taste.png')
    pg.tap('#r-save-btn'); pg.wait_for_timeout(1000)
    r=st(pg)['recipes']; ok('Save brew saves everything from both screens', len(r)==1 and str(r[0]['dose'])=='12' and str(r[0]['temp'])=='90' and r[0]['extraction']=='good' and r[0]['notes']=='Sweet' and r[0]['coffeeId']=='c2' and int(r[0]['time'])>=149, r)
    pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))"); pg.wait_for_timeout(400)
    # skip timer
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(400)
    ok('next Log Brew starts back on step 1', vis(pg,'#r-dose') and 'Step 1' in pg.inner_text('#r-step-label'))
    pg.tap('#r-skip-btn'); pg.wait_for_timeout(200); ok('Skip timer goes straight to step 2', vis(pg,'#r-notes'))
    pg.fill('#r-dose','') if vis(pg,'#r-dose') else None
    pg.evaluate("document.getElementById('r-dose').value='-5'"); pg.tap('#r-save-btn'); pg.wait_for_timeout(400)
    ok('a problem on step 1 sends you back there with the message', vis(pg,'#r-dose') and 'dose' in pg.inner_text('#toast').lower())
    pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))"); pg.wait_for_timeout(400)
    # edit
    pg.evaluate(f"editBrew('{r[0]['id']}')"); pg.wait_for_timeout(500)
    ok('editing: step 1 with Next ›, no Skip timer', vis(pg,'#r-dose') and pg.inner_text('#r-start-btn').lower().startswith('next') and not vis(pg,'#r-skip-btn'))
    pg.tap('#r-start-btn'); pg.wait_for_timeout(200); ok('Next › shows the saved tasting', pg.input_value('#r-notes')=='Sweet')
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
