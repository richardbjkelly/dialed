from playwright.sync_api import sync_playwright
import json
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    now="new Date().toISOString()"
    pg.evaluate(f"""localStorage.setItem('dialin_v2', JSON.stringify({{coffees:[{{id:'c1',name:'Alpha'}},{{id:'c2',name:'Bravo'}},{{id:'c3',name:'Charlie'}}],
      recipes:[{{id:'r1',coffeeId:'c1',grinderId:'e29',method:'V60',grind:'8.4',temp:'94',dose:'15',yield:'250',extraction:'under',createdAt:{now}}},
               {{id:'r2',coffeeId:'c2',grinderId:'m07',method:'V60',grind:'22',temp:'96',dose:'15',yield:'250',extraction:'over',createdAt:{now}}},
               {{id:'r3',coffeeId:'c3',method:'AeroPress',grind:'',temp:'',dose:'11',yield:'200',createdAt:{now}}}]}}))""")
    pg.reload(); pg.wait_for_timeout(600)
    # Stepless Sculptor 078S
    pg.evaluate("openPlanNext('r1')"); pg.wait_for_timeout(400)
    g=pg.locator('#plan-grind-range'); print('sculptor range', g.get_attribute('min'), g.get_attribute('max'), g.get_attribute('step'), 'value', g.input_value())
    assert g.get_attribute('step')=='0.1' and g.input_value()=='8.3'
    pg.screenshot(path='shots/plan_sculptor.png')
    pg.evaluate("const r=document.getElementById('plan-grind-range'); r.value='7.9'; r.dispatchEvent(new Event('input',{bubbles:true}))")
    t=pg.locator('#plan-temp-range'); print('temp', t.get_attribute('min'), t.get_attribute('max'), t.get_attribute('step'), t.input_value())
    assert (t.get_attribute('min'),t.get_attribute('max'),t.get_attribute('step'))==('80','100','1')
    pg.evaluate("const r=document.getElementById('plan-temp-range'); r.value='97'; r.dispatchEvent(new Event('input',{bubbles:true}))")
    print('vals:', pg.inner_text('#plan-grind-val').replace('\n',' | '), '||', pg.inner_text('#plan-temp-val'))
    pg.evaluate("savePlan()"); pg.wait_for_timeout(300)
    # Stepped Comandante
    pg.evaluate("openPlanNext('r2')"); pg.wait_for_timeout(400)
    g=pg.locator('#plan-grind-range'); print('comandante range', g.get_attribute('min'), g.get_attribute('max'), g.get_attribute('step'), g.input_value())
    assert g.get_attribute('step')=='1' and g.input_value()=='23'
    pg.screenshot(path='shots/plan_comandante.png')
    pg.evaluate("savePlan()"); pg.wait_for_timeout(300)
    # No grind/temp logged
    pg.evaluate("openPlanNext('r3')"); pg.wait_for_timeout(400)
    assert pg.locator('#plan-grind-range').is_disabled()
    pg.evaluate("const r=document.getElementById('plan-temp-range'); r.value='85'; r.dispatchEvent(new Event('input',{bubbles:true}))")
    pg.evaluate("savePlan()"); pg.wait_for_timeout(300)
    st=json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))
    print('plans', [(x['coffeeId'],x['grind'],x['temp']) for x in st['plannedBrews']])
    assert [x['coffeeId'] for x in st['plannedBrews']]==['c1','c2','c3']
    assert st['plannedBrews'][0]['grind']=='7.9' and st['plannedBrews'][0]['temp']=='97' and st['plannedBrews'][2]['temp']=='85'
    # Drag: move Charlie (3rd) to top using the handle
    pg.evaluate("showView('dashboard')"); pg.wait_for_timeout(400)
    pg.evaluate("document.querySelectorAll('#upnext-list .upnext-card')[1].scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)   # keep the handle clear of the + button
    h=pg.locator('#upnext-list .upnext-card').nth(2).locator('.upnext-handle'); hb=h.bounding_box()
    top=pg.locator('#upnext-list .upnext-card').nth(0).bounding_box()
    pg.mouse.move(hb['x']+hb['width']/2, hb['y']+hb['height']/2); pg.mouse.down()
    for k in range(1,16): pg.mouse.move(hb['x']+hb['width']/2, hb['y']+hb['height']/2 - k*(hb['y']-top['y']+20)/15); pg.wait_for_timeout(16)
    pg.screenshot(path='shots/upnext_drag.png', full_page=True)
    pg.mouse.up(); pg.wait_for_timeout(300)
    st=json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))
    order=[x['coffeeId'] for x in st['plannedBrews']]; print('after drag', order); assert order==['c3','c1','c2']
    # keyboard
    pg.locator('#upnext-list .upnext-card').nth(0).locator('.upnext-handle').focus(); pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(200)
    order=[x['coffeeId'] for x in json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))['plannedBrews']]; print('after key', order); assert order==['c1','c3','c2']
    pg.reload(); pg.wait_for_timeout(500)
    print('dom order', pg.eval_on_selector_all('#upnext-list .upnext-title','es=>es.map(e=>e.textContent)'))
    pg.screenshot(path='shots/upnext_after.png', full_page=True)
    # Brew now still works
    pg.locator('#upnext-list .upnext-card').nth(0).locator('text=Brew now').click(); pg.wait_for_timeout(400)
    print('brew now grind', pg.input_value('#r-grind'), pg.input_value('#r-temp'))
    b.close()
print(errs); assert not errs; print('PASS')
