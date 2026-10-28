# Sculptor 078S slider snaps to 0.1 below 5 and 0.5 from 5; typed values (e.g. 10.2) are kept
from playwright.sync_api import sync_playwright
import json, sys
res=[]; errs=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
seed={'coffees':[{'id':'c1','name':'Alpha','roaster':'R'}],'recipes':[{'id':'r1','coffeeId':'c1','grinderId':'e29','method':'Pourover','grind':'10.2','dose':'15','yield':'250','temp':'94','extraction':'under','createdAt':'2026-10-27T08:00:00Z'},
  {'id':'r2','coffeeId':'c1','grinderId':'e30','method':'Pourover','grind':'6.3','dose':'15','yield':'250','extraction':'good','createdAt':'2026-10-26T08:00:00Z'}]}
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(500)
    pg.evaluate("state.selectedCoffeeId='c1'; state.selectedMethod='Pourover'; state.selectedGrinderId='e29'; openRecipeModal(); setBrewPage('dial')"); pg.wait_for_timeout(400)
    slide=lambda v: (pg.evaluate(f"(()=>{{const r=document.getElementById('r-grind-range'); r.value={v}; r.dispatchEvent(new Event('input',{{bubbles:true}}))}})()"), pg.wait_for_timeout(80), pg.input_value('#r-grind'))[2]
    ok('below 5: 0.1 steps (2.37 → 2.4, 4.94 → 4.9)', slide(2.37)=='2.4' and slide(4.94)=='4.9')
    ok('from 5: 0.5 steps (5.2 → 5, 10.2 → 10, 10.3 → 10.5, 17.8 → 18)', [slide(5.2),slide(10.2),slide(10.3),slide(17.8)]==['5','10','10.5','18'], [slide(5.2),slide(10.2),slide(10.3),slide(17.8)])
    ok('the slider thumb jumps to the snapped value', float(pg.eval_on_selector('#r-grind-range','e=>e.value'))==18)
    pg.fill('#r-grind','10.2'); pg.dispatch_event('#r-grind','input'); pg.wait_for_timeout(150)
    ok('typing 10.2 keeps 10.2 and moves the slider there', pg.input_value('#r-grind')=='10.2' and abs(float(pg.eval_on_selector('#r-grind-range','e=>e.value'))-10.2)<0.001)
    ok('hint explains the steps', 'steps of 0.1 to 5, then 0.5' in pg.inner_text('#r-grind-hint'), pg.inner_text('#r-grind-hint'))
    pg.evaluate("state.selectedGrinderId='e30'; syncBrewSliders()"); pg.wait_for_timeout(100)
    ok('other grinders unchanged (Sculptor 078: 6.37 → 6.4)', slide(6.37)=='6.4')
    pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(300)
    # Plan next
    pg.evaluate("openPlanNext('r1')"); pg.wait_for_timeout(400)
    pslide=lambda v: (pg.evaluate(f"(()=>{{const r=document.getElementById('plan-grind-range'); r.value={v}; r.dispatchEvent(new Event('input',{{bubbles:true}}))}})()"), pg.wait_for_timeout(80), pg.evaluate("planDraft.grind"))[2]
    ok('Plan next: starts from your typed 10.2', pg.evaluate("planDraft.grindBase")==10.2)
    ok('Plan next slider snaps the same way (9.7 → 9.5, 11.8 → 12)', pslide(9.7)==9.5 and pslide(11.8)==12, [pslide(9.7), pslide(11.8)])
    ok('Plan next hint explains the steps', 'fine-tunes in 0.1 to 5, then 0.5' in pg.inner_text('#plan-grind-val'), pg.inner_text('#plan-grind-val'))
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
