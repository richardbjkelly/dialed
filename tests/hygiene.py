from playwright.sync_api import sync_playwright
import json, re, os
ROOT=os.environ.get('DIALED_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
errs=[]; res=[]; cons=[]; ext=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
import glob
html=open(ROOT+'/index.html',encoding='utf8').read()
src=html+''.join(open(f,encoding='utf8').read() for f in sorted(glob.glob(ROOT+'/js/*.js')+glob.glob(ROOT+'/css/*.css')))
sw=open(ROOT+'/sw.js',encoding='utf8').read()
ver=re.search(r"const APP_VERSION = '([^']+)'",src).group(1)
ok('version.json matches the app version', json.load(open(ROOT+'/version.json'))['version']==ver)
ok('service worker and asset links carry the same version', re.search(r"const VERSION = '([^']+)'",sw).group(1)==ver and set(re.findall(r'\?v=([\d.]+)',html))=={ver} and len(re.findall(r'\?v=',html))==7)
ok('no inline scripts, handlers or script-like links in the page', not re.search(r'<script(?![^>]*\ssrc=)|\son[a-z]+\s*=\s*["\\]|javascript:',src), re.findall(r'.{20}\son[a-z]+\s*=\s*["\\].{20}',src)[:3])
csp=re.search(r'Content-Security-Policy" content="([^"]*)"',html).group(1)
ok('content policy: scripts only from the app itself', "script-src 'self';" in csp and 'unsafe-eval' not in csp, csp)
# every handler in the markup uses the small action grammar and a listed action
acts=set(re.search(r'const ACTIONS = \{([^}]*)\}',src).group(1).replace(' ','').split(','))
ARG=r"(?:'[^']*'|-?\d+(?:\.\d+)?|null|true|false|this|event|this\.value|this\.checked|this\.src|\$\{[^}]*\})"
badh=[]
for m in re.finditer(r'\sdata-on-[a-z]+=(\\?")(.*?)\1',src):
    c=re.sub(r"'[^']*\$\{(?:[^{}]|'[^']*')*\}[^']*'","'T'",m.group(2).replace("\\'","'"))
    for st in [x.strip() for x in c.split(';') if x.strip()]:
        if st in ('return false','event.stopPropagation()'): continue
        mm=re.fullmatch(r"([A-Za-z_]\w*)\(\s*((?:"+ARG+r"(?:\s*,\s*"+ARG+r")*)?)\s*\)",st)
        if not mm or mm.group(1) not in acts: badh.append(st)
ok('every handler is a listed action with plain values', not badh, badh[:5])
ok('changelog has an entry for this version', f'## v{ver}' in open(ROOT+'/CHANGELOG.md',encoding='utf8').read(), ver)
ok('no Google Fonts / dead font names left', not re.search(r'googleapis|gstatic|Playfair|DM Mono|DM Sans',src))
mf=json.load(open(ROOT+'/manifest.json'))
ok('manifest uses relative paths', mf['start_url']=='./' and all(not i['src'].startswith(('http','/')) and os.path.exists(ROOT+'/'+i['src']) for i in mf['icons']) and '/dialed/' not in src)
ok('dead code removed', not re.search(r'function (nudgePlan|tasteLine|getGreeting)\b|paletteId:|displayFontId:',src))
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(**p.devices['Pixel 7']); pg=ctx.new_page()
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:cons.append(m.text))
    pg.on('request',lambda r: ext.append(r.url) if not r.url.startswith(('http://localhost','data:','blob:')) else None)
    seed={'coffees':[{'id':'c1','name':'A','price':14,'currency':'GBP','priceGBP':14,'weight':250}],'recipes':[]}
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(1500)
    for v in ['dashboard','coffees','tracker','recipes','grinders']: pg.evaluate(f"showView('{v}')"); pg.wait_for_timeout(300)
    ok('L4 no third-party requests on launch or browsing', not ext, ext)
    ok('L4 both fonts load from the site', pg.evaluate("document.fonts.ready.then(()=>document.fonts.check('12px \"Space Mono\"') && document.fonts.check('600 16px \"Space Grotesk\"') && [...document.fonts].filter(f=>f.status==='loaded').length>=2)"))
    ok('L3 headings still use the display font, body the mono font', 'Space Grotesk' in pg.evaluate("getComputedStyle(document.querySelector('.app-title')).fontFamily") and 'Space Mono' in pg.evaluate("getComputedStyle(document.querySelector('.nav-tab')).fontFamily"))
    ok('L6 policy present', pg.evaluate("!!document.querySelector('meta[http-equiv=Content-Security-Policy]')"))
    # exercise things the policy could break: photo blob, service worker, inline handlers
    pg.evaluate("openSettings()"); pg.wait_for_timeout(300)
    ok('L9 version shown in Settings', f'Version {ver}' in pg.inner_text('#settings-about'))
    ok('L4 privacy note in Settings', 'stays on this device' in pg.inner_text('#settings-about'))
    ok('L11 text size offered where supported', pg.is_visible('#text-size-row')); pg.evaluate("closeSettings()")
    ok('service worker registers', pg.evaluate("navigator.serviceWorker.ready.then(r=>!!r.active)"))
    viol=[c for c in cons if 'Content Security Policy' in c or 'Refused to' in c]
    ok('L6 nothing blocked by the policy', not viol, viol[:3])
    ok('all listed actions exist', pg.evaluate("Object.entries(ACTIONS).filter(([k,v])=>typeof v!=='function').map(x=>x[0])")==[])
    pg.evaluate("window.__x=0; const d=document.createElement('div'); d.innerHTML='<img src=x onerror=\"window.__x=1\"><button id=evil onclick=\"window.__x=2\">x</button>'; document.body.appendChild(d); document.getElementById('evil').click(); const sc=document.createElement('script'); sc.textContent='window.__x=3'; document.body.appendChild(sc)"); pg.wait_for_timeout(400)
    ok('strict policy: injected inline script and handlers do not run', pg.evaluate("window.__x")==0, pg.evaluate("window.__x"))
    pg.evaluate("const e=document.createElement('button'); e.id='evil2'; e.setAttribute('data-on-click','alert(1); eval(\\'1\\'); fetch(\\'x\\'); showView(\\'coffees\\').x'); document.body.appendChild(e); e.click()")
    ok('a handler naming an unlisted function is ignored entirely', pg.evaluate("state.currentView")!='coffees', pg.evaluate("state.currentView"))
    ok('L6 policy blocks outside scripts', pg.evaluate("new Promise(r=>{const s=document.createElement('script'); s.src='https://example.com/x.js'; s.onerror=()=>r(true); s.onload=()=>r(false); document.head.appendChild(s); setTimeout(()=>r('timeout'),3000)})")==True)
    ok('L9 no update banner when up to date', pg.is_hidden('#update-banner'))
    # foreign currency: fetch only now; rate kept with the price
    ext.clear()
    pg.route('**/api.frankfurter.**', lambda r: r.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body=json.dumps({'rates':{'EUR':1.25,'USD':1.4}})))
    pg.evaluate("resetCoffeeModal(); openModal('modal-coffee')"); pg.wait_for_timeout(300)
    pg.fill('#c-name','Euro Bag'); pg.fill('#c-price','25'); pg.fill('#c-weight','250'); pg.select_option('#c-currency','EUR'); pg.wait_for_timeout(800)
    ok('L4 rate looked up only once a foreign price is entered', any('frankfurter' in u for u in ext), ext)
    ok('preview uses the live rate', '£20.00' in pg.inner_text('#c-price-preview'), pg.inner_text('#c-price-preview'))
    pg.evaluate("saveCoffee()"); pg.wait_for_timeout(900)
    c=[x for x in json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))['coffees'] if x['name']=='Euro Bag'][0]
    ok('L8 rate and date stored with the price', c['priceGBP']==20 and c['fxRate']==1.25 and re.match(r'\d{4}-\d\d-\d\d$',c['fxDate']) and c['fxApprox']==False, c)
    ok('L14 new ids are not timestamps', not re.fullmatch(r'\d{13}',c['id']), c['id'])
    # editing other fields later keeps the original £ value even if rates have moved
    pg.evaluate("fxRates.EUR=2"); pg.evaluate(f"openEditCoffee('{c['id']}')"); pg.wait_for_timeout(400); pg.fill('#c-notes','hello'); pg.evaluate("saveCoffee()"); pg.wait_for_timeout(900)
    c2=[x for x in json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))['coffees'] if x['name']=='Euro Bag'][0]
    ok('L8 editing notes does not re-convert the price', c2['priceGBP']==20 and c2['fxRate']==1.25 and c2['notes']=='hello', c2)
    pg.evaluate(f"openEditCoffee('{c['id']}')"); pg.wait_for_timeout(400); pg.fill('#c-price','30'); pg.evaluate("saveCoffee()"); pg.wait_for_timeout(900)
    c3=[x for x in json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))['coffees'] if x['name']=='Euro Bag'][0]
    ok('L8 changing the price converts at the current rate', c3['priceGBP']==15 and c3['fxRate']==2, c3)
    pg.close()
    # fallback rate -> marked approximate
    pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/api.frankfurter.**', lambda r: r.abort())
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("localStorage.clear(); localStorage.setItem('dialin_v2', JSON.stringify({coffees:[],recipes:[]}))"); pg.reload(); pg.wait_for_timeout(600)
    pg.evaluate("resetCoffeeModal(); openModal('modal-coffee')"); pg.fill('#c-name','Dollar Bag'); pg.fill('#c-price','20'); pg.fill('#c-weight','250'); pg.select_option('#c-currency','USD'); pg.wait_for_timeout(500)
    ok('approx. rate shown in the form', 'approx' in pg.inner_text('#c-price-preview'))
    pg.evaluate("saveCoffee()"); pg.wait_for_timeout(900)
    d=json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))['coffees'][0]
    ok('L8 fallback conversion flagged', d['fxApprox']==True and d['fxRate']>0, d)
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300); pg.evaluate(f"showCoffeeDetail('{d['id']}')"); pg.wait_for_timeout(400)
    ok('L8 ≈ shown on the coffee page', '≈£' in pg.inner_text('#view-coffees'), pg.inner_text('#view-coffees')[:300])
    pg.evaluate("showView('tracker')"); pg.wait_for_timeout(400); ok('L8 ≈ shown on Insights totals', '≈£' in pg.inner_text('#view-tracker'))
    pg.close()
    # update prompt
    pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/version.json*', lambda r: r.fulfill(status=200, content_type='application/json', body='{"version":"99.0"}'))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.wait_for_timeout(1500)
    ok('L9 update prompt appears when a newer version exists', pg.is_visible('#update-banner') and 'v99.0' in pg.inner_text('#update-banner'))
    pg.click('#update-banner button[aria-label=Dismiss]'); ok('L9 prompt can be dismissed', pg.is_hidden('#update-banner'))
    # works offline once installed
    pg2=ctx.new_page(); pg2.on('pageerror',lambda e:errs.append(str(e)))
    pg2.goto('http://localhost:8765/dialed/index.html'); pg2.evaluate("navigator.serviceWorker.ready"); pg2.wait_for_timeout(1500)
    ctx.set_offline(True); pg2.reload(); pg2.wait_for_timeout(1200)
    ok('app loads and runs offline (page, styles, scripts, fonts)', pg2.evaluate("typeof showView==='function' && typeof ACTIONS==='object' && getComputedStyle(document.querySelector('.bottom-nav')).position==='fixed'") and pg2.evaluate("document.fonts.check('12px \"Space Mono\"')"))
    ctx.set_offline(False); pg2.close()
    # old settings keys dropped
    pg.evaluate("localStorage.setItem('dialin_settings', JSON.stringify({paletteId:'x',darkMode:true}))"); pg.reload(); pg.wait_for_timeout(600)
    ok('L3 old settings load cleanly', pg.evaluate("appSettings.darkMode===true && !('paletteId' in appSettings)"))
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res))
