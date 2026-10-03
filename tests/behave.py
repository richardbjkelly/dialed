from playwright.sync_api import sync_playwright
import json
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
def fresh(b, seed, settings=None):
    pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    pg.evaluate(f"localStorage.setItem('dialin_v2', JSON.stringify({json.dumps(seed)})); localStorage.setItem('dialin_settings', JSON.stringify({json.dumps(settings or {})}))")
    pg.reload(); pg.wait_for_timeout(500); return pg
st=lambda pg: json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))
B=lambda i,c='c1',**k: dict({'id':f'r{i}','coffeeId':c,'method':'AeroPress','dose':'11','createdAt':'2026-09-%02dT07:00:00Z'%(i+1)},**k)
with sync_playwright() as p:
    b=p.chromium.launch()
    # H6 delete refreshes coffee page and Insights
    pg=fresh(b,{'coffees':[{'id':'c1','name':'A'}],'recipes':[B(1),B(2)]})
    pg.evaluate("showView('coffees'); showCoffeeDetail('c1')"); pg.wait_for_timeout(400); pg.evaluate("deleteRecipe('r1')"); pg.wait_for_timeout(400)
    ok('H6 coffee page refreshed after delete', pg.locator('#view-coffees .recipe-entry').count()==1 and '1 attempt' in pg.inner_text('#view-coffees'))
    pg.evaluate("showView('tracker')"); pg.wait_for_timeout(300); pg.evaluate("deleteRecipe('r2')"); pg.wait_for_timeout(300)
    ok('H6 Insights refreshed after delete', pg.locator('#view-tracker .recipe-entry').count()==0)
    # logging a brew from a coffee page updates that page
    pg.evaluate("showView('coffees'); showCoffeeDetail('c1'); state.selectedCoffeeId='c1'; openRecipeModal()"); pg.wait_for_timeout(400); pg.fill('#r-dose','11'); pg.evaluate("saveRecipe()"); pg.wait_for_timeout(800)
    ok('coffee page shows the new brew straight away', pg.locator('#view-coffees .recipe-entry').count()==1); pg.close()
    # M1 back closes settings
    pg=fresh(b,{'coffees':[{'id':'c1','name':'A'}],'recipes':[]})
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300); pg.evaluate("openSettings(); SETTINGS_SECTIONS.forEach(k=>setSettingsSection(k,true))"); pg.wait_for_timeout(400); pg.go_back(); pg.wait_for_timeout(500)
    ok('M1 back closes Settings and stays on the page', not pg.evaluate("document.getElementById('settings-panel').classList.contains('open')") and pg.evaluate("state.currentView")=='coffees'); pg.close()
    # M3 validation
    pg=fresh(b,{'coffees':[{'id':'c1','name':'A','weight':250}],'recipes':[]})
    for field,val,label in [('#r-dose','-5','negative dose'),('#r-temp','500','temp 500'),('#r-yield','-10','negative water'),('#r-time-secs','99','99 seconds')]:
        pg.evaluate("state.selectedCoffeeId='c1'; state.selectedMethod='AeroPress'; openRecipeModal()"); pg.wait_for_timeout(350); pg.fill(field,val); pg.evaluate("saveRecipe()"); pg.wait_for_timeout(300)
        ok(f'M3 rejected: {label}', len(st(pg)['recipes'])==0 and pg.locator('#modal-recipe.open').count()==1)
        pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(300)
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(300); pg.fill('#r-dose','15'); pg.fill('#r-temp','94'); pg.fill('#r-yield','250'); pg.fill('#r-time-mins','3'); pg.fill('#r-time-secs','30')
    # M4 double tap
    pg.evaluate("saveRecipe(); saveRecipe()"); pg.wait_for_timeout(600)
    ok('M3 valid values accepted / M4 double tap saves once', len(st(pg)['recipes'])==1, len(st(pg)['recipes']))
    pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))"); pg.wait_for_timeout(900)
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(300); pg.fill('#r-dose','15'); pg.evaluate("saveRecipe()"); pg.wait_for_timeout(600)
    ok('M4 a later save still works', len(st(pg)['recipes'])==2)
    pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))")
    pg.evaluate("openEditCoffee('c1')"); pg.wait_for_timeout(300); pg.fill('#c-weight','-20'); pg.evaluate("saveCoffee()"); pg.wait_for_timeout(300)
    ok('M3 negative bag weight rejected', st(pg)['coffees'][0]['weight'] in (250,'250')); pg.close()
    # M5 normalised categories + canonical spelling + suggestions
    pg=fresh(b,{'coffees':[{'id':'1','name':'A','country':'Colombia','createdAt':'2026-09-01T00:00:00Z'},{'id':'2','name':'B','country':'colombia ','createdAt':'2026-09-01T00:00:00Z'},{'id':'3','name':'C','country':'COLOMBIA','createdAt':'2026-09-01T00:00:00Z'},{'id':'4','name':'D','country':'Colombia','createdAt':'2026-09-01T00:00:00Z'}],'recipes':[]})
    ok('M5 one category, most common spelling', pg.evaluate("topN(state.coffees,'country')")==[['Colombia',4]], pg.evaluate("topN(state.coffees,'country')"))
    pg.evaluate("resetCoffeeModal(); openModal('modal-coffee')"); pg.wait_for_timeout(300)
    ok('M5 suggestions offered', pg.evaluate("[...document.querySelectorAll('#dl-country option')].map(o=>o.value)")==['Colombia'])
    pg.fill('#c-name','New'); pg.fill('#c-country','  colombia'); pg.evaluate("saveCoffee()"); pg.wait_for_timeout(500)
    ok('M5 new entry reuses existing spelling', [c for c in st(pg)['coffees'] if c['name']=='New'][0]['country']=='Colombia'); pg.close()
    # M6 all finished
    pg=fresh(b,{'coffees':[{'id':'done','name':'Done','finishedBag':True}],'recipes':[]})
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(400)
    ok('M6 explains instead of an empty sheet', pg.locator('#modal-recipe.open').count()==0 and 'finished' in pg.inner_text('#confirm-delete-subtitle').lower() and pg.inner_text('#confirm-delete-btn').lower()=='add a coffee')
    pg.click('#confirm-delete-btn'); pg.wait_for_timeout(500); ok('M6 button opens Add Coffee', pg.locator('#modal-coffee.open').count()==1); pg.close()
    # H7 timer pill
    pg=fresh(b,{'coffees':[{'id':'c1','name':'A'}],'recipes':[]})
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(300); ok('H7 no pill before timer', pg.is_hidden('#timer-pill'))
    pg.evaluate("toggleBrewTimer()"); pg.wait_for_timeout(400); ok('H7 no pill while sheet open', pg.is_hidden('#timer-pill'))
    pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(1400)
    ok('H7 pill shows running time after closing', pg.is_visible('#timer-pill') and pg.inner_text('#timer-pill .tp-time') in ('0:01','0:02'), pg.inner_text('#timer-pill'))
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300); ok('H7 pill visible on other screens', pg.is_visible('#timer-pill'))
    pg.screenshot(path='shots/pill.png', clip={'x':0,'y':700,'width':412,'height':215})
    pg.click('#timer-pill'); pg.wait_for_timeout(400); ok('H7 tapping pill returns to Log Brew', pg.locator('#modal-recipe.open').count()==1 and pg.is_hidden('#timer-pill'))
    pg.evaluate("stopBrewTimer(); closeModal('modal-recipe')"); pg.wait_for_timeout(400); ok('H7 pill gone when timer stopped', pg.is_hidden('#timer-pill'))
    pg.evaluate("openRecipeModal(); toggleBrewTimer(); brewTimer.wakeLock={release(){window.__released=1}}; brewTimer.startedAt=Date.now()-21*60*1000; renderBrewTimer()"); pg.wait_for_timeout(200)
    ok('H7 wake lock released after 20 min', pg.evaluate("window.__released")==1 and pg.evaluate("brewTimer.wakeLock")==None and pg.evaluate("!!brewTimer.startedAt")); pg.close()
    # H5 + L10
    pg=fresh(b,{'coffees':[{'id':'c1','name':'A','createdAt':'2025-12-15T00:00:00Z'}],'recipes':[]})
    ok('H5 persistence requested', pg.evaluate("storagePersisted")!=None or pg.evaluate("!navigator.storage")); 
    pg.evaluate("openSettings(); SETTINGS_SECTIONS.forEach(k=>setSettingsSection(k,true))"); pg.wait_for_timeout(400); t=pg.inner_text('#storage-info'); ok('H5 storage status shown in Settings', 'clear' in t.lower() or 'protected' in t.lower(), t)
    pg.evaluate("closeSettings(); showView('tracker')"); pg.wait_for_timeout(300)
    ok('L10 default period is rolling 12 months', pg.inner_text('#stats-period-bar .type-btn.active').lower()=='12 months' and pg.evaluate("getPeriodCoffees().coffees.length")==1)
    pg.click("#stats-period-bar >> text=All Time"); pg.reload(); pg.wait_for_timeout(500); pg.evaluate("showView('tracker')")
    ok('L10 period remembered', pg.inner_text('#stats-period-bar .type-btn.active').lower()=='all time'); pg.close()
    b.close()
print(f"{sum(res)}/{len(res)} passed; errors {errs[:3]}"); assert all(res) and not errs; print('PASS')
