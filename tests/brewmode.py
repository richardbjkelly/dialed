# Full-screen brew mode: opens on Start, shows clock + current step + timeline, Cancel asks first.
from playwright.sync_api import sync_playwright
import json, sys
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
seed={'coffees':[{'id':'c1','name':'Supernova','roaster':'Manhattan','weight':250}],'recipes':[]}
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(600)
    pg.evaluate("state.selectedCoffeeId='c1'; state.selectedMethod='AeroPress'; openRecipeModal()"); pg.wait_for_timeout(500)
    # pick a recipe with timed steps
    rid=pg.evaluate("(()=>{const r=getAllRecipesForMethod('AeroPress').find(x=>x.steps.filter(s=>/^~?\\s*\\d{1,2}:\\d{2}\\s*[—–-]/.test(s)).length>=3); const sel=document.getElementById('r-recipe'); if(sel){sel.value=r.id; sel.dispatchEvent(new Event('change',{bubbles:true}))} state.selectedRecipeId=r.id; return r.id})()")
    pg.wait_for_timeout(300); steps=pg.evaluate("timedSteps()"); ok('test recipe has timed steps', len(steps)>=3, steps)
    pg.fill('#r-dose','11'); pg.fill('#r-yield','200'); pg.fill('#r-grind','12'); pg.fill('#r-notes','keep me')
    ok('brew mode hidden before starting', pg.is_hidden('#brew-mode'))
    pg.locator('#brew-timer-toggle').scroll_into_view_if_needed(); pg.tap('#brew-timer-toggle'); pg.wait_for_timeout(500)
    ok('Start Brew opens full-screen brew mode', pg.is_visible('#brew-mode') and pg.evaluate("(()=>{const r=document.getElementById('brew-mode').getBoundingClientRect(); return r.width>=innerWidth-1 && r.height>=innerHeight-1})()"))
    ok('coffee, recipe and dose/water/grind shown', pg.inner_text('#bm-coffee')=='Supernova' and len(pg.inner_text('#bm-recipe'))>3 and '11g' in pg.inner_text('#bm-meta').lower() and '200ml' in pg.inner_text('#bm-meta').lower() and 'grind 12' in pg.inner_text('#bm-meta').lower(), pg.inner_text('#bm-meta'))
    ok('clock is large', pg.evaluate("parseFloat(getComputedStyle(document.getElementById('bm-clock')).fontSize)")>=90)
    ok('all steps listed, first is current', pg.locator('#bm-steps li').count()==len(steps) and pg.locator('#bm-steps li.now').count()==1 and steps[0]['text'] in pg.inner_text('#bm-now'))
    ok('focus moved into brew mode', pg.evaluate("document.getElementById('brew-mode').contains(document.activeElement)"))
    # jump the clock to just after step 2
    pg.evaluate(f"brewTimer.startedAt = Date.now() - {(steps[1]['at']+2)*1000}"); pg.wait_for_timeout(500)
    ok('advances to step 2: big text, tick on step 1, next in bold', steps[1]['text'] in pg.inner_text('#bm-now') and pg.locator('#bm-steps li.done').count()==1 and pg.locator('#bm-steps li.next').count()==1 and 'step 2 of' in pg.inner_text('#bm-now-label').lower(), pg.inner_text('#bm-now-label'))
    w=pg.evaluate("parseFloat(document.getElementById('bm-bar').style.width)"); ok('bar shows progress to next step', 0<w<100, w)
    ok('countdown to next step', 'next at' in pg.inner_text('#bm-next-at').lower() and pg.inner_text('#bm-next-in').lower().startswith('in '))
    if len(sys.argv)>1: pg.screenshot(path='shots/bm_mid.png')
    # minimise and come back
    pg.tap('.bm-min'); pg.wait_for_timeout(300)
    ok('Minimise returns to the form with the timer still running', pg.is_hidden('#brew-mode') and pg.evaluate("!!brewTimer.startedAt") and pg.locator('#modal-recipe.open').count()==1)
    ok('Full screen button offered in the form', pg.is_visible('#brew-timer-expand'))
    pg.tap('#brew-timer-expand'); pg.wait_for_timeout(300); ok('Full screen reopens brew mode', pg.is_visible('#brew-mode'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300); ok('Escape minimises (does not stop)', pg.is_hidden('#brew-mode') and pg.evaluate("!!brewTimer.startedAt") and pg.locator('#modal-recipe.open').count()==1)
    pg.evaluate("openBrewMode()"); pg.wait_for_timeout(200); pg.go_back(); pg.wait_for_timeout(400)
    ok('phone Back minimises', pg.is_hidden('#brew-mode') and pg.evaluate("!!brewTimer.startedAt") and pg.locator('#modal-recipe.open').count()==1)
    # cancel flow
    pg.evaluate("openBrewMode()"); pg.wait_for_timeout(200); pg.tap('.bm-cancel'); pg.wait_for_timeout(400)
    ok('Cancel asks first, timer keeps running', pg.locator('#modal-confirm-delete.open').count()==1 and 'cancel this brew' in pg.inner_text('#confirm-delete-title').lower() and pg.evaluate("!!brewTimer.startedAt"))
    ok('confirm box sits above brew mode', pg.evaluate("(()=>{const b=document.getElementById('confirm-delete-btn').getBoundingClientRect(); return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2).id})()")=='confirm-delete-btn')
    ok('buttons read Keep brewing / Yes, cancel brew', pg.inner_text('#confirm-cancel-btn').lower()=='keep brewing' and pg.inner_text('#confirm-delete-btn').lower()=='yes, cancel brew')
    pg.tap('#confirm-cancel-btn'); pg.wait_for_timeout(400)
    ok('Keep brewing: still in brew mode, still running', pg.is_visible('#brew-mode') and pg.evaluate("!!brewTimer.startedAt") and pg.evaluate("brewTimerSecs()")>=steps[1]['at'])
    pg.tap('.bm-cancel'); pg.wait_for_timeout(400); pg.tap('#confirm-delete-btn'); pg.wait_for_timeout(500)
    ok('Yes, cancel brew: timer back to 0:00, brew mode closed', pg.is_hidden('#brew-mode') and pg.evaluate("brewTimerSecs()")==0 and not pg.evaluate("!!brewTimer.startedAt") and pg.inner_text('#brew-timer-display')=='0:00')
    ok('form still open with what was typed; nothing saved', pg.locator('#modal-recipe.open').count()==1 and pg.input_value('#r-dose')=='11' and pg.input_value('#r-notes')=='keep me' and pg.input_value('#r-time-secs')=='' and len(json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))['recipes'])==0)
    # other confirm boxes get their normal button back
    pg.evaluate("confirmAction({title:'T',text:'x',button:'Go',onYes(){}})"); ok('other confirm boxes still say Cancel', pg.inner_text('#confirm-cancel-btn').lower()=='cancel'); pg.evaluate("closeModal('modal-confirm-delete')"); pg.wait_for_timeout(300)
    # final step + stop
    pg.tap('#brew-timer-toggle'); pg.wait_for_timeout(300); last=steps[-1]['at']
    pg.evaluate(f"brewTimer.startedAt = Date.now() - {(last+4)*1000}"); pg.wait_for_timeout(500)
    ok('last step: full bar, overtime, Stop & save time', pg.evaluate("document.getElementById('bm-bar').style.width")=='100%' and pg.inner_text('#bm-next-in').startswith('+') and 'save time' in pg.inner_text('#bm-stop').lower() and pg.evaluate("document.getElementById('bm-stop').classList.contains('final')"))
    if len(sys.argv)>1: pg.screenshot(path='shots/bm_last.png')
    pg.tap('#bm-stop'); pg.wait_for_timeout(500)
    t=int(pg.input_value('#r-time-mins') or 0)*60+int(pg.input_value('#r-time-secs') or 0)
    ok('Stop closes brew mode and fills in the time', pg.is_hidden('#brew-mode') and not pg.evaluate("!!brewTimer.startedAt") and last+3<=t<=last+7, t)
    ok('Resume reopens brew mode', (pg.tap('#brew-timer-toggle'), pg.wait_for_timeout(300), pg.is_visible('#brew-mode'))[2]); pg.tap('#bm-stop'); pg.wait_for_timeout(300)
    pg.evaluate("saveRecipe()"); pg.wait_for_timeout(900)
    ok('brew saves; brew mode stays closed', len(json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))['recipes'])==1 and pg.is_hidden('#brew-mode'))
    # no timed recipe: clock only
    pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))"); pg.wait_for_timeout(400)
    pg.evaluate("state.selectedMethod='Espresso'; openRecipeModal(); state.selectedRecipeId=null; toggleBrewTimer()"); pg.wait_for_timeout(400)
    ok('no timed recipe: clock only, no step list', pg.is_visible('#brew-mode') and pg.is_hidden('#bm-guide') and pg.locator('#bm-steps li').count()==0 and pg.is_visible('#bm-stop'))
    pg.evaluate("brewTimer.startedAt = Date.now() - 754000"); pg.wait_for_timeout(400)
    ok('clock over ten minutes still fits the screen', pg.evaluate("(()=>{const c=document.getElementById('bm-clock'); const r=document.createRange(); r.selectNodeContents(c); return r.getBoundingClientRect().width <= innerWidth-20})()"))
    # pill returns to brew mode
    pg.evaluate("closeBrewMode(); closeModal('modal-recipe')"); pg.wait_for_timeout(1300)
    pg.tap('#timer-pill'); pg.wait_for_timeout(400); ok('timer pill returns to brew mode', pg.is_visible('#brew-mode') and pg.locator('#modal-recipe.open').count()==1)
    # xlarge text + dark
    pg.evaluate("setTextSize('xlarge'); toggleDarkMode()"); pg.wait_for_timeout(300)
    ok('fits at Extra large text size', pg.evaluate("(()=>{const m=document.getElementById('brew-mode'), s=document.getElementById('bm-stop').getBoundingClientRect(); return s.bottom<=innerHeight+1 && s.right<=innerWidth+1 && document.documentElement.scrollWidth<=innerWidth+1})()"))
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
