from playwright.sync_api import sync_playwright
import json
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    cfs=[{'id':f'o{i}','name':f'Old {i}','country':'Colombia','createdAt':'2025-03-01T00:00:00Z'} for i in range(5)]
    cfs+=[{'id':'n1','name':'New 1','country':'Ethiopia','createdAt':'2026-09-01T00:00:00Z'},{'id':'n2','name':'New 2','country':'Ethiopia','createdAt':'2026-09-02T00:00:00Z'},{'id':'n3','name':'New 3','country':'Kenya','createdAt':'2026-09-03T00:00:00Z'},
          {'id':'f1','name':'Finished One','roaster':'Dak','finishedBag':True,'createdAt':'2026-09-03T00:00:00Z'}]
    pg.evaluate(f"localStorage.setItem('dialin_v2', JSON.stringify({json.dumps({'coffees':cfs,'recipes':[]})}))")
    pg.reload(); pg.wait_for_timeout(600)
    # 3. colours stable across periods
    pg.evaluate("showView('tracker')"); pg.wait_for_timeout(300)
    def colors(): return pg.evaluate("Object.fromEntries([...document.querySelectorAll('#stats-dashboard [title]')].filter(e=>/^(Colombia|Ethiopia|Kenya):/.test(e.title)).map(e=>[e.title.split(':')[0], getComputedStyle(e).backgroundColor]))")
    pg.evaluate("setStatsPeriod('all')"); pg.wait_for_timeout(200); allc=colors()
    pg.evaluate("setStatsPeriod('year')"); pg.wait_for_timeout(200); yc=colors()
    print('all', allc); print('year', yc)
    assert yc['Ethiopia']==allc['Ethiopia'] and yc['Kenya']==allc['Kenya']
    # 2. Add Coffee button present on first open of library
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300)
    n=pg.locator("#view-coffees >> text=+ Add Coffee").count(); print('add btn', n); assert n==1
    pg.click("#view-coffees >> text=+ Add Coffee"); pg.wait_for_timeout(400); assert pg.locator('#modal-coffee.open').count()==1
    pg.evaluate("closeModal('modal-coffee')"); pg.wait_for_timeout(300)
    # 1. FINISHED badge contrast in dark
    pg.evaluate("toggleDarkMode()"); pg.wait_for_timeout(300)
    pg.locator('.finished-badge').scroll_into_view_if_needed()
    print('badge', pg.eval_on_selector('.finished-badge','e=>[getComputedStyle(e).color,getComputedStyle(e).backgroundColor]'))
    card=pg.locator('.finished-badge').locator('xpath=ancestor::div[contains(@class,"card-wrap")]').bounding_box()
    pg.screenshot(path='shots/q_dark.png', clip={'x':0,'y':card['y']-10,'width':412,'height':card['height']+20})
    pg.evaluate("toggleDarkMode()"); pg.wait_for_timeout(300); card=pg.locator('.finished-badge').locator('xpath=ancestor::div[contains(@class,"card-wrap")]').bounding_box()
    pg.screenshot(path='shots/q_light.png', clip={'x':0,'y':card['y']-10,'width':412,'height':card['height']+20})
    pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(200); pg.screenshot(path='shots/q_head.png', clip={'x':0,'y':90,'width':412,'height':200})
    b.close()
print(errs); assert not errs; print('PASS')
