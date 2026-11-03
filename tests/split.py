# Split & freeze: one bag divided into equal bags, some kept out, the rest frozen and thawed one at a time.
# Also: stats period chips fit without scrolling; grinder + water labels share one row on brew cards; see-through tiles
from playwright.sync_api import sync_playwright
import json, sys, datetime
res=[]; errs=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
T=datetime.date.today(); d=lambda n:(T-datetime.timedelta(days=n)).isoformat()
W={'id':'w-b','name':'Bright & juicy','gh':60,'kh':15}
seed={'coffees':[
  {'id':'big','name':'Big Bag','roaster':'R','roastDate':d(20),'weight':1000,'decaf':True},
  {'id':'small','name':'Small','roaster':'R','roastDate':d(10),'weight':250}],
 'recipes':[{'id':'r0','coffeeId':'big','grinderId':'e29','method':'Steep & Release','grind':'10.5','dose':'15','yield':'250','extraction':'over','water':W,'createdAt':d(1)+'T08:00:00Z'},
            {'id':'r1','coffeeId':'small','grinderId':'e29','method':'Pourover','grind':'12','dose':'15','yield':'250','water':W,'createdAt':d(1)+'T07:00:00Z'}]}
get=lambda pg,e: pg.evaluate(f"(()=>{{const c=state.coffees.find(c=>c.id==='big');return {e}}})()")
names=lambda pg: pg.evaluate("[...document.querySelectorAll('#coffees-list .lib-divider')].map(h=>h.textContent.split('·')[0].trim())")
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>{localStorage.setItem('dialin_v2', s);localStorage.setItem('dialin_settings','{\"coffeeLayout\":\"grid\",\"darkMode\":true}')}", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(700)
    # stats chips
    pg.evaluate("showView('tracker')"); pg.wait_for_timeout(300)
    sw=pg.evaluate("(()=>{const b=document.getElementById('stats-period-bar');return [b.scrollWidth,b.clientWidth,[...b.children].map(x=>x.textContent)]})()")
    ok('stats periods fit without scrolling', sw[0] <= sw[1], sw)
    ok('stats period labels', sw[2]==['12 Mo','6 Mo','3 Mo','Month','All'], sw[2])
    # brew cards: grinder + water on one row, outside the name column
    pg.evaluate("showView('dashboard')"); pg.wait_for_timeout(300)
    rows=pg.evaluate("[...document.querySelectorAll('#view-dashboard .recipe-entry')].map(e=>{const g=e.querySelector('.rb-pills > span:first-child').getBoundingClientRect(),w=e.querySelector('.rb-pills .water-badge').getBoundingClientRect();return [Math.round(g.top),Math.round(w.top),Math.round(g.left)]})")
    ok('grinder and water labels on the same line on every card', rows and all(r[0]==r[1] for r in rows), rows)
    ok('...and lined up the same on every card', len(set(r[2] for r in rows))==1, rows)
    # see-through tiles
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300)
    bg=pg.evaluate("getComputedStyle(document.querySelector('#coffees-list .tile-b .tile-body')).backgroundColor")
    ok('tile panel is 40% opaque', '0.4)' in bg, bg)
    # menu and sheet
    pg.evaluate("showEditOverlay('coffee-big')"); pg.wait_for_timeout(200)
    ok('⋯ menu offers Split & freeze', pg.locator('.card-edit-overlay.visible button', has_text='Split').count()==1)
    pg.locator('.card-edit-overlay.visible button', has_text='Split').click(); pg.wait_for_timeout(500)
    ok('split sheet opens', pg.locator('#modal-split.open').count()==1)
    ok('defaults: 4 bags, keep 1 out', pg.inner_text('#split-count')=='4' and pg.inner_text('#split-keep')=='1')
    ok('bag size from what is left (985g / 4)', 'Equal bags of 246g' in pg.inner_text('#split-count-sub'), pg.inner_text('#split-count-sub'))
    ok('4 bags shown: 1 open, 3 freeze', pg.locator('#split-bags .sp-bag').count()==4 and pg.locator('#split-bags .sp-bag.fz').count()==3)
    pg.locator('#modal-split button[aria-label="Keep fewer out"]').click(); pg.wait_for_timeout(100)
    ok('cannot keep fewer than 1 out', pg.inner_text('#split-keep')=='1')
    for _ in range(3): pg.locator('#modal-split button[aria-label="Fewer bags"]').click()
    ok('at least 2 bags', pg.inner_text('#split-count')=='2' and pg.inner_text('#split-keep')=='1')
    for _ in range(2): pg.locator('#modal-split button[aria-label="More bags"]').click()
    ok('button names what it does', pg.inner_text('#split-go').lower()=='split · freeze 3 bags', pg.inner_text('#split-go'))
    pg.click('#split-go'); pg.wait_for_timeout(600)
    sp=get(pg,'c.split')
    ok('saved: 4 bags, bag 1 open, 3 frozen today', sp['count']==4 and sp['bag']==1 and sp['open']==1 and len(sp['frozen'])==3 and sp['frozen'][0]['from']==T.isoformat(), sp)
    ok('library: Open bags and Freezer', names(pg)==['Open bags','Freezer'], names(pg))
    ok('open tile says Bag 1 of 4', 'BAG 1 OF 4' in pg.inner_text('#coffees-list'))
    fz=pg.locator('#coffees-list .card-wrap', has=pg.locator('.tile-frozen'))
    ok('freezer tile: Frozen ×3, 3 bags with grams and day', fz.count()==1 and '×3' in fz.inner_text() and '3 bags · 739g · day 20' in fz.inner_text(), fz.inner_text() if fz.count() else '')
    ok('freezer tile has Thaw one', fz.locator('.card-brew-btn').inner_text().lower()=='thaw one')
    ok('badges do not overlap (Frozen above Decaf)', pg.evaluate("(()=>{const w=[...document.querySelectorAll('#coffees-list .card-wrap')].find(x=>x.querySelector('.tile-frozen'));const a=w.querySelector('.tile-frozen').getBoundingClientRect(),b=w.querySelector('.tile-decaf').getBoundingClientRect();return a.bottom<=b.top})()"))
    ok('the two cards have separate menus', pg.evaluate("document.querySelectorAll('[data-overlay=\"coffee-big\"]').length")==1 and pg.evaluate("document.querySelectorAll('[data-overlay=\"coffeefz-big\"]').length")==1)
    ok('grams left counts only the open bag', get(pg,'Math.round(gramsLeft(c))')==246)
    ok('Log Brew still lists it', pg.evaluate("(()=>{openRecipeModal();return [...document.querySelectorAll('#coffee-selector .cs-name')].map(e=>e.textContent)})()").count('Big Bag')==1)
    pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(300)
    # a brew records its bag
    pg.evaluate("""(()=>{state.recipes.unshift({id:'r2',coffeeId:'big',method:'Pourover',dose:'15',yield:'250',createdAt:new Date().toISOString(),bag:state.coffees.find(c=>c.id==='big').split.bag});save()})()""")
    ok('brews in this bag reduce what is left', get(pg,'Math.round(gramsLeft(c))')==231)
    # Thaw one while bag 1 still has beans asks first
    fz.locator('.card-brew-btn').click(); pg.wait_for_timeout(400)
    ok('thawing while beans are left asks first', pg.locator('#modal-confirm-delete.open').count()==1 and '231g' in pg.inner_text('#modal-confirm-delete').lower(), pg.inner_text('#modal-confirm-delete') if pg.locator('#modal-confirm-delete.open').count() else '')
    pg.evaluate("closeModal('modal-confirm-delete')"); pg.wait_for_timeout(300)
    # finishing bag 1 offers the next
    pg.evaluate("toggleFinishedBag('big')"); pg.wait_for_timeout(400)
    ok('finishing bag 1 asks about the next bag', pg.locator('#modal-next-bag.open').count()==1 and pg.evaluate("document.getElementById('nb-title').textContent")=='Bag 1 of 4 is finished' and '3 bags left' in pg.evaluate("document.getElementById('nb-sub').textContent"))
    pg.click('#modal-next-bag button:has-text("Not yet")'); pg.wait_for_timeout(500)
    ok('Not yet: no open bag, still in the freezer, not finished', get(pg,'[hasOpenBag(c), inFreezer(c), c.finishedBag]')==[False, True, False])
    ok('library now only has it in the Freezer', names(pg)==['Open bags','Freezer'] and pg.locator('#coffees-list .card-wrap', has_text='Big Bag').count()==1)
    ok('Log Brew leaves it out', 'Big Bag' not in pg.evaluate("(()=>{openRecipeModal();return [...document.querySelectorAll('#coffee-selector .cs-name')].map(e=>e.textContent).join()})()"))
    pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(300)
    # brewing it asks to thaw the next
    pg.evaluate("logBrewFor('big')"); pg.wait_for_timeout(400)
    ok('brewing it offers to thaw the next bag', pg.locator('#modal-confirm-delete.open').count()==1 and 'Thaw the next bag' in pg.inner_text('#modal-confirm-delete'))
    pg.locator('#modal-confirm-delete button', has_text='Thaw and brew').click(); pg.wait_for_timeout(700)
    ok('...thawed bag 2 and opened Log Brew on it', get(pg,'[bagLabel(c), splitStock(c), hasOpenBag(c)]')==['Bag 2 of 4', 2, True] and pg.evaluate("state.selectedCoffeeId")=='big')
    pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(300)
    ok('bag 2 starts full', get(pg,'Math.round(gramsLeft(c))')==246)
    # roast clock of a bag frozen for 30 days
    pg.evaluate(f"""(()=>{{const c=state.coffees.find(c=>c.id==='big');c.split.frozen[0].from='{d(30)}';c.roastDate='{d(50)}';save()}})()""")
    ok('a frozen bag is paused where it went in', get(pg,'stockAge(c)')==20, get(pg,'stockAge(c)'))
    pg.evaluate("thawNextBag('big', true)"); pg.wait_for_timeout(400)
    ok('thawed after 30 days: still day 20', get(pg,'roastAgeToday(c)')==20, get(pg,'roastAgeToday(c)'))
    ok('older brews keep their own age (brewed bag 1, yesterday: day 49)', pg.evaluate("daysOffRoast(state.recipes.find(r=>r.id==='r0'), state.coffees.find(c=>c.id==='big'))")==49)
    # finishing the last bag with nothing left in the freezer is a normal finish
    pg.evaluate("thawNextBag('big', true)"); pg.wait_for_timeout(300)
    ok('bag 4 of 4, freezer empty', get(pg,'[bagLabel(c), splitStock(c)]')==['Bag 4 of 4', 0])
    pg.evaluate("toggleFinishedBag('big')"); pg.wait_for_timeout(400)
    ok('last bag: the usual finish sheet', pg.locator('#modal-finish.open').count()==1)
    pg.evaluate("closeModal('modal-finish')"); pg.wait_for_timeout(300)
    # survives reload and a backup restore
    pg.reload(); pg.wait_for_timeout(600)
    ok('split survives reload', get(pg,'c.split && c.split.bag')==4)
    clean=pg.evaluate("JSON.stringify(sanitizeState(JSON.parse(JSON.stringify(state))).coffees.find(c=>c.id==='big').split)")
    ok('sanitize keeps a valid split', json.loads(clean)['count']==4, clean)
    bad=pg.evaluate("JSON.stringify(sanitizeState({coffees:[{id:'x',name:'X',split:{count:'<b>',frozen:'no'}},{id:'y',name:'Y',split:{count:3,bag:1,open:1,frozen:[{from:'2026-01-01'},{from:'bad'}],past:{'2':[{from:'2026-01-01',to:'2026-02-01'}],'zz':[]}}}],recipes:[{id:'b1',coffeeId:'y',bag:'99'}]}))")
    bad=json.loads(bad)
    ok('sanitize drops a broken split', 'split' not in bad['coffees'][0], bad['coffees'][0])
    ok('sanitize cleans frozen list and past', bad['coffees'][1]['split']['frozen']==[{'from':'2026-01-01'}] and list(bad['coffees'][1]['split']['past'].keys())==['2'], bad['coffees'][1]['split'])
    ok('sanitize drops a bad bag number on a brew', 'bag' not in bad['recipes'][0])
    # light mode: freezer tile + list view render
    pg.evaluate("setCoffeeLayout('list')"); pg.wait_for_timeout(300)
    ok('list view renders', pg.locator('#coffees-list .coffee-card').count()>=2)
    ok('no errors', not errs, errs)
    b.close()
print(f'{sum(res)}/{len(res)} passed'); sys.exit(0 if all(res) else 1)
