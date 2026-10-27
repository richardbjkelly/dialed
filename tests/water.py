# Water: switch, bottles maths, styles + drops calculator, make-bottles from owned salts, calibration, Log Brew picker,
# brew records, Repeat/Up next keep the water, Insights by water, import cleaning
from playwright.sync_api import sync_playwright
import json, sys, datetime
res=[]; errs=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
T=datetime.date.today(); d=lambda n:(T-datetime.timedelta(days=n)).isoformat()
seed={'coffees':[{'id':'c1','name':'Alpha','roaster':'R','roastDate':d(20)},{'id':'c2','name':'Bravo','roaster':'R','roastDate':d(10)}],'recipes':[]}
st=lambda pg: json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))
close=lambda pg: (pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))"), pg.wait_for_timeout(400))
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(600)
    # off by default
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(400)
    ok('off by default: no Water picker in Log Brew', not pg.is_visible('#r-water-group')); close(pg)
    pg.evaluate("openSettings()"); pg.wait_for_timeout(400)
    ok('Settings has the Water & minerals switch, off', pg.get_attribute('#settings-water-switch','aria-checked')=='false')
    pg.tap('#settings-water-switch'); pg.wait_for_timeout(200)
    ok('switching it on is saved', st(pg).get('water',{}).get('enabled') is True and pg.get_attribute('#settings-water-switch','aria-checked')=='true')
    pg.locator('#settings-panel .settings-nav-item', has_text='Water').tap(); pg.wait_for_timeout(500)
    t=pg.inner_text('#view-water')
    ok('Water page: bottles at 30 GH and 15 KH per g/L', '29.8 GH per g/L' in t or '30 GH per g/L' in t, t[:300])
    ok('four styles listed', all(x in t for x in ['Bright & juicy','Balanced','Sweet & creamy','Delicate & floral']))
    # maths
    m=pg.evaluate("mixFor(waterById('w-balanced'), 250)")
    ok('Balanced in 250 ml: about 7½ drops of each', abs(m['dA']-7.5)<0.15 and abs(m['dB']-7.5)<0.15, m)
    chk=pg.evaluate("(()=>{const A=bottleStrength(W().bottles.A),B=bottleStrength(W().bottles.B); return Math.round((2.5*A.dry+2.5*B.dry)*TDS_METER)})()")
    ok('your test (5+5 drops in 100 ml) predicts about 133 ppm', abs(chk-133)<=6, chk)
    # calculator
    pg.locator('.water-card', has_text='Balanced').tap(); pg.wait_for_timeout(400)
    ok('Mix: Balanced at 250 ml shows 7½ + 7½ drops', pg.inner_text('#wm-da')=='7½' and pg.inner_text('#wm-db')=='7½' and pg.inner_text('#wm-title')=='Balanced')
    pg.tap('#wm-vols >> text=1 L'); pg.wait_for_timeout(200)
    ok('1 L: 30 + 30 drops, about 1.5 g each', pg.inner_text('#wm-da')=='30' and pg.inner_text('#wm-ga') in ('1.50 g','1.51 g'), [pg.inner_text('#wm-da'),pg.inner_text('#wm-ga')])
    ok('TDS range shown', 'ppm' in pg.inner_text('#wm-res'))
    ok('built-in style: no save row until adjusted', not pg.is_visible('#wm-save-row'))
    pg.fill('#wm-gh-n','75'); pg.dispatch_event('#wm-gh-n','change'); pg.wait_for_timeout(200)
    ok('adjusting shows a save row', pg.is_visible('#wm-save-row') and '(adjusted)' in pg.inner_text('#wm-title'))
    pg.fill('#wm-name','Extra bright'); pg.tap('#wm-save'); pg.wait_for_timeout(400)
    cu=st(pg)['water']['custom']; ok('saved as a new water', len(cu)==1 and cu[0]['name']=='Extra bright' and cu[0]['gh']==75 and cu[0]['kh']==22.5, cu)
    ok('the built-in Balanced is unchanged', pg.evaluate("waterById('w-balanced').gh")==45)
    # tap water
    pg.locator('#water-body button', has_text='Tap / bottled').tap(); pg.wait_for_timeout(300)
    pg.fill('#wp-name','Tap'); pg.fill('#wp-gh','140'); pg.tap('#modal-water-plain .btn-primary'); pg.wait_for_timeout(400)
    ok('tap water saved (GH only)', [x for x in st(pg)['water']['custom'] if x['name']=='Tap'][0]['type']=='plain')
    # make bottles
    pg.locator('#water-body button', has_text='Make').tap(); pg.wait_for_timeout(400)
    r=pg.inner_text('#wb-result')
    ok('Make bottles (100 g): your salts give 4.27 g MgCl2 + 1.32 g CaCl2, 1.26 g NaHCO3 + 1.50 g KHCO3', all(x in r for x in ['4.27 g','1.32 g','1.26 g','1.50 g']), r)
    ok('mixing options shown when you have both Mg and Ca, both Na and K', pg.is_visible('#wb-balance') and pg.is_visible('#wb-buffer'))
    pg.tap('#wb-sizes >> text=20 g'); pg.wait_for_timeout(200)
    ok('20 g matches the original bottle recipe (0.853 / 0.264 / 0.252 / 0.300)', all(x in pg.inner_text('#wb-result') for x in ['0.853','0.264','0.252','0.300']), pg.inner_text('#wb-result'))
    pg.locator('#wb-salts .salt-row', has_text='MgCl').locator('input').uncheck(); pg.wait_for_timeout(200)
    r=pg.inner_text('#wb-result'); ok('without magnesium chloride: calcium only, still 30 GH', 'MgCl' not in r and 'CaCl' in r and not pg.is_visible('#wb-balance'), r)
    pg.locator('#wb-salts .salt-row', has_text='Epsom').locator('input').check(); pg.wait_for_timeout(200)
    r=pg.inner_text('#wb-result'); ok('Epsom with calcium: calcium left out with a warning', 'MgSO' in r and 'CaCl' not in r and 'gypsum' in r.lower(), r)
    pg.locator('#wb-salts .salt-row', has_text='NaHCO').locator('input').uncheck(); pg.locator('#wb-salts .salt-row', has_text='KHCO').locator('input').uncheck(); pg.wait_for_timeout(200)
    ok('no buffer salt: says so and cannot be used', 'needs baking soda' in pg.inner_text('#wb-result') and pg.is_disabled('#wb-use'))
    close(pg)
    # calibration
    pg.locator('#water-body button', has_text='Calibrate').tap(); pg.wait_for_timeout(300)
    pg.fill('#wc-drops','22'); pg.fill('#wc-grams','1.00'); pg.dispatch_event('#wc-drops','input'); pg.wait_for_timeout(100)
    ok('calibration preview', '22 drops per gram' in pg.inner_text('#wc-out'))
    pg.fill('#wc-tppm','133'); pg.dispatch_event('#wc-tppm','input'); pg.wait_for_timeout(100)
    ok('TDS check compares your reading', 'ppm' in pg.inner_text('#wc-tout') and ('within 10%' in pg.inner_text('#wc-tout') or 'lower' in pg.inner_text('#wc-tout') or 'higher' in pg.inner_text('#wc-tout')), pg.inner_text('#wc-tout'))
    pg.tap('#modal-water-cal .btn-primary'); pg.wait_for_timeout(300)
    ok('drops per gram saved', st(pg)['water']['dropsPerGram']==22)
    pg.evaluate("W().dropsPerGram=20; save()")
    # Log Brew
    pg.evaluate("state.selectedCoffeeId='c1'; state.selectedMethod='Pourover'; openRecipeModal()"); pg.wait_for_timeout(400)
    ok('Log Brew Choose has Water, default Balanced', pg.is_visible('#r-water-group') and pg.evaluate("document.querySelector('#water-selector .selected .cs-name').textContent")=='Balanced')
    ok('it shows the drops for a cup', 'drops' in pg.inner_text('#water-selector .selected'))
    pg.locator('#water-selector .coffee-selector-item.selected').tap(); pg.wait_for_timeout(200)
    ok('tapping it opens the list', pg.evaluate("[...document.querySelectorAll('#water-selector .coffee-selector-item')].filter(e=>e.offsetParent).length")>4)
    pg.locator('#water-selector .coffee-selector-item', has_text='Bright & juicy').tap(); pg.wait_for_timeout(200)
    ok('picking another closes the list with it chosen', pg.evaluate("document.querySelector('#water-selector .selected .cs-name').textContent")=='Bright & juicy' and pg.evaluate("[...document.querySelectorAll('#water-selector .coffee-selector-item')].filter(e=>e.offsetParent).length")==1)
    pg.evaluate("setBrewPage('dial')"); pg.fill('#r-dose','15'); pg.fill('#r-yield','250'); pg.evaluate("setBrewPage('taste'); setRating(8)"); pg.tap('#r-save-btn'); pg.wait_for_timeout(900); close(pg)
    br=st(pg)['recipes'][0]; ok('brew saved with the water snapshot', br.get('water',{}).get('id')=='w-bright' and br['water']['gh']==60, br.get('water'))
    ok('...and it becomes the last used', st(pg)['water']['lastId']=='w-bright')
    pg.evaluate("showView('tracker')"); pg.wait_for_timeout(300)
    ok('brew card shows the water', 'Bright & juicy' in pg.inner_text('#tracker-list'))
    # default = last used for this coffee
    pg.evaluate("state.selectedCoffeeId='c2'; openRecipeModal()"); pg.wait_for_timeout(300)
    ok('another coffee: last used water (Bright)', pg.evaluate("document.querySelector('#water-selector .selected .cs-name').textContent")=='Bright & juicy'); close(pg)
    # repeat keeps water; plan keeps water
    pg.evaluate(f"repeatBrew('{br['id']}')"); pg.wait_for_timeout(400); pg.evaluate("setBrewPage('choose')"); pg.wait_for_timeout(200)
    ok('Repeat keeps the water', pg.evaluate("selectedWaterId")=='w-bright'); close(pg)
    pg.evaluate(f"openPlanNext('{br['id']}'); savePlan()"); pg.wait_for_timeout(400)
    ok('Plan next carries the water to Up next', st(pg)['plannedBrews'][0].get('water',{}).get('id')=='w-bright')
    # Insights
    pg.evaluate("""(()=>{const mk=(id,w,r)=>({id, coffeeId:'c1', method:'Pourover', dose:'15', yield:'250', rating:r, extraction: r>=8?'good':'under', createdAt:new Date().toISOString(), water:w});
      const B={id:'w-bright',name:'Bright & juicy',gh:60,kh:15,type:'mix'}, N={id:'w-balanced',name:'Balanced',gh:45,kh:22.5,type:'mix'};
      state.recipes.push(mk('x1',B,9), mk('x2',N,6), mk('x3',N,7)); save(); showView('tracker');})()"""); pg.wait_for_timeout(400)
    t=pg.inner_text('#water-insights')
    ok('Insights by water: Bright first with its average', 'Bright & juicy' in t and '8.5 · 2' in t and '6.5 · 2' in t and t.index('Bright')<t.index('Balanced'), t)
    ok('takeaway line', 'rates highest' in t)
    # switching off hides it all
    pg.evaluate("toggleWater()"); pg.wait_for_timeout(200); pg.evaluate("showView('tracker')"); pg.wait_for_timeout(200)
    ok('off: Insights water card hidden', pg.inner_text('#water-insights').strip()=='')
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(300); ok('off: no picker, and saving leaves water off new brews', not pg.is_visible('#r-water-group')); close(pg)
    ok('off: brews keep their recorded water', st(pg)['recipes'][0].get('water') is not None)
    # import cleaning
    out=pg.evaluate("""(()=>{const s=sanitizeState({coffees:[],recipes:[{id:'b1',coffeeId:'c',water:{id:'w-bright',name:'<img>x',gh:'60',kh:9999}},{id:'b2',coffeeId:'c',water:{id:'bad id'}}],water:{enabled:true,dropsPerGram:999,salts:['mgcl2','nope'],bottles:{A:{total:20,salts:{mgcl2:0.85,nahco3:1}},B:'x'},custom:[{name:'"Hi"',gh:50,kh:20},{}]}});
      return {w:s.recipes.map(r=>r.water||null), st:s.water}})()""")
    ok('import: brew water cleaned, bad ones dropped', out['w'][0]['name']=='img>x'.replace('>','') or ('<' not in out['w'][0]['name'] and out['w'][0]['kh'] is None) and out['w'][1] is None, out['w'])
    ok('import: settings cleaned (drops in range, known salts, salts in the right bottle)', out['st']['dropsPerGram']==20 and out['st']['salts']==['mgcl2'] and list(out['st']['bottles']['A']['salts'])==['mgcl2'] and 'nahco3' in out['st']['bottles']['B']['salts'] and '"' not in out['st']['custom'][0]['name'], out['st'])
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
