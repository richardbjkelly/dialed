# Blends: a bag made of 2–4 coffees, each with its own origin details.
from playwright.sync_api import sync_playwright
import json, sys
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
st=lambda pg: json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))
seed={'coffees':[{'id':'c1','name':'Supernova','roaster':'Manhattan','country':'Colombia','process':'Washed','varietal':'Gesha','createdAt':'2026-09-01T00:00:00Z'},
 {'id':'b0','name':'Old Blend','roaster':'Dak','blend':True,'components':[{'country':'<img src=x onerror=window.__x=1>','share':'abc','masl':'9e9'},{'country':'Kenya'},{},{},{},{}],'createdAt':'2026-09-03T00:00:00Z'}],'recipes':[]}
card=lambda i: f'#c-blend-components .blend-card >> nth={i}'
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(700)
    b0=pg.evaluate("state.coffees.find(c=>c.id==='b0')")
    ok('loaded blend is tidied: max 4 coffees, bad share/altitude blanked', len(b0['components'])==4 and b0['components'][0]['share']=='' and b0['components'][0]['masl']=='', b0['components'])
    pg.evaluate("showView('coffees'); showCoffeeDetail('b0')"); pg.wait_for_timeout(400)
    ok('hostile component text shown as text, not run', pg.evaluate("window.__x")!=1 and pg.locator('#view-coffees img[src=x]').count()==0)
    # ---- add a blend
    pg.evaluate("resetCoffeeModal(); openModal('modal-coffee')"); pg.wait_for_timeout(400)
    ok('not a blend by default: single-origin fields shown', pg.is_visible('#c-country') and pg.is_hidden('#c-blend-box') and pg.is_hidden('#c-blend-count-row'))
    pg.fill('#c-name','Red Brick'); pg.fill('#c-roaster','Square Mile'); pg.fill('#c-country','Brazil'); pg.fill('#c-region','Cerrado'); pg.select_option('#c-process','Natural'); pg.fill('#c-masl','1100')
    pg.locator('#c-blend').scroll_into_view_if_needed(); pg.locator('#c-blend').tap(); pg.wait_for_timeout(300)
    ok('ticking Blend shows the counter (2) and two cards; single-origin fields hidden', pg.is_visible('#c-blend-count-row') and pg.inner_text('#c-blend-count')=='2' and pg.locator('#c-blend-components .blend-card').count()==2 and pg.is_hidden('#c-country') and pg.is_hidden('#c-masl') and pg.is_visible('#c-roast'))
    ok('what was already typed became Coffee 1', pg.evaluate("blendDraft[0]")['country']=='Brazil' and pg.evaluate("blendDraft[0]")['process']=='Natural' and pg.evaluate("blendDraft[0].masl")=='1100' and 'Brazil · Natural' in pg.inner_text('#bc-sum-0'), pg.evaluate("blendDraft[0]"))
    ok('Coffee 2 is open for entry', pg.is_visible('#bc-1-country') and pg.is_hidden('#bc-0-country'))
    pg.fill('#bc-1-country','Ethiopia'); pg.fill('#bc-1-region','Guji'); pg.fill('#bc-1-varietal','Heirloom'); pg.fill('#bc-1-process','Washed'); pg.fill('#bc-1-masl','2000'); pg.fill('#bc-1-producer','Uraga station'); pg.fill('#bc-1-share','40')
    ok('card heading summarises as you type', pg.inner_text('#bc-sum-1')=='Ethiopia · Washed · 40%', pg.inner_text('#bc-sum-1'))
    ok('same fields as a single origin, plus share', all(pg.locator(f'#bc-1-{f}').count()==1 for f in ['share','country','region','masl','producer','farm','varietal','process']))
    # counter
    pg.tap('.blend-stepper button >> nth=1'); pg.wait_for_timeout(200); pg.tap('.blend-stepper button >> nth=1'); pg.wait_for_timeout(200)
    ok('+ goes up to 4 and stops', pg.inner_text('#c-blend-count')=='4' and pg.locator('#c-blend-components .blend-card').count()==4 and pg.is_disabled('.blend-stepper button >> nth=1') and pg.evaluate("blendDraft[1].country")=='Ethiopia')
    pg.tap('.blend-stepper button >> nth=0'); pg.tap('.blend-stepper button >> nth=0'); pg.wait_for_timeout(200)
    ok('− removes empty coffees without asking', pg.inner_text('#c-blend-count')=='2' and pg.locator('.modal-overlay.open').count()==1 and pg.is_disabled('.blend-stepper button >> nth=0'))
    pg.tap('.blend-stepper button >> nth=1'); pg.wait_for_timeout(200); pg.fill('#bc-2-country','Peru'); pg.tap('.blend-stepper button >> nth=0'); pg.wait_for_timeout(400)
    ok('− on a coffee with details asks first', pg.locator('#modal-confirm-delete.open').count()==1 and 'Remove Coffee 3' in pg.inner_text('#confirm-delete-title'))
    pg.tap('#confirm-cancel-btn'); pg.wait_for_timeout(400); ok('Keep it: still 3', pg.inner_text('#c-blend-count')=='3' and pg.evaluate("blendDraft[2].country")=='Peru')
    pg.tap('.blend-stepper button >> nth=0'); pg.wait_for_timeout(400); pg.tap('#confirm-delete-btn'); pg.wait_for_timeout(400); ok('Remove: back to 2', pg.inner_text('#c-blend-count')=='2')
    # untick asks
    pg.locator('#c-blend').tap(); pg.wait_for_timeout(400)
    ok('unticking Blend with details asks first and stays ticked', pg.locator('#modal-confirm-delete.open').count()==1 and 'Turn off Blend' in pg.inner_text('#confirm-delete-title') and pg.is_checked('#c-blend'))
    pg.tap('#confirm-cancel-btn'); pg.wait_for_timeout(400); ok('Keep blend: nothing lost', pg.is_checked('#c-blend') and pg.evaluate("blendDraft[1].country")=='Ethiopia')
    # shares validation
    pg.evaluate("saveCoffee()"); pg.wait_for_timeout(300)
    ok('a share on only some coffees is rejected', pg.locator('#modal-coffee.open').count()==1 and 'every coffee a share' in pg.inner_text('#toast'), pg.inner_text('#toast'))
    pg.tap(card(0)+' >> .blend-card-hd'); pg.wait_for_timeout(200); pg.fill('#bc-0-share','50'); pg.fill('#bc-0-varietal','Yellow Bourbon'); pg.evaluate("saveCoffee()"); pg.wait_for_timeout(300)
    ok('shares that do not total 100 are rejected', pg.locator('#modal-coffee.open').count()==1 and '90%' in pg.inner_text('#toast'), pg.inner_text('#toast'))
    if len(sys.argv)>1: pg.evaluate("document.querySelector('#modal-coffee .modal').scrollTop=document.getElementById('c-blend').closest('label').offsetTop-70"); pg.wait_for_timeout(200); pg.screenshot(path='shots/blend_form.png')
    pg.fill('#bc-0-share','60'); pg.wait_for_timeout(800); pg.evaluate("saveCoffee()"); pg.wait_for_timeout(1000)
    c=[x for x in st(pg)['coffees'] if x['name']=='Red Brick'][0]
    ok('saved as a blend with both coffees', c['blend']==True and len(c['components'])==2 and c['components'][0]=={'country':'Brazil','region':'Cerrado','producer':'','farm':'','varietal':'Yellow Bourbon','process':'Natural','masl':'1100','share':60} and c['components'][1]['country']=='Ethiopia' and c['components'][1]['share']==40 and c['components'][1]['producer']=='Uraga station', c['components'])
    ok('bag-level origin fields left empty', c['country']=='' and c['process']=='' and c['masl'] is None and c['varietal']=='')
    # ---- coffee page
    pg.evaluate(f"showView('coffees'); showCoffeeDetail('{c['id']}')"); pg.wait_for_timeout(500)
    t=pg.inner_text('#view-coffees')
    ok('page header: Blend · 2 coffees and joined origins', 'Blend · 2 coffees' in t and 'Brazil + Ethiopia' in t)
    ok('"In this blend" lists each coffee with share and details', 'IN THIS BLEND' in t.upper() and pg.locator('#view-coffees .blend-comp').count()==2 and 'Brazil · Cerrado' in t and '60%' in t and 'Yellow Bourbon · Natural · 1100 masl' in t and 'Producer: Uraga station' in t)
    ok('share bar drawn 60/40', pg.evaluate("[...document.querySelectorAll('#view-coffees .blend-bar i')].map(i=>i.style.width)")==['60%','40%'])
    if len(sys.argv)>1: pg.screenshot(path='shots/blend_page.png')
    # ---- tiles
    pg.evaluate("goBackToCoffees(); setCoffeeLayout('grid')"); pg.wait_for_timeout(500)
    ok('grid tile: Blend badge and joined summary', pg.locator('#coffees-list .tile-blend').count()==2 and 'Brazil + Ethiopia' in pg.inner_text('#coffees-list'))
    pg.evaluate("setCoffeeLayout('list')"); pg.wait_for_timeout(400); ok('list card: Blend tag', 'Blend' in pg.evaluate("[...document.querySelectorAll('#coffees-list .meta-pill')].map(e=>e.textContent)"))
    # ---- Insights
    pg.evaluate("showView('tracker')"); pg.wait_for_timeout(600)
    leg=pg.evaluate("[...document.querySelectorAll('#view-tracker .blend-legend-btn')].map(b=>b.innerText.replace(/\\s+/g,' ').trim())")
    ok('Insights: one Blend entry on origin and process charts, counting 2', len(leg)>=2 and all(l.startswith('Blend') and l.endswith('2') for l in leg), leg)
    ok('single origins still counted normally; Brazil not listed separately', 'Colombia' in pg.inner_text('#view-tracker') and 'Brazil' not in pg.inner_text('#view-tracker'))
    pg.locator('#view-tracker .blend-legend-btn').first.tap(); pg.wait_for_timeout(500)
    rows=pg.evaluate("[...document.querySelectorAll('#blend-content .blend-row .br-top')].map(r=>r.innerText.replace(/\\s+/g,' ').trim())")
    ok('tapping Blend drills down by share', pg.locator('#modal-blend.open').count()==1 and 'Brazil 30%' in rows and 'Ethiopia 20%' in rows and 'Kenya 13%' in rows and any(r.startswith('Not specified') for r in rows), rows)
    ok('drill-down lists the blends', pg.locator('#blend-content .roaster-row').count()==2 and 'Red Brick' in pg.inner_text('#blend-content'))
    if len(sys.argv)>1: pg.screenshot(path='shots/blend_drill.png')
    pg.locator('#blend-content .roaster-row', has_text='Red Brick').tap(); pg.wait_for_timeout(600)
    ok('tapping a blend opens its page', pg.locator('.modal-overlay.open').count()==0 and pg.evaluate("detailShownId")==c['id'])
    # ---- edit: values come back, unblend keeps Coffee 1
    pg.evaluate(f"openEditCoffee('{c['id']}')"); pg.wait_for_timeout(700)
    ok('editing a blend restores the cards', pg.is_checked('#c-blend') and pg.inner_text('#c-blend-count')=='2' and pg.inner_text('#bc-sum-0')=='Brazil · Natural · 60%')
    pg.locator('#c-blend').scroll_into_view_if_needed(); pg.locator('#c-blend').tap(); pg.wait_for_timeout(400); pg.tap('#confirm-delete-btn'); pg.wait_for_timeout(500)
    ok('Turn off: Coffee 1 becomes the single origin', not pg.is_checked('#c-blend') and pg.is_visible('#c-country') and pg.input_value('#c-country')=='Brazil' and pg.input_value('#c-region')=='Cerrado' and pg.input_value('#c-process')=='Natural' and pg.input_value('#c-masl')=='1100' and pg.input_value('#c-varietal')=='Yellow Bourbon')
    pg.wait_for_timeout(700); pg.evaluate("saveCoffee()"); pg.wait_for_timeout(1000)
    c2=[x for x in st(pg)['coffees'] if x['name']=='Red Brick'][0]
    ok('saved as a single origin again, components gone', c2['blend']==False and 'components' not in c2 and c2['country']=='Brazil' and str(c2['masl'])=='1100', c2)
    # single-origin coffees unaffected
    pg.evaluate("openEditCoffee('c1')"); pg.wait_for_timeout(600); ok('ordinary coffee opens without blend fields', not pg.is_checked('#c-blend') and pg.is_hidden('#c-blend-box') and pg.input_value('#c-country')=='Colombia')
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
