from playwright.sync_api import sync_playwright
import json
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
with sync_playwright() as p:
    b=p.chromium.launch()
    for dark in (True, False):
        m='dark' if dark else 'light'
        pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('http://localhost:8765/dialed/index.html')
        seed={'coffees':[{'id':'c1','name':'Supernova','roaster':'Danelaw'},{'id':'c2','name':'Pepe','roaster':'Ninth'},{'id':'c3','name':'Get Ground','roaster':'NCR'},{'id':'c4','name':'Unrated','roaster':'X'}],
          'recipes':[{'id':'r1','coffeeId':'c1','grinderId':'e29','method':'AeroPress','recipeId':'aeropress-hoffmann','grind':'10','dose':'11','yield':'200','temp':'88','time':228,'rating':7,'extraction':'over','createdAt':'2026-09-30T08:00:00Z'},
                     {'id':'r2','coffeeId':'c1','grinderId':'e29','method':'AeroPress','recipeId':'aeropress-hoffmann','grind':'11','dose':'11','yield':'200','temp':'90','time':210,'rating':9,'extraction':'good','createdAt':'2026-09-27T08:00:00Z'},
                     {'id':'r3','coffeeId':'c3','grinderId':'m07','method':'Pourover','recipeId':'v60-hoffmann','grind':'22','dose':'15','yield':'250','temp':'94','rating':8,'extraction':'good','createdAt':'2026-09-25T08:00:00Z'},
                     {'id':'r4','coffeeId':'c4','method':'Espresso','grind':'5','dose':'18','yield':'36','createdAt':'2026-09-24T08:00:00Z'}]}
        pg.evaluate(f"localStorage.setItem('dialin_v2', JSON.stringify({json.dumps(seed)})); localStorage.setItem('dialin_settings', JSON.stringify({{darkMode:{str(dark).lower()}}}))")
        pg.reload(); pg.wait_for_timeout(500)
        pg.evaluate("state.selectedCoffeeId='c1'; openRecipeModal()"); pg.wait_for_timeout(500)
        cols=pg.locator('#brew-history .bh-col')
        ok(f'{m}: two columns for c1', cols.count()==2, cols.count())
        t=pg.inner_text('#brew-history'); ok(f'{m}: recipe shown', 'AeroPress' in t and 'Hoffmann' in t, t[:160])
        ok(f'{m}: grinder shown', 'Sculptor 078S' in t)
        ok(f'{m}: best highlighted', 'best' in cols.nth(1).get_attribute('class') and '9' in cols.nth(1).inner_text())
        ok(f'{m}: suggestion hidden when history exists', pg.inner_html('#brew-suggestion').strip()=='')
        hb=pg.locator('#brew-history').bounding_box(); pg.screenshot(path=f'shots/bh_{m}.png', clip={'x':0,'y':hb['y']-60,'width':412,'height':hb['height']+80})
        if dark:
            # switch coffees via the selector
            pg.locator('#coffee-selector .coffee-selector-item', has_text='Pepe').click(); pg.wait_for_timeout(200)
            ok('no brews -> panel gone', pg.inner_html('#brew-history').strip()=='')
            ok('no brews -> suggested start back', pg.inner_html('#brew-suggestion').strip()!='')
            pg.locator('#coffee-selector .coffee-selector-item', has_text='Get Ground').click(); pg.wait_for_timeout(200)
            ok('one brew -> single Last & best column', pg.locator('#brew-history .bh-col').count()==1 and 'last & best' in pg.inner_text('#brew-history').lower())
            ok('follows coffee: shows V60 recipe', 'Pourover' in pg.inner_text('#brew-history'))
            pg.locator('#coffee-selector .coffee-selector-item', has_text='Unrated').click(); pg.wait_for_timeout(200)
            ok('unrated -> Last only', pg.locator('#brew-history .bh-col').count()==1 and 'not rated' in pg.inner_text('#brew-history').lower())
            # back to c1, start timer, type a note, use best
            pg.locator('#coffee-selector .coffee-selector-item', has_text='Supernova').click(); pg.wait_for_timeout(200)
            pg.fill('#r-notes','my note'); pg.evaluate("toggleBrewTimer(); minimiseBrewMode()"); pg.wait_for_timeout(1200)
            pg.locator('#brew-history .bh-col.best .bh-use').click(); pg.wait_for_timeout(500)
            ok('use best: grind/temp filled', pg.input_value('#r-grind')=='11' and pg.input_value('#r-temp')=='90', (pg.input_value('#r-grind'), pg.input_value('#r-temp')))
            ok('use best: recipe + method set', pg.evaluate("state.selectedMethod")=='AeroPress' and pg.input_value('#r-recipe-select')=='aeropress-hoffmann')
            ok('use best: grinder set', pg.evaluate("state.selectedGrinderId")=='e29')
            ok('use best: timer kept running', pg.evaluate("!!brewTimer.startedAt") and pg.evaluate("brewTimerSecs()")>=1)
            ok('use best: note kept', pg.input_value('#r-notes')=='my note')
            ok('panel still shown after use', pg.locator('#brew-history .bh-col').count()==2)
            pg.evaluate("stopBrewTimer(); resetBrewTimer()")
            # collapse persists
            pg.click('#brew-history .bh-strip'); pg.wait_for_timeout(150)
            ok('collapse hides columns', pg.locator('#brew-history .bh-col').count()==0 and pg.get_attribute('#brew-history .bh-strip','aria-expanded')=='false')
            pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(300); pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(400)
            ok('collapsed state remembered', pg.locator('#brew-history .bh-col').count()==0)
            pg.click('#brew-history .bh-strip'); pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(300)
            # editing hides panel
            pg.evaluate("editBrew('r1')"); pg.wait_for_timeout(500); ok('editing hides panel', pg.inner_html('#brew-history').strip()=='')
            pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(300)
            # save flow unaffected
            pg.evaluate("state.selectedCoffeeId='c1'; openRecipeModal()"); pg.wait_for_timeout(400); pg.fill('#r-dose','11'); pg.evaluate("saveRecipe()"); pg.wait_for_timeout(700)
            ok('save still works', len(json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))['recipes'])==5)
        pg.close()
    b.close()
print(f"{sum(res)}/{len(res)} passed; errors {errs}"); assert all(res) and not errs; print('PASS')
