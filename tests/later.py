# Score later: save the brew when it's made, score it once it has cooled.
from playwright.sync_api import sync_playwright
import json, sys
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
st=lambda pg: json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))
seed={'coffees':[{'id':'c1','name':'Supernova','roaster':'Manhattan','weight':250}],'recipes':[]}
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(**p.devices['Pixel 7']); ctx.grant_permissions(['notifications'])
    pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(700)
    ok('no awaiting card to start with', pg.inner_text('#score-pending').strip()=='')
    pg.evaluate("state.selectedCoffeeId='c1'; state.selectedMethod='AeroPress'; openRecipeModal()"); pg.wait_for_timeout(500)
    ok('form offers Save & score later', pg.is_visible('#r-later-btn'))
    pg.fill('#r-grind','12'); pg.fill('#r-dose','11'); pg.fill('#r-yield','200'); pg.fill('#r-temp','92')
    pg.locator('#brew-timer-toggle').scroll_into_view_if_needed(); pg.tap('#brew-timer-toggle'); pg.wait_for_timeout(300)
    pg.evaluate("brewTimer.startedAt = Date.now() - 202000"); pg.wait_for_timeout(400); pg.tap('#bm-stop'); pg.wait_for_timeout(500)
    ok('stopping shows Brew finished with the recipe summary', pg.locator('#modal-brew-done.open').count()==1 and all(x in pg.inner_text('#bd-summary') for x in ['Grind 12','11g → 200ml','92°C','3:22']) and 'supernova' in pg.inner_text('#bd-sub').lower(), pg.inner_text('#bd-sub'))
    ok('nothing saved yet', len(st(pg)['recipes'])==0)
    if len(sys.argv)>1: pg.screenshot(path='shots/later_done.png')
    ok('10 min selected by default', pg.evaluate("document.querySelector('#bd-chips button.active').dataset.mins")=='10')
    pg.tap('#bd-chips button[data-mins="5"]'); ok('reminder time can be changed and is remembered', pg.evaluate("document.querySelector('#bd-chips button.active').dataset.mins")=='5' and pg.evaluate("appSettings.scoreRemindMins")==5)
    pg.tap('#modal-brew-done button:has-text("remind me")'); pg.wait_for_timeout(1200)
    r=st(pg)['recipes']
    ok('brew saved as awaiting score with the recipe and time', len(r)==1 and r[0].get('awaitingScore')==True and str(r[0]['dose'])=='11' and str(r[0]['time'])=='202' and not r[0].get('rating') and not r[0].get('extraction'), r)
    import datetime
    due=datetime.datetime.fromisoformat(r[0]['scoreRemindAt'].replace('Z','+00:00')); made=datetime.datetime.fromisoformat(r[0]['createdAt'].replace('Z','+00:00'))
    ok('reminder set 5 minutes ahead', 295<=(due-made).total_seconds()<=305, (due-made).total_seconds())
    ok('sheets closed; Plan next not offered yet', pg.locator('.modal-overlay.open').count()==0)
    pg.evaluate("showView('dashboard')"); pg.wait_for_timeout(300)
    card=pg.inner_text('#score-pending')
    ok('Overview shows the awaiting-score card', 'AWAITING SCORE' in card.upper() and 'Supernova' in card and 'Grind 12' in card and '3:22' in card, card)
    ok('brew card is marked Unscored', pg.locator('#recent-brews .unscored-label').count()==1)
    if len(sys.argv)>1: pg.screenshot(path='shots/later_card.png')
    rid=r[0]['id']
    # reminder while the app is in view -> in-app message, once
    pg.evaluate(f"state.recipes[0].scoreRemindAt=new Date(Date.now()+400).toISOString(); save(); scheduleScoreReminders()"); pg.wait_for_timeout(900)
    ok('reminder shows in the app when it is open', 'how was the supernova' in pg.inner_text('#toast').lower() and st(pg)['recipes'][0].get('scoreNotified')==True, pg.inner_text('#toast'))
    # reminder while hidden -> notification
    pg.evaluate("""(async()=>{ window.__shown=[]; const reg=await navigator.serviceWorker.ready; const orig=reg.showNotification.bind(reg);
      ServiceWorkerRegistration.prototype.showNotification=function(t,o){ window.__shown.push([t,o.body,o.data.id]); return Promise.resolve(); };
      Object.defineProperty(document,'visibilityState',{get:()=> 'hidden',configurable:true});
      Object.defineProperty(Notification,'permission',{get:()=>'granted',configurable:true});   // headless browsers always deny
      delete state.recipes[0].scoreNotified; state.recipes[0].scoreRemindAt=new Date(Date.now()+300).toISOString(); save(); scheduleScoreReminders(); })()""")
    pg.wait_for_timeout(1200)
    shown=pg.evaluate("window.__shown"); ok('reminder becomes a notification when the app is in the background', len(shown)==1 and 'Supernova' in shown[0][0] and shown[0][2]==rid, shown)
    pg.evaluate("delete document.visibilityState; scheduleScoreReminders()"); pg.wait_for_timeout(500)
    ok('reminder is only sent once', len(pg.evaluate("window.__shown"))==1)
    # tapping the notification -> message from the service worker opens the score sheet
    pg.evaluate(f"navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{{data:{{type:'score',id:'{rid}'}}}}))"); pg.wait_for_timeout(600)
    ok('notification tap opens the score sheet', pg.locator('#modal-recipe.open.score-only').count()==1)
    pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(400)
    # score from the card
    pg.tap('#score-pending button:has-text("Score this brew")'); pg.wait_for_timeout(600)
    ok('score sheet: tasting half only', pg.locator('#modal-recipe.open.score-only').count()==1 and pg.is_hidden('#r-setup') and pg.is_hidden('#r-dose') and pg.is_hidden('#brew-timer-toggle') and pg.is_visible('#modal-recipe .extraction-picker') and pg.is_visible('#r-rating-range') and pg.is_visible('#r-notes') and pg.is_hidden('#r-later-btn'))
    ok('titled Score brew with the recipe shown', pg.inner_text('#r-modal-title')=='Score brew' and 'supernova' in pg.inner_text('#r-modal-sub').lower() and 'grind 12' in pg.inner_text('#r-modal-sub').lower() and pg.inner_text('#r-save-btn').lower()=='save score', pg.inner_text('#r-modal-sub'))
    if len(sys.argv)>1: pg.screenshot(path='shots/later_score.png')
    pg.tap('#modal-recipe .extraction-btn.good'); pg.evaluate("const x=document.getElementById('r-rating-range'); x.value=8; x.dispatchEvent(new Event('input',{bubbles:true}))"); pg.fill('#r-notes','Juicy')
    pg.tap('#r-save-btn'); pg.wait_for_timeout(1000)
    r=st(pg)['recipes']
    ok('score saved onto the same brew; recipe untouched', len(r)==1 and r[0]['id']==rid and r[0]['extraction']=='good' and str(r[0]['rating'])=='8' and r[0]['notes']=='Juicy' and str(r[0]['dose'])=='11' and str(r[0]['time'])=='202' and str(r[0]['grind'])=='12', r)
    ok('no longer awaiting; reminder fields cleared', not any(k in r[0] for k in ['awaitingScore','scoreRemindAt','scoreNotified']))
    ok('Plan next brew offered after scoring', pg.locator('#modal-plan.open').count()==1)
    pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id)); showView('dashboard')"); pg.wait_for_timeout(500)
    ok('card and Unscored badge gone', pg.inner_text('#score-pending').strip()=='' and pg.locator('.unscored-label').count()==0)
    # next ordinary Log Brew is the full form again
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(400)
    ok('Log Brew is back to the full form', pg.locator('#modal-recipe.score-only').count()==0 and pg.is_visible('#r-setup') and pg.inner_text('#r-save-btn').lower()=='log brew' and pg.inner_text('#r-modal-title')=='Log Brew' and pg.input_value('#r-edit-id')=='')
    # Save & score later straight from the form (no timer)
    pg.fill('#r-dose','15'); pg.fill('#r-yield','250'); pg.locator('#r-later-btn').scroll_into_view_if_needed(); pg.tap('#r-later-btn'); pg.wait_for_timeout(1000)
    r=st(pg)['recipes']; ok('Save & score later from the form', len(r)==2 and r[0].get('awaitingScore')==True and str(r[0]['dose'])=='15')
    # Score now path
    pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))"); pg.wait_for_timeout(400)
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(300); pg.fill('#r-dose','12'); pg.evaluate("toggleBrewTimer()"); pg.wait_for_timeout(1200); pg.tap('#bm-stop'); pg.wait_for_timeout(400)
    pg.tap('#modal-brew-done button:has-text("Score now")'); pg.wait_for_timeout(600)
    ok('Score now returns to the form, nothing saved, extraction in view', pg.locator('#modal-brew-done.open').count()==0 and pg.locator('#modal-recipe.open').count()==1 and len(st(pg)['recipes'])==2 and pg.evaluate("(()=>{const r=document.querySelector('#modal-recipe .extraction-picker').getBoundingClientRect(); return r.top>=0 && r.bottom<=innerHeight})()"))
    pg.evaluate("resetBrewTimer(); closeModal('modal-recipe')"); pg.wait_for_timeout(400)
    # leave unscored
    pg.evaluate("showView('dashboard')"); pg.wait_for_timeout(300); pg.tap('#score-pending .score-card-x'); pg.wait_for_timeout(400)
    r=st(pg)['recipes']; ok('× leaves the brew unscored but keeps it', len(r)==2 and not r[0].get('awaitingScore') and pg.inner_text('#score-pending').strip()=='')
    # editing only the recipe of an awaiting brew keeps it awaiting
    pg.evaluate("state.recipes[0].awaitingScore=true; save(); editBrew(state.recipes[0].id)"); pg.wait_for_timeout(400); pg.fill('#r-dose','16'); pg.evaluate("saveRecipe()"); pg.wait_for_timeout(900)
    r=st(pg)['recipes']; ok('fixing the dose of an awaiting brew keeps it awaiting', str(r[0]['dose'])=='16' and r[0].get('awaitingScore')==True)
    pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))"); pg.wait_for_timeout(400)
    # link from a cold start (notification tapped with the app closed)
    pg.goto('http://localhost:8765/dialed/index.html?score='+r[0]['id']); pg.wait_for_timeout(900)
    ok('opening from a notification with the app closed lands on the score sheet', pg.locator('#modal-recipe.open.score-only').count()==1 and 'score=' not in pg.url)
    pg.goto('http://localhost:8765/dialed/index.html?score=%3Cimg%20src%3Dx%3E'); pg.wait_for_timeout(600)
    ok('a bad link is ignored', pg.locator('.modal-overlay.open').count()==0)
    # setting off
    pg.evaluate("openSettings()"); pg.wait_for_timeout(300); pg.tap('#settings-scorelater-switch'); pg.wait_for_timeout(200)
    ok('Score Later can be switched off in Settings', pg.evaluate("appSettings.scoreLaterPrompt")==False and pg.get_attribute('#settings-scorelater-switch','aria-checked')=='false')
    pg.evaluate("closeSettings(); openRecipeModal()"); pg.wait_for_timeout(400); ok('off: no Save & score later button', pg.is_hidden('#r-later-btn'))
    pg.evaluate("toggleBrewTimer()"); pg.wait_for_timeout(1100); pg.tap('#bm-stop'); pg.wait_for_timeout(400)
    ok('off: Stop goes straight back to the form', pg.locator('#modal-brew-done.open').count()==0 and pg.locator('#modal-recipe.open').count()==1)
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
