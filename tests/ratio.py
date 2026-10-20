# Ratio lock, recipes scaled to your dose/water, temperature on the brewing screen.
from playwright.sync_api import sync_playwright
import json, sys
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
seed={'coffees':[{'id':'c1','name':'Supernova','roaster':'R'}],'recipes':[]}
v=lambda pg,i: pg.input_value(i)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(600)
    pg.evaluate("state.selectedCoffeeId='c1'; openRecipeModal()"); pg.wait_for_timeout(400)
    pg.locator('#modal-recipe .method-tab', has_text='Pourover').tap(); pg.wait_for_timeout(300)
    ok('lock starts off', pg.get_attribute('#r-ratio-lock','aria-pressed')=='false' and 'Lock ratio' in pg.inner_text('#r-ratio-lock'))
    pg.locator('#r-ratio-lock').scroll_into_view_if_needed(); pg.tap('#r-ratio-lock'); pg.wait_for_timeout(200)
    ok('cannot lock without dose and water', pg.get_attribute('#r-ratio-lock','aria-pressed')=='false' and 'dose and water first' in pg.inner_text('#toast'))
    pg.fill('#r-dose','15'); pg.fill('#r-yield','250'); pg.tap('#r-ratio-lock'); pg.wait_for_timeout(200)
    ok('locks the current ratio and shows it', pg.get_attribute('#r-ratio-lock','aria-pressed')=='true' and '1:16.7' in pg.inner_text('#r-ratio-lock'))
    pg.fill('#r-dose',''); pg.locator('#r-dose').type('18'); pg.wait_for_timeout(150)
    ok('changing the dose changes the water (typed key by key, no drift)', v(pg,'#r-dose')=='18' and v(pg,'#r-yield')=='300', v(pg,'#r-yield'))
    pg.fill('#r-yield','200'); pg.wait_for_timeout(150); ok('changing the water changes the dose', v(pg,'#r-dose')=='12', v(pg,'#r-dose'))
    pg.fill('#r-dose','20'); pg.wait_for_timeout(150); ok('ratio held exactly after several edits', v(pg,'#r-yield')=='333', v(pg,'#r-yield'))
    pg.tap('#r-ratio-lock'); pg.fill('#r-dose','10'); pg.wait_for_timeout(150); ok('unlocked: water left alone', v(pg,'#r-yield')=='333' and pg.get_attribute('#r-ratio-lock','aria-pressed')=='false')
    pg.tap('#r-ratio-lock')
    # recipe sets a new locked ratio and steps scale
    rid=pg.evaluate("getAllRecipesForMethod('Pourover').find(r=>r.id==='v60-hoffmann') ? 'v60-hoffmann' : null")
    pg.select_option('#r-recipe-select', rid); pg.wait_for_timeout(400)
    ok('recipe fills its own dose/water and becomes the locked ratio', v(pg,'#r-dose')=='30' and v(pg,'#r-yield')=='500' and '1:16.7' in pg.inner_text('#r-ratio-lock'))
    ok('at the recipe amounts nothing is marked as adjusted', pg.locator('#r-recipe-card .recipe-scaled').count()==0 and 'Amounts adjusted' not in pg.inner_text('#r-recipe-card'))
    pg.fill('#r-dose','15'); pg.wait_for_timeout(300)
    ok('recipe steps folded away by default', 'show the' in pg.inner_text('#r-recipe-card').lower() and pg.locator('#r-recipe-card ol[hidden]').count()==1)
    pg.locator('#r-recipe-card .rc-toggle').tap(); pg.wait_for_timeout(200)
    card=pg.inner_text('#r-recipe-card')
    ok('half the dose: water halves via the lock', v(pg,'#r-yield')=='250')
    ok('recipe steps rescale: coffee 15g, bloom 30g, pours to 150g and 250g', 'Add 15g coffee' in card and 'Pour 30g water' in card and '150g total' in card and '250g total' in card, card)
    ok('times untouched, scaled amounts highlighted, note shows recipe numbers', '0:45' in card and '1:15' in card and pg.locator('#r-recipe-card .recipe-scaled').count()>=4 and 'recipe: 30g · 500ml' in card)
    if len(sys.argv)>1: pg.locator('#r-recipe-card').scroll_into_view_if_needed(); pg.screenshot(path='shots/ratio_recipe.png')
    steps=pg.evaluate("timedSteps().map(s=>s.text)")
    ok('timer guide uses the scaled steps', any('30g water' in s for s in steps) and any('150g total' in s for s in steps), steps)
    # temp in brew mode
    pg.fill('#r-temp','94'); pg.fill('#r-grind','12'); pg.evaluate("toggleBrewTimer()"); pg.wait_for_timeout(500)
    meta=pg.inner_text('#bm-meta')
    ok('brewing screen shows dose, water, temperature and grind', all(x in meta for x in ['15G','250ML','94°C','GRIND 12']), meta)
    ok('brewing screen steps are the scaled ones', '30g water' in pg.inner_text('#bm-steps') or '30g water' in pg.inner_text('#bm-now'))
    if len(sys.argv)>1: pg.screenshot(path='shots/ratio_brew.png')
    pg.evaluate("resetBrewTimer(); closeModal('modal-recipe')"); pg.wait_for_timeout(400)
    # lock remembered
    pg.reload(); pg.wait_for_timeout(600); pg.evaluate("state.selectedCoffeeId='c1'; openRecipeModal()"); pg.wait_for_timeout(500)
    ok('lock stays on for the next brew', pg.get_attribute('#r-ratio-lock','aria-pressed')=='true')
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
