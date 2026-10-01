from playwright.sync_api import sync_playwright
import json, sys
RM = len(sys.argv) > 1 and sys.argv[1] == 'reduce'
errs=[]; results=[]
def ok(name, cond, info=''):
    results.append((name, bool(cond), info)); 
    if not cond: print('FAIL', name, info)
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(**p.devices['Pixel 7'], reduced_motion='reduce' if RM else 'no-preference')
    pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console', lambda m: m.type=='error' and 'Failed to load resource' not in m.text and errs.append(m.text))
    pg.goto('http://localhost:8765/dialed/index.html')
    now="new Date().toISOString()"
    pg.evaluate(f"""localStorage.setItem('dialin_v2', JSON.stringify({{coffees:[{{id:'c1',name:'Supernova',roaster:'Danelaw',country:'Colombia',process:'Natural',roastDate:'2026-09-01',createdAt:'2026-09-01T00:00:00Z'}},{{id:'c2',name:'Pepe',roaster:'Ninth',country:'Ecuador',process:'Washed',createdAt:'2026-09-02T00:00:00Z'}}],
      recipes:[{{id:'r1',coffeeId:'c1',method:'V60',grind:'22',temp:'94',dose:'15',yield:'250',rating:6,extraction:'under',time:170,createdAt:'2026-09-05T08:00:00Z'}},{{id:'r2',coffeeId:'c1',method:'V60',grind:'21',temp:'95',dose:'15',yield:'250',rating:8,extraction:'good',time:180,createdAt:'2026-09-10T08:00:00Z'}},{{id:'r3',coffeeId:'c1',method:'V60',grind:'20',temp:'95',dose:'15',yield:'250',rating:7,extraction:'over',time:200,createdAt:'2026-09-15T08:00:00Z'}}],
      plannedBrews:[{{id:'p1',coffeeId:'c1',method:'V60',grind:'22'}},{{id:'p2',coffeeId:'c2',method:'V60',grind:'20'}}]}}))""")
    pg.reload(); pg.wait_for_timeout(700)
    rot = lambda: pg.eval_on_selector('.fab','e=>getComputedStyle(e).transform')
    # ---- A. FAB rotation, every close route ----
    routes = {
      'cancel':   "document.querySelector('#modal-fab .btn-secondary').click()",
      'backdrop': "document.getElementById('modal-fab').dispatchEvent(new MouseEvent('click',{bubbles:true}))",
      'back':     "history.back()",
      'newcoffee':"document.querySelector('#modal-fab .btn-primary').click()",
      'logbrew':  "document.querySelectorAll('#modal-fab .btn-primary')[1].click()",
    }
    for name, js in routes.items():
        pg.evaluate("history.pushState({view:'dashboard'},'','')")
        pg.click('.fab'); pg.wait_for_timeout(350)
        ok(f'fab open class ({name})', pg.eval_on_selector('.fab',"e=>e.classList.contains('fab-open')"))
        t=rot(); ok(f'fab rotated ({name})', t!='none' and t.startswith('matrix'), t)
        pg.evaluate(js); pg.wait_for_timeout(400)
        ok(f'fab closed class ({name})', not pg.eval_on_selector('.fab',"e=>e.classList.contains('fab-open')"))
        ok(f'fab back to 0deg ({name})', rot() in ('none','matrix(1, 0, 0, 1, 0, 0)'), rot())
        for mid in ['modal-coffee','modal-recipe']: pg.evaluate(f"closeModal('{mid}')")
        pg.wait_for_timeout(300)
    # rapid toggling
    for i in range(8): pg.evaluate("openFab()"); pg.evaluate("closeModal('modal-fab')")
    pg.wait_for_timeout(400); ok('fab rapid toggle settles closed', not pg.eval_on_selector('.fab',"e=>e.classList.contains('fab-open')") and rot() in ('none','matrix(1, 0, 0, 1, 0, 0)'), rot())
    ok('fab transition duration', True, pg.eval_on_selector('.fab','e=>getComputedStyle(e).transitionDuration'))
    # ---- B. Press feedback ----
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(400)
    btn = pg.locator('#view-coffees .btn-secondary').first; bb=btn.bounding_box()
    pg.mouse.move(bb['x']+bb['width']/2, bb['y']+bb['height']/2); pg.mouse.down(); pg.wait_for_timeout(200)
    t=btn.evaluate('e=>getComputedStyle(e).transform'); ok('button scales on press', (t=='none') if RM else ('0.95' in t), t)
    pg.mouse.up(); pg.wait_for_timeout(250); pg.evaluate("closeModal('modal-coffee')"); pg.wait_for_timeout(300)
    ok('button returns after press', btn.evaluate('e=>getComputedStyle(e).transform') in ('none','matrix(1, 0, 0, 1, 0, 0)'))
    card = pg.locator('#coffees-list .coffee-card').first; cb=card.bounding_box()
    pg.mouse.move(cb['x']+40, cb['y']+30); pg.mouse.down(); pg.wait_for_timeout(200)
    t=card.evaluate('e=>getComputedStyle(e).transform'); ok('card scales on press', (t=='none') if RM else ('0.985' in t), t)
    pg.mouse.up(); pg.wait_for_timeout(500)
    ok('card tap still opens detail', pg.locator('.btn-delete-coffee').count()==1)
    pg.evaluate("restoreCoffeeList()"); pg.wait_for_timeout(300)
    # ⋯ menu on card still works and does not open detail
    pg.locator('#coffees-list .card-more').first.click(); pg.wait_for_timeout(250)
    ok('card menu opens', pg.locator('.card-edit-overlay.visible').count()==1)
    ok('card menu did not navigate', pg.locator('.btn-delete-coffee').count()==0)
    pg.evaluate("hideAllOverlays()")
    # nav tab press
    nav = pg.locator('.nav-tab').nth(2); nb = nav.bounding_box()
    pg.mouse.move(nb['x']+nb['width']/2, nb['y']+nb['height']/2); pg.mouse.down(); pg.wait_for_timeout(200)
    t = nav.locator('svg').evaluate('e=>getComputedStyle(e).transform'); ok('nav icon scales on press', (t=='none') if RM else ('0.88' in t), t)
    pg.mouse.up(); pg.wait_for_timeout(400)
    ok('nav tap still switches view', pg.evaluate("state.currentView")=='tracker', pg.evaluate("state.currentView"))
    # ---- C. Charts ----
    pg.evaluate("setStatsPeriod('all')"); pg.wait_for_timeout(60)
    cp_early = pg.eval_on_selector('.chart-sweep','e=>getComputedStyle(e).clipPath')
    pg.wait_for_timeout(900)
    cp_late = pg.eval_on_selector('.chart-sweep','e=>getComputedStyle(e).clipPath')
    ok('bar sweep mid-animation', (cp_early=='none' or 'inset(0px' in cp_early) if RM else ('100%' in cp_early or cp_early!=cp_late), cp_early)
    ok('bar sweep ends fully visible', cp_late in ('none',) or cp_late.startswith('inset(0px') or 'inset(0' in cp_late, cp_late)
    seg = pg.eval_on_selector_all('#stats-dashboard .chart-sweep [title]','es=>es.map(e=>Math.round(e.getBoundingClientRect().width))'); ok('bar segments have width', all(w>0 for w in seg), seg)
    pg.evaluate("document.querySelector('#stats-dashboard').scrollIntoView()"); pg.wait_for_timeout(100)
    pg.screenshot(path=f'shots/m_bars_{"rm" if RM else "on"}.png')
    # trend modal line draw
    pg.evaluate("showTrendModal('c1')"); pg.wait_for_timeout(80)
    d0 = pg.evaluate("[...document.querySelectorAll('#modal-trend .chart-draw, .chart-draw')].map(e=>getComputedStyle(e).strokeDashoffset)")
    pg.wait_for_timeout(1300)
    d1 = pg.evaluate("[...document.querySelectorAll('.chart-draw')].filter(e=>e.getBoundingClientRect().width>0).map(e=>getComputedStyle(e).strokeDashoffset)")
    ok('line chart present', len(d1)>0, d1)
    ok('line draws in (starts hidden)', RM or any(v not in ('0','0px') for v in d0), d0)
    ok('line fully drawn after', all(v in ('0','0px') for v in d1), d1)
    op = pg.evaluate("[...document.querySelectorAll('.chart-fade')].filter(e=>e.getBoundingClientRect().width>0).map(e=>getComputedStyle(e).opacity)")
    ok('markers faded in', all(o=='1' for o in op), op)
    pg.screenshot(path=f'shots/m_trend_{"rm" if RM else "on"}.png')
    pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))"); pg.wait_for_timeout(300)
    # ---- D. Timer step pulse ----
    pg.evaluate("state.selectedCoffeeId='c1'; state.selectedMethod='Pourover'; state.selectedRecipeId='v60-hoffmann'; openRecipeModal()"); pg.wait_for_timeout(500)
    steps = pg.evaluate("timedSteps().map(s=>s.at)"); ok('recipe has timed steps', len(steps)>=2, steps)
    g = '#brew-step-guide'
    pg.evaluate("renderStepGuide()"); ok('no pulse before start', not pg.eval_on_selector(g,"e=>e.classList.contains('guide-pulse')"))
    pg.evaluate("toggleBrewTimer()"); pg.wait_for_timeout(300)
    # jump just past step 2
    pg.evaluate(f"brewTimer.startedAt = Date.now() - ({steps[1]}*1000 + 100); renderBrewTimer()"); pg.wait_for_timeout(80)
    has = pg.eval_on_selector(g,"e=>e.classList.contains('guide-pulse')")
    ok('pulse on step change', (not has) if RM else has)
    anim = pg.eval_on_selector(g,"e=>getComputedStyle(e).animationName"); ok('pulse animation name', ('none' in anim) if RM else anim=='guidePulse', anim)
    pg.screenshot(path=f'shots/m_pulse_{"rm" if RM else "on"}.png')
    pg.wait_for_timeout(900)
    ok('pulse class cleared after', not pg.eval_on_selector(g,"e=>e.classList.contains('guide-pulse')"))
    # re-renders every 250ms must not re-trigger pulse within same step
    pg.wait_for_timeout(700); ok('no repeat pulse same step', not pg.eval_on_selector(g,"e=>e.classList.contains('guide-pulse')"))
    pg.evaluate("stopBrewTimer(); resetBrewTimer()"); pg.wait_for_timeout(100)
    ok('no pulse after reset', not pg.eval_on_selector(g,"e=>e.classList.contains('guide-pulse')"))
    pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(300)
    b.close()
fails=[r for r in results if not r[1]]
print(f"{'REDUCED' if RM else 'MOTION'}: {len(results)-len(fails)}/{len(results)} checks passed")
for r in results:
    if 'transition duration' in r[0]: print('  fab transition:', r[2])
print('errors', errs)
assert not fails and not errs
print('PASS')
