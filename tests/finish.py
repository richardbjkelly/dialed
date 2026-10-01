from playwright.sync_api import sync_playwright
import json
errs=[]; res=[]
def ok(n,c,i=''):
    res.append((n,bool(c)));  print(('ok  ' if c else 'FAIL'), n, i if not c else '')
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    seed={'coffees':[{'id':'c1','name':'Supernova','roaster':'Danelaw','weight':250,'rating':7,'createdAt':'2026-09-01T00:00:00Z'},{'id':'c2','name':'Pepe','roaster':'Ninth','createdAt':'2026-09-02T00:00:00Z'},{'id':'c3','name':'Get Ground','roaster':'NCR','weight':30,'createdAt':'2026-09-03T00:00:00Z'}],
          'recipes':[{'id':'r1','coffeeId':'c1','method':'Pourover','dose':'15','yield':'250','rating':8,'extraction':'good','createdAt':'2026-09-10T08:00:00Z'},{'id':'r2','coffeeId':'c1','method':'Pourover','dose':'15','yield':'250','rating':6,'extraction':'under','createdAt':'2026-09-09T08:00:00Z'}]}
    pg.evaluate(f"localStorage.setItem('dialin_v2', JSON.stringify({json.dumps(seed)}))"); pg.reload(); pg.wait_for_timeout(600)
    st=lambda: json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))
    cf=lambda i: next(c for c in st()['coffees'] if c['id']==i)
    # 1. Library ⋯ → Finish
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(400)
    tile=pg.locator('#coffees-list .card-wrap', has_text='Supernova'); tile.locator('.card-more').click(); pg.wait_for_timeout(250)
    ok('menu shows Finish', tile.locator('.card-edit-overlay.visible >> text=✓ Finish').count()==1)
    tile.locator('text=✓ Finish').click(); pg.wait_for_timeout(450)
    ok('finish sheet opens', pg.locator('#modal-finish.open').count()==1)
    ok('summary shows brews', '2 brews logged' in pg.inner_text('#finish-summary') and 'best brew 8/10' in pg.inner_text('#finish-summary'), pg.inner_text('#finish-summary'))
    ok('existing rating prefilled', pg.locator('#finish-rating button.on').count()==7)
    pg.screenshot(path='shots/fin_sheet.png')
    pg.click('#finish-rating button[data-v="9"]'); pg.click('#finish-again [data-v="yes"]'); pg.fill('#finish-note','Best at 94C'); 
    ok('rating label', '9/10 — Excellent' in pg.inner_text('#finish-rating-label'))
    pg.click('#modal-finish .btn-primary'); pg.wait_for_timeout(500)
    c=cf('c1'); ok('saved finished', c.get('finishedBag') and c.get('rating')==9 and c.get('buyAgain')=='yes' and c.get('finalNote')=='Best at 94C' and c.get('finishedAt'), c)
    ok('tile shows FINISHED', pg.locator('#coffees-list .card-wrap', has_text='Supernova').locator('.finished-badge').count()==1)
    ok('finished moved to bottom', pg.eval_on_selector_all('#coffees-list .coffee-card-name','es=>es.map(e=>e.childNodes[0].textContent.trim())')[-1]=='Supernova')
    # Reopen from menu is immediate, keeps ratings
    tile=pg.locator('#coffees-list .card-wrap', has_text='Supernova'); tile.locator('.card-more').click(); pg.wait_for_timeout(250)
    tile.locator('text=↺ Reopen').click(); pg.wait_for_timeout(400)
    c=cf('c1'); ok('reopen', not c.get('finishedBag') and c.get('rating')==9, c)
    # 2. Not now cancels without finishing
    tile=pg.locator('#coffees-list .card-wrap', has_text='Pepe'); tile.locator('.card-more').click(); pg.wait_for_timeout(250); tile.locator('text=✓ Finish').click(); pg.wait_for_timeout(400)
    pg.click('#modal-finish >> text=Not now'); pg.wait_for_timeout(400)
    ok('not now leaves active', not cf('c2').get('finishedBag'))
    # finish with no rating allowed
    pg.evaluate("openFinishBag('c2')"); pg.wait_for_timeout(400); ok('no-brew summary', 'No brews' in pg.inner_text('#finish-summary'))
    pg.click('#modal-finish .btn-primary'); pg.wait_for_timeout(400); ok('finish without rating', cf('c2').get('finishedBag') and not cf('c2').get('rating'))
    # 3. Log Brew tick box
    pg.evaluate("state.selectedCoffeeId='c3'; openRecipeModal()"); pg.wait_for_timeout(500)
    ok('tick unchecked on open', not pg.is_checked('#r-finish-bag'))
    pg.fill('#r-dose','15'); pg.check('#r-finish-bag'); pg.evaluate("saveRecipe()"); pg.wait_for_timeout(900)
    ok('finish sheet after save', pg.locator('#modal-finish.open').count()==1)
    ok('plan-next NOT opened', pg.locator('#modal-plan.open').count()==0)
    ok('brew was saved', any(r['coffeeId']=='c3' for r in st()['recipes']))
    pg.click('#finish-rating button[data-v="6"]'); pg.click('#finish-again [data-v="maybe"]'); pg.click('#modal-finish .btn-primary'); pg.wait_for_timeout(400)
    ok('finished via log brew', cf('c3').get('finishedBag') and cf('c3').get('rating')==6 and cf('c3').get('buyAgain')=='maybe')
    # tick resets; normal save still opens plan next
    pg.evaluate("state.selectedCoffeeId='c1'; openRecipeModal()"); pg.wait_for_timeout(500)
    ok('tick reset next time', not pg.is_checked('#r-finish-bag'))
    pg.fill('#r-dose','15'); pg.evaluate("saveRecipe()"); pg.wait_for_timeout(900)
    ok('normal save opens plan next', pg.locator('#modal-plan.open').count()==1 and pg.locator('#modal-finish.open').count()==0)
    pg.evaluate("closeModal('modal-plan')"); pg.wait_for_timeout(300)
    # 4. Coffee page button + summary
    pg.evaluate("showCoffeeDetail('c3')"); pg.wait_for_timeout(400)
    t=pg.inner_text('.finish-line'); ok('detail shows final ratings', 'Final rating 6/10' in t and 'Buy again: Maybe' in t, t)
    pg.locator('.finish-line').scroll_into_view_if_needed(); pg.screenshot(path='shots/fin_detail.png')
    pg.evaluate("showCoffeeDetail('c1')"); pg.wait_for_timeout(400)
    pg.click(".coffee-detail-actions-finish, button:has-text('Finish bag')"); pg.wait_for_timeout(400); ok('detail button opens sheet', pg.locator('#modal-finish.open').count()==1)
    pg.evaluate("closeModal('modal-finish')"); pg.wait_for_timeout(300)
    # dark mode sheet
    pg.evaluate("toggleDarkMode(); openFinishBag('c1'); setFinishRating(8); setFinishAgain('no')"); pg.wait_for_timeout(450); pg.screenshot(path='shots/fin_dark.png')
    b.close()
fails=[r for r in res if not r[1]]; print(f"{len(res)-len(fails)}/{len(res)} passed; errors {errs}"); assert not fails and not errs; print('PASS')
