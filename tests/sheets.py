# Sheets lock the page behind them; the recipe step editor; dark-mode main buttons are sage
from playwright.sync_api import sync_playwright
import json, sys, datetime
res=[]; errs=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
d=lambda n:(datetime.date.today()-datetime.timedelta(days=n)).isoformat()
seed={'coffees':[{'id':f'c{i}','name':f'Coffee {i}','roaster':'R','roastDate':d(i)} for i in range(25)],
 'recipes':[{'id':'r1','coffeeId':'c1','method':'Pourover','grind':'24','dose':'15','yield':'250','temp':'94','time':'180','extraction':'sour','rating':3,'createdAt':d(1)+'T08:00:00Z'}],
 'customRecipes':[{'id':'custom-1','name':'Mine','method':'Pourover','dose':15,'water':250,'steps':['Bloom <50g> & wait','Pour to 150g','Pour to 250g'],'custom':True}]}
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(600)
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300); pg.mouse.wheel(0,600); pg.wait_for_timeout(300)
    y0=pg.evaluate("scrollY")
    cdp=pg.context.new_cdp_session(pg)
    for name,js in [('Log Brew',"openRecipeModal()"),('Settings',"openSettings()"),('Recipe editor',"openEditCustomRecipe('custom-1')"),('Brew mode',"openRecipeModal(); setBrewPage('dial'); openBrewMode()")]:
        pg.evaluate(js); pg.wait_for_timeout(400)
        pg.mouse.move(200,120); pg.mouse.wheel(0,800); pg.wait_for_timeout(200)
        for t,yy in [('touchStart',150),('touchMove',100),('touchMove',40),('touchEnd',40)]:
            cdp.send('Input.dispatchTouchEvent',{'type':t,'touchPoints':[] if t=='touchEnd' else [{'x':200,'y':yy}]})
        pg.wait_for_timeout(300)
        ok(f'{name}: page behind does not scroll', pg.evaluate("scrollY")==y0 and pg.evaluate("document.documentElement.classList.contains('scroll-locked')"), pg.evaluate("scrollY"))
        pg.evaluate("closeBrewMode(); document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id)); closeSettings()"); pg.wait_for_timeout(400)
        ok(f'{name}: closing unlocks and keeps your place', pg.evaluate("scrollY")==y0 and not pg.evaluate("document.documentElement.classList.contains('scroll-locked')"))
    # step editor
    pg.evaluate("openEditCustomRecipe('custom-1')"); pg.wait_for_timeout(400)
    ok('step text with < > & shows as typed', pg.locator('#cr-steps-list textarea').first.input_value()=='Bloom <50g> & wait')
    x=pg.locator('#cr-steps-list .step-remove').nth(1); bb=x.bounding_box()
    ok('✕ is a full-size tap target inside the sheet', bb['width']>=44 and bb['height']>=44 and bb['x']+bb['width']<=pg.evaluate("innerWidth"), bb)
    x.tap(); pg.wait_for_timeout(200)
    ok('tapping ✕ removes that step without focusing a text box', pg.locator('#cr-steps-list .step-row').count()==2 and pg.evaluate("document.activeElement.tagName")!='TEXTAREA' and [pg.locator('#cr-steps-list textarea').nth(i).input_value() for i in range(2)]==['Bloom <50g> & wait','Pour to 250g'])
    ok('steps renumber', pg.evaluate("[...document.querySelectorAll('#cr-steps-list .step-row')].map(r=>r.querySelector('.step-row-num').textContent+'|'+r.querySelector('.step-remove').getAttribute('aria-label'))")==['1.|Remove step 1','2.|Remove step 2'])
    t=pg.locator('#cr-steps-list textarea').nth(1); t.tap(); pg.keyboard.type(' slowly'); pg.wait_for_timeout(200)
    pg.set_viewport_size({'width':412,'height':480}); pg.wait_for_timeout(400)   # keyboard up
    pg.keyboard.type('!'); pg.set_viewport_size({'width':412,'height':839}); pg.wait_for_timeout(300)
    ok('typing keeps focus while the keyboard resizes the screen', pg.evaluate("document.activeElement===document.querySelectorAll('#cr-steps-list textarea')[1]") and t.input_value()=='Pour to 250g slowly!')
    pg.click('#modal-custom-recipe button:has-text("Save Recipe")'); pg.wait_for_timeout(400)
    r=json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))['customRecipes'][0]
    ok('saved with the step removed and the edit kept', r['steps']==['Bloom <50g> & wait','Pour to 250g slowly!'], r['steps'])
    # sage in dark mode
    pg2=b.new_context(**p.devices['Pixel 7']).new_page(); pg2.on('pageerror',lambda e:errs.append(str(e)))
    pg2.goto('http://localhost:8765/dialed/index.html'); pg2.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg2.evaluate("localStorage.setItem('dialin_settings', JSON.stringify({darkMode:true}))"); pg2.reload(); pg2.wait_for_timeout(500)
    bg=lambda sel: pg2.evaluate("s=>getComputedStyle(document.querySelector(s)).backgroundColor", sel)
    pg2.evaluate("openFab()"); pg2.wait_for_timeout(300); fab=pg2.evaluate("[...document.querySelectorAll('#modal-fab .btn-primary')].map(e=>getComputedStyle(e).backgroundColor)"); pg2.evaluate("closeModal('modal-fab')"); pg2.wait_for_timeout(300)
    ok('dark: New Coffee is sage', 'rgb(169, 205, 187)' in fab, fab)
    pg2.evaluate("openEditCustomRecipe('custom-1')"); pg2.wait_for_timeout(300); ok('dark: Save Recipe is sage', pg2.evaluate("getComputedStyle([...document.querySelectorAll('#modal-custom-recipe .btn-primary')].pop()).backgroundColor")=='rgb(169, 205, 187)'); pg2.evaluate("closeModal('modal-custom-recipe')"); pg2.wait_for_timeout(300)
    pg2.evaluate("confirmAction({title:'Delete?',text:'x',button:'Delete',onYes(){}})"); pg2.wait_for_timeout(300); ok('dark: Delete stays red', bg('#confirm-delete-btn')=='rgb(139, 26, 26)', bg('#confirm-delete-btn'))
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
