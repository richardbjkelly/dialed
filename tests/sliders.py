# Log Brew layout: grind + temperature sliders, then dose/water, then timer, then time.
from playwright.sync_api import sync_playwright
import json, sys
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
seed={'coffees':[{'id':'c1','name':'Supernova','roaster':'Manhattan','weight':250}],'recipes':[]}
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(600)
    pg.evaluate("state.selectedCoffeeId='c1'; state.selectedMethod='AeroPress'; state.selectedGrinderId=null; openRecipeModal()"); pg.wait_for_timeout(500)
    y=lambda sel: pg.evaluate("s=>document.querySelector(s).getBoundingClientRect().top + document.querySelector('#modal-recipe .modal').scrollTop", sel)
    order=[y(s) for s in ['#r-grind-range','#r-temp-range','#r-dose','#brew-timer-toggle','#r-time-mins']]
    ok('order: grind, temp, dose/water, Start Brew, time', order==sorted(order) and len(set(order))==5, order)
    ok('dose and water side by side', abs(y('#r-dose')-y('#r-yield'))<2)
    ok('time is the last thing before Extraction', y('#r-time-mins') < y('#modal-recipe .extraction-picker') and y('#brew-timer-toggle') < y('#r-time-mins'))
    # no grinder: slider off, box still works
    ok('no grinder: slider disabled with a hint, number box usable', pg.is_disabled('#r-grind-range') and 'pick a grinder' in pg.inner_text('#r-grind-hint').lower() and pg.is_enabled('#r-grind'))
    pg.fill('#r-grind','7'); ok('grind can be typed without a grinder', pg.input_value('#r-grind')=='7'); pg.fill('#r-grind','')
    # pick a stepless grinder by tapping it in the list
    gid=pg.evaluate("GRINDERS.find(g=>g.stepless && grinderScale(g)).id"); name=pg.evaluate(f"GRINDERS.find(g=>g.id==='{gid}').model")
    pg.evaluate(f"[...document.querySelectorAll('#grinder-selector .coffee-selector-item')].find(d=>d.querySelector('.cs-name').textContent==={json.dumps(name)}).click()"); pg.wait_for_timeout(300)
    cfg=pg.evaluate("brewGrindSlider()")
    ok('stepless grinder: slider enabled in 0.1 steps', pg.is_enabled('#r-grind-range') and cfg['step']==0.1 and pg.get_attribute('#r-grind-range','step')=='0.1', cfg)
    ok('range ends shown and slider greyed until set', pg.inner_text('#r-grind-lo')==str(cfg['lo']).rstrip('0').rstrip('.') or float(pg.inner_text('#r-grind-lo'))==cfg['lo'])
    ok('unset look before a value is chosen', pg.evaluate("document.getElementById('r-grind-range').classList.contains('unset')") and pg.input_value('#r-grind')=='')
    target=round(cfg['lo']+ (cfg['hi']-cfg['lo'])*0.3,1)
    pg.evaluate(f"const r=document.getElementById('r-grind-range'); r.value={target}; r.dispatchEvent(new Event('input',{{bubbles:true}}))"); pg.wait_for_timeout(200)
    ok('sliding grind fills the box and particle size', abs(float(pg.input_value('#r-grind'))-target)<0.051 and 'µm' in pg.inner_text('#r-grind-um') and not pg.evaluate("document.getElementById('r-grind-range').classList.contains('unset')"), [pg.input_value('#r-grind'), pg.inner_text('#r-grind-um')])
    pg.fill('#r-grind', str(cfg['lo']+0.5)); pg.wait_for_timeout(200)
    ok('typing moves the slider', abs(float(pg.evaluate("document.getElementById('r-grind-range').value"))-(cfg['lo']+0.5))<0.051)
    sc=pg.evaluate(f"grinderScale(GRINDERS.find(g=>g.id==='{gid}'))")
    if sc['s1']>cfg['hi']:
        pg.fill('#r-grind', str(sc['s1'])); pg.wait_for_timeout(200)
        ok('a typed value outside the usual range widens the slider', float(pg.get_attribute('#r-grind-range','max'))>=sc['s1']-0.001 and 'grinder range' in pg.inner_text('#r-grind-hint').lower(), pg.inner_text('#r-grind-hint'))
    # stepped grinder
    sid=pg.evaluate("GRINDERS.find(g=>!g.stepless && grinderScale(g) && (grinderScale(g).step||1)===1).id"); sname=pg.evaluate(f"GRINDERS.find(g=>g.id==='{sid}').model")
    pg.evaluate(f"[...document.querySelectorAll('#grinder-selector .coffee-selector-item')].find(d=>d.querySelector('.cs-name').textContent==={json.dumps(sname)}).click()"); pg.wait_for_timeout(300)
    ok('stepped grinder: slider moves in whole clicks', pg.get_attribute('#r-grind-range','step')=='1')
    # temperature
    ok('temp slider 80–100 in 1°C steps, unset to start', pg.get_attribute('#r-temp-range','min')=='80' and pg.get_attribute('#r-temp-range','max')=='100' and pg.get_attribute('#r-temp-range','step')=='1' and pg.evaluate("document.getElementById('r-temp-range').classList.contains('unset')") and pg.input_value('#r-temp')=='')
    pg.evaluate("const r=document.getElementById('r-temp-range'); r.value=96; r.dispatchEvent(new Event('input',{bubbles:true}))"); pg.wait_for_timeout(150)
    ok('sliding temp fills the box', pg.input_value('#r-temp')=='96')
    pg.fill('#r-temp','88'); pg.wait_for_timeout(150); ok('typing temp moves the slider', pg.evaluate("document.getElementById('r-temp-range').value")=='88')
    pg.fill('#r-temp','60'); pg.wait_for_timeout(150); ok('a temp outside 80–100 can still be typed', pg.input_value('#r-temp')=='60' and pg.evaluate("document.getElementById('r-temp-range').classList.contains('unset')"))
    pg.fill('#r-temp','94')
    # real drag on the slider
    bb=pg.locator('#r-temp-range').bounding_box(); pg.locator('#r-temp-range').scroll_into_view_if_needed(); bb=pg.locator('#r-temp-range').bounding_box()
    pg.mouse.click(bb['x']+bb['width']*0.95, bb['y']+bb['height']/2); pg.wait_for_timeout(200)
    ok('tapping the slider itself works', int(pg.input_value('#r-temp'))>=98, pg.input_value('#r-temp'))
    # recipe selection / saved values keep sliders in step
    pg.fill('#r-dose','11'); pg.fill('#r-yield','200'); pg.fill('#r-grind','20'); pg.fill('#r-temp','92')
    if len(sys.argv)>1:
        pg.evaluate("document.querySelector('#modal-recipe .modal').scrollTop = document.querySelector('#r-grind-range').closest('.form-group').offsetTop - 60"); pg.wait_for_timeout(200); pg.screenshot(path='shots/sliders.png')
    pg.evaluate("saveRecipe()"); pg.wait_for_timeout(900)
    r=json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))['recipes'][0]
    ok('brew saves with slider values', str(r['grind'])=='20' and str(r['temp'])=='92' and str(r['dose'])=='11')
    pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))"); pg.wait_for_timeout(400)
    pg.evaluate(f"editBrew('{r['id']}')"); pg.wait_for_timeout(500)
    ok('editing a brew shows its values on both sliders', pg.evaluate("document.getElementById('r-grind-range').value")=='20' and pg.evaluate("document.getElementById('r-temp-range').value")=='92' and not pg.evaluate("document.getElementById('r-temp-range').classList.contains('unset')"))
    pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(400); pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(400)
    ok('sliders match the boxes on a fresh Log Brew', pg.evaluate("['grind','temp'].every(k=>(document.getElementById('r-'+k).value==='')===document.getElementById('r-'+k+'-range').classList.contains('unset'))"))
    # layout at extra-large text
    pg.evaluate("setTextSize('xlarge')"); pg.wait_for_timeout(300)
    ok('fits at Extra large text', pg.evaluate("(()=>{const m=document.querySelector('#modal-recipe .modal'); return m.scrollWidth<=m.clientWidth+1})()"))
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
