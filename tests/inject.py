from playwright.sync_api import sync_playwright
import json, tempfile
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
P='<img src=x onerror="window.__xss=(window.__xss||0)+1">'
Q="'\"><svg onload=window.__xss=(window.__xss||0)+1>"
def hostile(v):
    return {'coffees':[{'id':'c1','name':v,'roaster':v,'roasterCity':v,'roasterCountry':v,'producer':v,'farm':v,'country':v,'region':v,'varietal':v+', '+v,'process':v,'roastLevel':v,'notes':v,'finalNote':v,'finishedBag':False,'buyAgain':v,'masl':v,'weight':v,'price':v,'currency':v,'roastDate':v,'createdAt':'2026-09-01T00:00:00Z'},
                       {'id':'c2','name':'Done '+v,'finishedBag':True,'finalNote':v,'finishedAt':v,'rating':v}],
            'recipes':[{'id':'r1','coffeeId':'c1','method':v,'recipeId':'cr1','grind':v,'dose':v,'yield':v,'temp':v,'time':v,'notes':v,'extraction':v,'rating':9,'taste':{'sweetness':v},'createdAt':'2026-10-01T07:00:00Z'},
                       {'id':'r2','coffeeId':'c1','method':'AeroPress','recipeId':'cr1','grind':'10','dose':'11','yield':'200','temp':'90','rating':8,'extraction':'good','notes':v,'createdAt':'2026-09-30T07:00:00Z'}],
            'plannedBrews':[{'id':'p1','coffeeId':'c1','method':'AeroPress','recipeId':'cr1','note':v,'grind':v,'grindFrom':v,'temp':v,'tempFrom':v,'grindDir':v,'fromExtraction':v}],
            'customRecipes':[{'id':'cr1','custom':True,'method':'AeroPress','name':v,'author':v,'grindHint':v,'ratio':v,'dose':v,'water':v,'temp':v,'steps':['0:00 — '+v,'0:30 — '+v, v]}]}
def tour(pg):
    for js in ["showView('dashboard')","showView('coffees')","setCoffeeLayout('grid')","setCoffeeLayout('list')","showCoffeeDetail('c1')","showView('coffees'); showCoffeeDetail('c2')","showView('tracker'); setStatsPeriod('all')","showView('recipes')",
               "document.querySelectorAll('#recipe-tab-bar .type-btn').forEach(b=>b.click())",
               "state.selectedCoffeeId='c1'; state.selectedMethod='AeroPress'; state.selectedRecipeId='cr1'; openRecipeModal()","toggleBrewTimer()","stopBrewTimer(); resetBrewTimer(); closeModal('modal-recipe')",
               "openPlanNext('r2')","closeModal('modal-plan')","openFinishBag('c1')","closeModal('modal-finish')","showTrendModal('c1')","document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))",
               "openEditCoffee('c1')","closeModal('modal-coffee')","editBrew('r2')","closeModal('modal-recipe')","confirmDeleteCoffee('c1')","closeModal('modal-confirm-delete')","openSettings()","closeSettings()"]:
        try: pg.evaluate(js)
        except Exception as e: errs.append('tour: '+js+' -> '+str(e)[:120])
        pg.wait_for_timeout(250)
with sync_playwright() as p:
    b=p.chromium.launch()
    for label,v in [('img onerror',P),('quote breakout',Q)]:
        # typed/stored directly (bypasses import validation)
        pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('http://localhost:8765/dialed/index.html')
        pg.evaluate(f"localStorage.setItem('dialin_v2', JSON.stringify({json.dumps(hostile(v))}))"); pg.reload(); pg.wait_for_timeout(500)
        tour(pg)
        n=pg.evaluate("window.__xss||0"); ok(f'H1 stored data [{label}]: nothing executed', n==0, n)
        ok(f'H1 [{label}]: name shown as plain text', v in pg.evaluate("(showView('coffees'), document.querySelector('#coffees-list').innerText)"))
        ok(f'[{label}]: no injected elements', pg.evaluate("document.querySelectorAll('img[src=x], svg[onload]').length")==0)
        pg.close()
        # same payload arriving in a backup file
        pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('http://localhost:8765/dialed/index.html'); pg.wait_for_timeout(300)
        f=tempfile.NamedTemporaryFile('w',suffix='.json',delete=False); json.dump({'state':hostile(v)},f); f.close()
        pg.locator('#restore-input').set_input_files(f.name); pg.wait_for_timeout(500); pg.click('#confirm-delete-btn'); pg.wait_for_timeout(600)
        tour(pg)
        n=pg.evaluate("window.__xss||0"); ok(f'H1/H2 via backup [{label}]: nothing executed', n==0, n)
        s=json.loads(pg.evaluate("localStorage.getItem('dialin_v2')")); r=s['recipes'][0]
        ok(f'[{label}]: numeric fields blanked on import', r['dose']=='' and r['temp']=='' and r['grind']=='' and r['extraction']=='' and s['coffees'][0]['masl']=='', {k:r[k] for k in ['dose','temp','grind','extraction']})
        pg.close()
    # legitimate special characters still display properly
    pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    pg.evaluate("localStorage.setItem('dialin_v2', JSON.stringify({coffees:[{id:'c1',name:\"Tim & Tom's <Best> \\\"Lot\\\" №5\",roaster:\"O'Connor & Sons\",process:'Washed',country:\"Côte d'Ivoire\"}],recipes:[{id:'r1',coffeeId:'c1',method:'Steep & Release',dose:'15',notes:'5 < 6 & \"nice\"',createdAt:'2026-10-01T07:00:00Z'}]}))"); pg.reload(); pg.wait_for_timeout(500)
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300)
    t=pg.inner_text('#coffees-list'); ok('special characters display as typed', 'Tim & Tom\'s <Best> "Lot" №5' in t and "O'Connor & Sons" in t and "Côte d'Ivoire" in t, t[:120])
    pg.evaluate("showCoffeeDetail('c1')"); pg.wait_for_timeout(300); t=pg.inner_text('#view-coffees'); ok('notes + method display as typed', '5 < 6 & "nice"' in t and 'Steep & Release' in t, t[-200:])
    ok('method with & survives reload', json.loads(pg.evaluate("(save(), localStorage.getItem('dialin_v2'))"))['recipes'][0]['method']=='Steep & Release')
    b.close()
print(f"{sum(res)}/{len(res)} passed; errors {errs[:4]}"); assert all(res) and not errs; print('PASS')
