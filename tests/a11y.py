from playwright.sync_api import sync_playwright
import json, sys
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
T={'sweet':3,'acid':2,'bitter':1,'body':4,'clarity':3}
seed={'coffees':[{'id':'c1','name':'Supernova','roaster':'Manhattan','country':'Colombia','process':'Washed','varietal':'Gesha, Sidra, Caturra','masl':'1900','weight':250,'rating':8,'createdAt':'2026-09-01T00:00:00Z'},{'id':'c2','name':'Decaf One','roaster':'Dak','country':'Ethiopia','decaf':True,'process':'Natural','createdAt':'2026-09-02T00:00:00Z'}],
 'recipes':[{'id':f'r{i}','coffeeId':'c1' if i%2 else 'c2','method':'AeroPress','dose':'11','yield':'200','temp':'92','grind':'5','rating':7,'extraction':'good','notes':'Sweet and juicy with a long finish','taste':T,'createdAt':'2026-09-%02dT07:00:00Z'%(i+1)} for i in range(6)]}
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(700)
    ok('pinch-zoom not blocked', 'maximum-scale' not in pg.evaluate("document.querySelector('meta[name=viewport]').content"))
    views=['dashboard','coffees','tracker','recipes','grinders']
    bad=[]; small=[]; emo=[]
    for v in views:
        pg.evaluate(f"showView('{v}')"); pg.wait_for_timeout(500)
        bad+=pg.evaluate("[...document.querySelectorAll('[data-on-click]')].filter(e=>!/^(BUTTON|A|INPUT|SELECT|LABEL)$/.test(e.tagName) && !e.matches('.modal-overlay,.settings-backdrop') && !(e.getAttribute('role')==='button' && e.tabIndex>=0)).map(e=>e.className||e.tagName)")
        small+=pg.evaluate("""[...document.querySelectorAll('.view.active *, .bottom-nav *, header *')].filter(e=>e.offsetParent && [...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize)<11).map(e=>e.textContent.trim().slice(0,20)+':'+getComputedStyle(e).fontSize)""")
        emo+=pg.evaluate(r"""(document.querySelector('.view.active').innerText.match(/[\u{1F300}-\u{1FAFF}]|[✋⚡⭐☕✏⛰✅⚖☆]/gu)||[])""")
    ok('every tappable element is a button or has a button role + tab stop', not bad, bad[:8])
    ok('no visible text under 11px', not small, small[:8])
    ok('no emoji used as icons on the five main screens', not emo, emo[:10])
    # dialogs
    d=pg.evaluate("[...document.querySelectorAll('.modal-overlay')].map(o=>{const d=o.matches('[role=dialog]')?o:o.querySelector('[role=dialog]'); return !!d && d.getAttribute('aria-modal')==='true' && !!(d.getAttribute('aria-label')||document.getElementById(d.getAttribute('aria-labelledby')))})")
    ok(f'all {len(d)} sheets are named dialogs', len(d)>=10 and all(d), d)
    ok('settings panel is a dialog and inert while closed', pg.evaluate("(()=>{const s=document.getElementById('settings-panel'); return s.getAttribute('role')==='dialog' && s.inert})()"))
    # keyboard: tile
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(400)
    pg.evaluate("document.querySelector('#view-coffees .coffee-card').focus()"); pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
    ok('Enter on a coffee tile opens it', pg.evaluate("typeof detailShownId!=='undefined' && !!detailShownId") and 'attempt' in pg.inner_text('#view-coffees').lower())
    # log brew sheet
    pg.evaluate("document.querySelector('.fab').focus()"); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    ok('FAB sheet opens from keyboard and takes focus', pg.locator('#modal-fab.open').count()==1 and pg.evaluate("document.getElementById('modal-fab').contains(document.activeElement)"))
    for _ in range(12): pg.keyboard.press('Tab')
    ok('Tab stays inside the open sheet', pg.evaluate("document.getElementById('modal-fab').contains(document.activeElement)"), pg.evaluate("document.activeElement.outerHTML.slice(0,80)"))
    pg.keyboard.press('Shift+Tab'); ok('Shift+Tab stays inside too', pg.evaluate("document.getElementById('modal-fab').contains(document.activeElement)"))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
    ok('Escape closes the sheet', pg.locator('#modal-fab.open').count()==0)
    ok('focus returns to the + button', pg.evaluate("document.activeElement.classList.contains('fab')"), pg.evaluate("document.activeElement.outerHTML.slice(0,80)"))
    pg.evaluate("state.selectedCoffeeId='c1'; openRecipeModal()"); pg.wait_for_timeout(500)
    unl=pg.evaluate("[...document.querySelectorAll('#modal-recipe input:not([type=hidden]):not([type=file]), #modal-recipe select, #modal-recipe textarea')].filter(c=>!(c.getAttribute('aria-label')||c.getAttribute('aria-labelledby')||(c.labels&&c.labels.length))).map(c=>c.id||c.outerHTML.slice(0,60))")
    ok('every Log Brew field has a label', not unl, unl)
    names=pg.evaluate("['r-dose','r-yield','r-temp','r-notes'].map(i=>{const c=document.getElementById(i); return c? ((c.labels&&c.labels[0]&&c.labels[0].textContent.trim())||c.getAttribute('aria-label')||(document.getElementById(c.getAttribute('aria-labelledby'))||{}).textContent||''):'missing'})")
    print('   labels:',names); ok('labels are meaningful', all(names) and 'missing' not in names, names)
    pg.evaluate("document.querySelector('#modal-recipe .method-tab:nth-child(2)').focus()"); pg.keyboard.press(' '); pg.wait_for_timeout(200)
    ok('Space selects a brew method and announces it as pressed', pg.evaluate("state.selectedMethod")=='Pourover' and pg.evaluate("document.querySelector('#modal-recipe .method-tab:nth-child(2)').getAttribute('aria-pressed')")=='true' and pg.evaluate("document.querySelectorAll('#modal-recipe .method-tab[aria-pressed=true]').length")==1)
    # stacked: confirm over recipe -> Escape closes only the top one
    pg.evaluate("confirmAction({title:'T',text:'x',button:'Go',onYes(){}})"); pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
    ok('Escape closes only the top sheet', pg.locator('#modal-confirm-delete.open').count()==0 and pg.locator('#modal-recipe.open').count()==1)
    pg.fill('#r-dose','12'); pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
    ok('Escape closes Log Brew; focus not left in a hidden field', pg.locator('#modal-recipe.open').count()==0 and not pg.evaluate("document.getElementById('modal-recipe').contains(document.activeElement)"))
    # coffee form labels
    pg.evaluate("resetCoffeeModal(); openModal('modal-coffee')"); pg.wait_for_timeout(400)
    unl=pg.evaluate("[...document.querySelectorAll('#modal-coffee input:not([type=hidden]):not([type=file]), #modal-coffee select, #modal-coffee textarea')].filter(c=>!(c.getAttribute('aria-label')||c.getAttribute('aria-labelledby')||(c.labels&&c.labels.length))).map(c=>c.id)")
    ok('every Add Coffee field has a label', not unl, unl); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    # settings
    pg.evaluate("openSettings()"); pg.wait_for_timeout(400)
    ok('settings usable when open', not pg.evaluate("document.getElementById('settings-panel').inert"))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
    ok('Escape closes Settings', not pg.evaluate("document.getElementById('settings-panel').classList.contains('open')") and pg.evaluate("document.getElementById('settings-panel').inert"))
    # icon buttons named
    pg.evaluate("showView('tracker')"); pg.wait_for_timeout(400)
    un=pg.evaluate("[...document.querySelectorAll('button')].filter(b=>b.offsetParent && !b.textContent.trim().replace(/[✕×⋯·+]/g,'') && !b.getAttribute('aria-label')).map(b=>b.outerHTML.slice(0,90))")
    ok('icon-only buttons have spoken names', not un, un[:5])
    ok('no page errors', not errs, errs)
    if len(sys.argv)>1:
        for v in views:
            pg.evaluate(f"showView('{v}')"); pg.wait_for_timeout(500); pg.screenshot(path=f'shots/a11y_{v}.png')
print(sum(res),'/',len(res))
