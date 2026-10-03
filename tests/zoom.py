from playwright.sync_api import sync_playwright
import json
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); print('chromium', b.version); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    now="new Date().toISOString()"
    pg.evaluate(f"""localStorage.setItem('dialin_v2', JSON.stringify({{coffees:[{{id:'c1',name:'Supernova',roaster:'Danelaw',country:'Colombia',process:'Natural',roastLevel:'Light',varietal:'Castillo, Colombia, Caturra'}},{{id:'c2',name:'Pepe Jijon Finca Soledad',roaster:'Ninth',country:'Ecuador',process:'Washed'}},{{id:'c3',name:'Get Ground Tonight',roaster:'Neighbourhood'}}],
      recipes:[{{id:'r1',coffeeId:'c1',grinderId:'m07',method:'V60',grind:'22',temp:'94',dose:'15',yield:'250',extraction:'good',createdAt:{now}}}],
      plannedBrews:[{{id:'p1',coffeeId:'c1',method:'V60',grind:'22',temp:'94'}},{{id:'p2',coffeeId:'c2',method:'V60',grind:'20',temp:'95'}},{{id:'p3',coffeeId:'c3',method:'V60',grind:'21',temp:'93'}}]}}));
      localStorage.setItem('dialin_settings',JSON.stringify({{coffeeLayout:'grid'}}))""")
    pg.reload(); pg.wait_for_timeout(600)
    for size in ['small','default','large','xlarge']:
        pg.evaluate(f"setTextSize('{size}')"); pg.wait_for_timeout(200)
        z=pg.evaluate("uiZoom()")
        res=[]
        for v in ['dashboard','coffees','tracker']:
            pg.evaluate(f"showView('{v}')"); pg.wait_for_timeout(250)
            sw=pg.evaluate("document.documentElement.scrollWidth"); res.append(f"{v}:{sw}")
            if v=='coffees': pg.screenshot(path=f'shots/z_{size}_coffees.png')
            if v=='dashboard': pg.screenshot(path=f'shots/z_{size}_dash.png')
        # nav fits
        nav=pg.evaluate("(()=>{const n=document.querySelector('.bottom-nav')||document.querySelector('nav');const r=n.getBoundingClientRect();return [Math.round(r.bottom),Math.round(r.right),innerHeight,innerWidth]})()")
        # Log brew modal fits screen
        pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(450)
        m=pg.evaluate("(()=>{const r=document.querySelector('#modal-recipe .modal').getBoundingClientRect();return [Math.round(r.top),Math.round(r.bottom),innerHeight]})()")
        pg.screenshot(path=f'shots/z_{size}_modal.png'); pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(300)
        pg.evaluate("openSettings(); SETTINGS_SECTIONS.forEach(k=>setSettingsSection(k,true))"); pg.wait_for_timeout(400)
        sp=pg.evaluate("(()=>{const r=document.getElementById('settings-panel').getBoundingClientRect();return [Math.round(r.left),Math.round(r.right),Math.round(r.top),Math.round(r.bottom)]})()")
        act=pg.evaluate("document.querySelector('#text-size-options button.active').dataset.size")
        pg.locator('#text-size-options').scroll_into_view_if_needed(); pg.screenshot(path=f'shots/z_{size}_settings.png')
        pg.evaluate("closeSettings()"); pg.wait_for_timeout(350)
        print(size, z, res, 'nav', nav, 'modal', m, 'settings', sp, 'active', act)
        assert all(int(x.split(':')[1])<=412 for x in res) and m[1]<=m[2]+1 and m[0]>=0 and act==size and sp[3]<=916
    # drag at xlarge: move 3rd to top
    pg.evaluate("showView('dashboard')"); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelectorAll('#upnext-list .upnext-card')[2].scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
    h=pg.locator('#upnext-list .upnext-card').nth(2).locator('.upnext-handle'); hb=h.bounding_box(); top=pg.locator('#upnext-list .upnext-card').nth(0).bounding_box()
    pg.mouse.move(hb['x']+hb['width']/2, hb['y']+hb['height']/2); pg.mouse.down()
    steps=15; dist=hb['y']-top['y']+10
    for k in range(1,steps+1): pg.mouse.move(hb['x']+hb['width']/2, hb['y']+hb['height']/2 - k*dist/steps); pg.wait_for_timeout(16)
    cy=pg.locator('#upnext-list .upnext-card.dragging').bounding_box()['y']; print('dragged card y', round(cy), 'target top', round(top['y']))
    pg.mouse.up(); pg.wait_for_timeout(300)
    order=[x['coffeeId'] for x in json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))['plannedBrews']]; print('order', order); assert order==['c3','c1','c2']
    pg.reload(); pg.wait_for_timeout(500); print('persisted zoom', pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--ui-zoom')"))
    b.close()
print(errs); assert not errs; print('PASS')
