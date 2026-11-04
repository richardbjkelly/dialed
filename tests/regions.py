# Origin regions: region names accepted in place of a country; the Origin region chart; blends by region
from playwright.sync_api import sync_playwright
import json, sys, datetime
res=[]; errs=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
T=datetime.date.today(); d=lambda n:(T-datetime.timedelta(days=n)).isoformat()
cf=lambda i,n,c: {'id':i,'name':n,'roaster':'R','country':c,'roastDate':d(10),'createdAt':d(5)+'T09:00:00Z'}
seed={'coffees':[cf('a','A','Ethiopia'),cf('b','B','Kenya'),cf('c','C','Colombia'),cf('e','E','Guatemala'),cf('f','F','Indonesia'),cf('h','H','Latin America'),
  {'id':'g','name':'Two Region Blend','roaster':'Oz','createdAt':d(4)+'T09:00:00Z','blend':True,'components':[{'share':60,'country':'Latin America'},{'share':40,'country':'Africa'}]},
  {'id':'k','name':'Latin Blend','roaster':'Oz','createdAt':d(4)+'T09:00:00Z','blend':True,'components':[{'country':'Brazil'},{'country':'Colombia'}]}],'recipes':[]}
legend=lambda pg,label: pg.evaluate("l=>{const d=[...document.querySelectorAll('#stats-dashboard .divider')].find(x=>x.textContent.trim().toLowerCase()===l);if(!d)return null;return d.nextElementSibling.innerText}",label)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>{localStorage.setItem('dialin_v2', s);localStorage.setItem('dialin_settings',JSON.stringify({overviewCategories:['country','process'],statsPeriod:'all'}))}", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(700)
    ok('Origin region added once for people who had chosen their charts, above Origin country', pg.evaluate("appSettings.overviewCategories")==['originRegion','country','process'] and pg.evaluate("appSettings.originRegionAdded")==True)
    pg.evaluate("toggleOverviewCategory('originRegion', false)"); pg.reload(); pg.wait_for_timeout(500)
    ok('...and stays off once turned off', 'originRegion' not in pg.evaluate("appSettings.overviewCategories"))
    pg.evaluate("toggleOverviewCategory('originRegion', true)")
    ok('region names', pg.evaluate("[isRegionName('Latin America'), isRegionName(' east africa '), isRegionName('Colombia'), originRegionOf('Guatemala'), originRegionOf('Kenya'), originRegionOf('Indonesia'), originRegionOf('Latin America'), originRegionOf('Yemen'), originRegionOf('UK')]")==[True,True,False,'Latin America','Africa','Asia & Pacific','Latin America','Middle East','Other regions'])
    pg.evaluate("showView('tracker')"); pg.wait_for_timeout(400)
    rg=legend(pg,'origin region') or ''
    ok('Origin region chart: Latin America 4 (incl. the one-region blend and the region-only coffee), Africa 2, Asia & Pacific 1, Blend 1', all(x in rg.replace('\n',' ') for x in ['Latin America 4','Africa 2','Asia & Pacific 1']) and 'Blend' in rg, rg)
    oc=legend(pg,'origin country') or ''
    ok('Origin country never lists a region as a country', 'Latin America' not in oc and 'Region only' in oc, oc)
    pg.evaluate("openBlendBreakdown('originRegion')"); pg.wait_for_timeout(400)
    t=pg.inner_text('#blend-content')
    ok('region breakdown of blends', 'Origin region' in t and 'Latin America' in t and 'Africa' in t and 'Latin America (60%) + Africa (40%)' in t, t)
    pg.evaluate("closeModal('modal-blend')"); pg.wait_for_timeout(300)
    pg.evaluate("openBlendBreakdown('country')"); pg.wait_for_timeout(400)
    ok('country breakdown tags regions', pg.locator('#blend-content .rg-tag').count()==2)
    pg.evaluate("closeModal('modal-blend')"); pg.wait_for_timeout(300)
    # forms
    pg.evaluate("resetCoffeeModal();openModal('modal-coffee')"); pg.wait_for_timeout(500)
    opts=pg.evaluate("[...document.querySelectorAll('#dl-country option')].map(o=>o.value)")
    ok('country suggestions include regions, no duplicates', all(r in opts for r in ['Latin America','Africa','East Africa','Asia & Pacific']) and len(opts)==len({o.lower() for o in opts}), opts)
    ok('no region hint to start with', pg.is_hidden('#c-country-rg'))
    pg.fill('#c-country','Africa'); pg.wait_for_timeout(100)
    ok('single origin: typing a region shows the hint', pg.is_visible('#c-country-rg') and 'Africa is a region' in pg.inner_text('#c-country-rg'))
    pg.fill('#c-country','Kenya'); ok('...and a country hides it', pg.is_hidden('#c-country-rg'))
    pg.evaluate("closeModal('modal-coffee')"); pg.wait_for_timeout(400)
    pg.evaluate("openEditCoffee('g')"); pg.wait_for_timeout(600); pg.evaluate("toggleBlendCard(0)"); pg.wait_for_timeout(200)
    ok('blend: field says Country or region', pg.inner_text("label[for='bc-0-country']").lower()=='country or region')
    ok('blend: region hint and REGION tags', pg.is_visible('#bc-rg-0') and pg.locator('#c-blend-components .bc-s .rg-tag').count()==2)
    pg.fill('#bc-0-country','Brazil'); pg.wait_for_timeout(100)
    ok('blend: changing to a country hides the hint and the tag', pg.is_hidden('#bc-rg-0') and pg.locator('#bc-sum-0 .rg-tag').count()==0)
    pg.evaluate("closeModal('modal-coffee')"); pg.wait_for_timeout(300)
    ok('bag photo: Android may offer gallery as well as camera (no forced capture)', pg.evaluate("document.getElementById('c-label-input').hasAttribute('capture')")==False)
    ok('no errors', not errs, errs)
    b.close()
print(f'{sum(res)}/{len(res)} passed'); sys.exit(0 if all(res) else 1)
