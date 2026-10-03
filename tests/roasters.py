# Collapsible Settings, tasting-note chips, roaster website / page / near-me links.
from playwright.sync_api import sync_playwright
import json, sys
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
st=lambda pg: json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))
seed={'coffees':[
 {'id':'c1','name':'Supernova','roaster':'Manhattan','roasterCity':'Rotterdam','roasterCountry':'Netherlands','country':'Colombia','process':'Washed','notes':'Blueberry, jasmine','rating':8,'price':18,'currency':'GBP','priceGBP':18,'weight':250,'createdAt':'2026-09-01T00:00:00Z'},
 {'id':'c2','name':'Moonbeam','roaster':'manhattan ','country':'Kenya','notes':'blueberry; Blackcurrant','rating':6,'finishedBag':True,'createdAt':'2026-08-01T00:00:00Z'},
 {'id':'c3','name':'Red Brick','roaster':'Square Mile','roasterWebsite':'javascript:alert(1)','createdAt':'2026-07-01T00:00:00Z'}],
 'recipes':[{'id':'r1','coffeeId':'c1','method':'AeroPress','dose':'11','createdAt':'2026-09-02T07:00:00Z'},{'id':'r2','coffeeId':'c2','method':'AeroPress','dose':'11','createdAt':'2026-08-02T07:00:00Z'}]}
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(**p.devices['Pixel 7']); pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(700)
    ok('hostile website value dropped on load', pg.evaluate("state.coffees.find(c=>c.id==='c3').roasterWebsite")=='')
    # ---- Settings
    pg.locator('.bottom-nav .nav-tab', has_text='Settings').tap(); pg.wait_for_timeout(450)
    names=[x.strip() for x in pg.evaluate("[...document.querySelectorAll('.settings-sec-btn span:first-child')].map(e=>e.textContent)")]
    ok('six categories with the new names', names==['Library','Logging a brew','Display','Insights','Backup & storage','About'], names)
    opened=pg.evaluate("[...document.querySelectorAll('.settings-sec-btn')].filter(b=>b.getAttribute('aria-expanded')==='true').map(b=>b.id)")
    ok('Library and Logging a brew start open, the rest closed', opened==['sec-btn-library','sec-btn-logging'] and pg.is_visible('#settings-suggest-switch') and pg.is_hidden('#settings-costs-switch') and pg.is_hidden('#settings-about') and pg.is_hidden('#storage-info'), opened)
    pg.tap('#sec-btn-display'); pg.wait_for_timeout(200)
    ok('tapping a heading opens it; Show Costs now lives under Display', pg.is_visible('#settings-costs-switch') and pg.is_visible('#text-size-options') and pg.is_visible('#settings-dark-btn') and pg.get_attribute('#sec-btn-display','aria-expanded')=='true')
    pg.tap('#settings-costs-switch'); ok('switch inside a category still works', pg.evaluate("appSettings.showCosts")==False); pg.tap('#settings-costs-switch')
    pg.tap('#sec-btn-display'); pg.tap('#sec-btn-library'); pg.wait_for_timeout(200)
    ok('tapping again closes it', pg.is_hidden('#settings-costs-switch') and pg.is_hidden('#sec-library'))
    pg.tap('#sec-btn-backup'); pg.tap('#sec-btn-about'); pg.tap('#sec-btn-insights'); pg.wait_for_timeout(200)
    ok('Backup, Insights and About contents intact', pg.is_visible('#storage-info') and pg.is_visible('#settings-backupphotos-switch') and 'Version' in pg.inner_text('#settings-about') and pg.locator('#overview-category-options *').count()>0)
    if len(sys.argv)>1: pg.evaluate("SETTINGS_SECTIONS.forEach(k=>setSettingsSection(k,k==='library'||k==='logging'))"); pg.wait_for_timeout(200); pg.screenshot(path='shots/settings.png')
    pg.tap('.settings-panel-close'); pg.wait_for_timeout(400); pg.evaluate("openSettings()"); pg.wait_for_timeout(300)
    ok('reopening Settings resets to the two open categories', pg.evaluate("[...document.querySelectorAll('.settings-sec-btn')].filter(b=>b.getAttribute('aria-expanded')==='true').map(b=>b.id)")==['sec-btn-library','sec-btn-logging'])
    ok('headings are keyboard-reachable buttons', pg.evaluate("[...document.querySelectorAll('.settings-sec-btn')].every(b=>b.tagName==='BUTTON' && document.getElementById(b.getAttribute('aria-controls')))"))
    # ---- Roasters list from Settings
    pg.locator('#sec-library .settings-nav-item', has_text='Roasters').tap(); pg.wait_for_timeout(500)
    ok('Roasters opens from Settings › Library', pg.locator('#modal-roasters.open').count()==1 and pg.locator('#settings-panel.open').count()==0)
    rows=pg.evaluate("[...document.querySelectorAll('#roasters-content .roaster-row')].map(r=>r.innerText.replace(/\\s+/g,' ').trim())")
    ok('roasters grouped regardless of spelling, most coffees first', len(rows)==2 and rows[0].startswith('Manhattan') and '2 coffees' in rows[0] and 'Rotterdam, Netherlands' in rows[0] and 'Square Mile' in rows[1], rows)
    links=pg.evaluate("[...document.querySelectorAll('#roasters-content a')].map(a=>[a.textContent,a.href,a.target,a.rel])")
    ok('near-me links open the maps app in a new window', len(links)==2 and 'google.com/maps/search' in links[0][1] and 'roasters%20near%20me' in links[0][1] and 'coffee%20shop%20near%20me' in links[1][1] and all(l[2]=='_blank' and 'noopener' in l[3] for l in links), links)
    ok('app does not ask for location itself', 'never sees where you are' in pg.inner_text('#roasters-content'))
    if len(sys.argv)>1: pg.screenshot(path='shots/roasters.png')
    pg.tap('#roasters-content .roaster-row >> nth=0'); pg.wait_for_timeout(500)
    t=pg.inner_text('#roaster-content')
    ok('roaster page: name, place, stats', pg.locator('#modal-roaster.open').count()==1 and 'Manhattan' in t and 'ROTTERDAM, NETHERLANDS' in t.upper() and pg.evaluate("[...document.querySelectorAll('#roaster-content .roaster-stats b')].map(b=>b.textContent)")==['2','2','7.0','£18.00'], pg.evaluate("[...document.querySelectorAll('#roaster-content .roaster-stats b')].map(b=>b.textContent)"))
    ok('lists its coffees with rating and finished state', pg.locator('#roaster-content .roaster-row').count()==2 and 'Finished' in pg.inner_text('#roaster-content .roaster-row >> nth=1') and '8/10' in pg.inner_text('#roaster-content .roaster-row >> nth=0'))
    ok('no website yet: says how to add one; Find on map offered', 'No website saved' in t and pg.locator('#roaster-content .roaster-links a').count()==1 and 'Manhattan%20Rotterdam' in pg.get_attribute('#roaster-content .roaster-links a','href'))
    pg.tap('#roaster-content .roaster-row >> nth=0'); pg.wait_for_timeout(600)
    ok('tapping a coffee opens its page', pg.locator('.modal-overlay.open').count()==0 and pg.evaluate("detailShownId")=='c1' and pg.evaluate("state.currentView")=='coffees')
    # ---- website + notes via the coffee form
    pg.evaluate("openEditCoffee('c1')"); pg.wait_for_timeout(600)
    ok('existing notes shown as chips', pg.evaluate("[...document.querySelectorAll('#c-notes-chips .note-chip')].map(c=>c.firstChild.textContent)")==['Blueberry','jasmine'])
    ok('suggestions come from notes already used', set(pg.evaluate("[...document.querySelectorAll('#dl-notes option')].map(o=>o.value)"))=={'Blueberry','jasmine','Blackcurrant'}, pg.evaluate("[...document.querySelectorAll('#dl-notes option')].map(o=>o.value)"))
    pg.locator('#c-note-entry').scroll_into_view_if_needed(); pg.fill('#c-note-entry','Dark chocolate'); pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    ok('Enter adds a chip and clears the box', pg.locator('#c-notes-chips .note-chip').count()==3 and pg.input_value('#c-note-entry')=='')
    pg.locator('#c-note-entry').type('BLACKCURRANT, lime,'); pg.wait_for_timeout(150)
    chips=pg.evaluate("[...document.querySelectorAll('#c-notes-chips .note-chip')].map(c=>c.firstChild.textContent)")
    ok('comma adds chips; existing spelling reused', chips==['Blueberry','jasmine','Dark chocolate','Blackcurrant','lime'], chips)
    pg.fill('#c-note-entry','blueberry'); pg.keyboard.press('Enter'); ok('duplicates ignored', pg.locator('#c-notes-chips .note-chip').count()==5)
    pg.locator('#c-notes-chips .note-chip button >> nth=1').tap(); pg.wait_for_timeout(100)
    ok('× removes a chip', pg.evaluate("[...document.querySelectorAll('#c-notes-chips .note-chip')].map(c=>c.firstChild.textContent)")==['Blueberry','Dark chocolate','Blackcurrant','lime'])
    pg.fill('#c-note-entry','<img src=x onerror=alert(1)>'); pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    ok('note text is never treated as markup', pg.locator('#c-notes-chips img').count()==0); pg.locator('#c-notes-chips .note-chip button').last.tap()
    pg.fill('#c-note-entry','Peach')      # left un-entered on purpose
    if len(sys.argv)>1: pg.screenshot(path='shots/notes.png')
    pg.fill('#c-roaster-web','not a site'); pg.evaluate("saveCoffee()"); pg.wait_for_timeout(300)
    ok('bad website rejected', pg.locator('#modal-coffee.open').count()==1 and 'website' in pg.inner_text('#toast').lower())
    pg.fill('#c-roaster-web','javascript:alert(1)'); pg.evaluate("saveCoffee()"); pg.wait_for_timeout(300); ok('script link rejected', pg.locator('#modal-coffee.open').count()==1)
    pg.fill('#c-roaster-web','manhattancoffeeroasters.com'); pg.wait_for_timeout(800); pg.evaluate("saveCoffee()"); pg.wait_for_timeout(900)
    c=[x for x in st(pg)['coffees'] if x['id']=='c1'][0]
    ok('notes saved as one joined list, including the one still being typed', c['notes']=='Blueberry, Dark chocolate, Blackcurrant, lime, Peach', c['notes'])
    ok('website saved with https added', c['roasterWebsite']=='https://manhattancoffeeroasters.com/', c.get('roasterWebsite'))
    ok('coffee page shows the notes as before', '"Blueberry, Dark chocolate, Blackcurrant, lime, Peach"' in pg.inner_text('#view-coffees'))
    # ---- roaster link on the coffee page
    pg.tap('#view-coffees .roaster-link'); pg.wait_for_timeout(500)
    a=pg.evaluate("[...document.querySelectorAll('#roaster-content .roaster-links a')].map(a=>[a.textContent,a.href,a.rel])")
    ok('tapping the roaster name opens its page with the website link', pg.locator('#modal-roaster.open').count()==1 and a[0][0]=='manhattancoffeeroasters.com' and a[0][1]=='https://manhattancoffeeroasters.com/' and 'noopener' in a[0][2] and len(a)==2, a)
    if len(sys.argv)>1: pg.screenshot(path='shots/roaster.png')
    pg.evaluate("closeModal('modal-roaster')"); pg.wait_for_timeout(400)
    # ---- new coffee from a known roaster autofills
    pg.evaluate("resetCoffeeModal(); openModal('modal-coffee')"); pg.wait_for_timeout(300)
    pg.fill('#c-name','New One'); pg.fill('#c-roaster','manhattan'); pg.locator('#c-roaster').dispatch_event('change'); pg.wait_for_timeout(200)
    ok('known roaster fills city, country and website', pg.input_value('#c-roaster-city')=='Rotterdam' and pg.input_value('#c-roaster-country')=='Netherlands' and pg.input_value('#c-roaster-web')=='https://manhattancoffeeroasters.com/')
    ok('new coffee starts with no note chips', pg.locator('#c-notes-chips .note-chip').count()==0)
    pg.evaluate("saveCoffee()"); pg.wait_for_timeout(900)
    n=[x for x in st(pg)['coffees'] if x['name']=='New One'][0]; ok('saved with no notes, grouped under the same roaster', n['notes']=='' and n['roaster'].lower()=='manhattan', n)
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
