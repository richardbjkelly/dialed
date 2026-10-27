# Coffee library: oldest roast first, brew from a card, the freezer (paused roast clock); Plan next nudge size
from playwright.sync_api import sync_playwright
import json, sys, datetime
res=[]; errs=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
T=datetime.date.today(); d=lambda n:(T-datetime.timedelta(days=n)).isoformat()
seed={'coffees':[
  {'id':'young','name':'Young','roaster':'R','roastDate':d(5)},
  {'id':'old','name':'Old','roaster':'R','roastDate':d(30)},
  {'id':'nodate','name':'No Date','roaster':'R'},
  {'id':'mid','name':'Mid','roaster':'R','roastDate':d(14)},
  # roasted 60 days ago, frozen from day 10 to 10 days ago -> 20 days off roast now
  {'id':'thawed','name':'Thawed','roaster':'R','roastDate':d(60),'freezes':[{'from':d(50),'to':d(10)}]},
  # roasted 40 days ago, frozen since day 12 -> paused at 12
  {'id':'ice','name':'Ice','roaster':'R','roastDate':d(40),'freezes':[{'from':d(28),'to':None}]},
  {'id':'done','name':'Done','roaster':'R','roastDate':d(90),'finishedBag':True}],
 'recipes':[{'id':'r1','coffeeId':'ice','grinderId':'e29','method':'Pourover','grind':'8.4','temp':'94','dose':'15','yield':'250','extraction':'under','createdAt':d(30)+'T08:00:00Z'}],
 'plannedBrews':[{'id':'p1','coffeeId':'ice','method':'Pourover','grind':'8','dose':'15','yield':'250'}]}
names=lambda pg: pg.evaluate("[...document.querySelectorAll('#coffees-list .coffee-card-name, #coffees-list .tile-name')].map(e=>e.childNodes[0].textContent.trim())")
heads=lambda pg: pg.evaluate("[...document.querySelectorAll('#coffees-list .lib-divider')].map(e=>e.textContent.split('·')[0].trim())")
close=lambda pg: (pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))"), pg.wait_for_timeout(400))
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(600)
    ok('freezer time is not counted: thawed bag is 20 days off roast', pg.evaluate("roastAgeToday(state.coffees.find(c=>c.id==='thawed'))")==20)
    ok('a frozen bag is paused where it went in (12 days)', pg.evaluate("roastAgeToday(state.coffees.find(c=>c.id==='ice'))")==12)
    ok('brews logged before freezing keep their real age', pg.evaluate("daysOffRoast(state.recipes[0], state.coffees.find(c=>c.id==='ice'))")==10)
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300)
    for layout in ['list','grid']:
        pg.evaluate(f"setCoffeeLayout('{layout}')"); pg.wait_for_timeout(300)
        ok(f'{layout}: open bags oldest roast first (paused age), then Freezer, then Finished', names(pg)==['Old','Thawed','Mid','Young','No Date','Ice','Done'], names(pg))
        ok(f'{layout}: group headings', heads(pg)==['Open bags','Freezer','Finished'], heads(pg))
        btns=pg.evaluate("[...document.querySelectorAll('#coffees-list .card-brew-btn')].map(b=>b.textContent.trim())")
        ok(f'{layout}: Brew on open bags, Thaw on frozen, none on finished', btns==['Brew']*5+['Thaw'], btns)
        ok(f'{layout}: brew buttons are big enough to tap', pg.evaluate("Math.min(...[...document.querySelectorAll('#coffees-list .card-brew-btn')].map(b=>b.getBoundingClientRect().height))")>=30)
    pg.evaluate("setCoffeeLayout('list')"); pg.wait_for_timeout(300)
    ok('frozen card says so', '❄ Frozen · 12d off roast' in pg.inner_text('#coffees-list'))
    # brew from a card
    pg.locator('#coffees-list .card-brew-btn', has_text='Brew').nth(2).tap(); pg.wait_for_timeout(500)
    ok('Brew on a card opens Log Brew with that coffee chosen', pg.locator('#modal-recipe.open').count()==1 and pg.evaluate("state.selectedCoffeeId")=='mid' and pg.evaluate("document.querySelector('#coffee-selector .selected .cs-name').textContent")=='Mid')
    ok('...and did not open the coffee page underneath', pg.locator('#coffees-list').count()==1)
    pg.locator('#coffee-selector .coffee-selector-item.selected').tap(); pg.wait_for_timeout(200)
    lst=pg.evaluate("[...document.querySelectorAll('#coffee-selector .cs-name')].map(e=>e.textContent)")
    ok('Log Brew list: chosen first, then oldest (paused age); frozen and finished left out', lst==['Mid','Old','Thawed','Young','No Date'], lst)
    close(pg)
    # frozen: Brew now from Up next asks to thaw
    pg.evaluate("showView('dashboard')"); pg.wait_for_timeout(300)
    ok('Up next marks the frozen coffee', 'Frozen' in pg.inner_text('#upnext-section'))
    pg.locator('#upnext-section button', has_text='Brew now').tap(); pg.wait_for_timeout(400)
    ok('Brew now on a frozen coffee asks to thaw first (no Log Brew yet)', pg.locator('#modal-confirm-delete.open').count()==1 and 'frozen' in pg.inner_text('#modal-confirm-delete').lower() and pg.locator('#modal-recipe.open').count()==0)
    close(pg)
    ok('cancelling leaves it frozen', pg.evaluate("isFrozen(state.coffees.find(c=>c.id==='ice'))"))
    pg.locator('#upnext-section button', has_text='Brew now').tap(); pg.wait_for_timeout(400)
    pg.locator('#modal-confirm-delete button', has_text='Thaw and brew').tap(); pg.wait_for_timeout(600)
    st=json.loads(pg.evaluate("localStorage.getItem('dialin_v2')")); ice=[c for c in st['coffees'] if c['id']=='ice'][0]
    ok('Thaw and brew: thawed, saved, and Log Brew opens on that coffee', not pg.evaluate("isFrozen(state.coffees.find(c=>c.id==='ice'))") and ice['freezes'][-1]['to']==T.isoformat() and pg.locator('#modal-recipe.open').count()==1 and pg.evaluate("state.selectedCoffeeId")=='ice', ice)
    ok('after thawing the clock carries on from 12', pg.evaluate("roastAgeToday(state.coffees.find(c=>c.id==='ice'))")==12)
    close(pg)
    # freeze from the coffee page
    pg.evaluate("showView('coffees'); showCoffeeDetail('young')"); pg.wait_for_timeout(400)
    ok('coffee page has Log brew and Freeze', pg.locator('.detail-brew-row button', has_text='Log brew').count()==1 and pg.locator('.detail-brew-row button', has_text='Freeze').count()==1)
    pg.locator('.detail-brew-row button', has_text='Freeze').tap(); pg.wait_for_timeout(400)
    ok('Freeze: page shows it is in the freezer with the paused age; Log brew gone', 'In the freezer since' in pg.inner_text('.detail-brew-row') and 'paused at 5d' in pg.inner_text('.detail-brew-row') and pg.locator('.detail-brew-row button', has_text='Log brew').count()==0)
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(400)
    ok('frozen coffee is not in Log Brew', 'Young' not in pg.evaluate("[...document.querySelectorAll('#coffee-selector .cs-name')].map(e=>e.textContent)"))
    close(pg)
    pg.evaluate("showView('coffees'); showCoffeeDetail('young')"); pg.wait_for_timeout(300)
    pg.locator('.detail-brew-row button', has_text='Thaw').tap(); pg.wait_for_timeout(400)
    st=json.loads(pg.evaluate("localStorage.getItem('dialin_v2')")); y=[c for c in st['coffees'] if c['id']=='young'][0]
    ok('freeze and thaw on the same day leaves no pause behind', 'freezes' not in y or y['freezes']==[], y)
    # everything frozen
    pg.evaluate("state.coffees.forEach(c=>{ if(!c.finishedBag && !isFrozen(c)) { c.freezes=[{from:'"+d(1)+"',to:null}] } }); save(); openRecipeModal()"); pg.wait_for_timeout(400)
    ok('all bags frozen: Log Brew explains instead of opening', pg.locator('#modal-recipe.open').count()==0 and 'freezer' in pg.inner_text('#modal-confirm-delete').lower())
    close(pg)
    # import sanitising
    out=pg.evaluate("""sanitizeState({coffees:[{id:'a',name:'A',freezes:[{from:'2026-01-01',to:null},{from:'bad'},{from:'2026-02-01',to:null}]},{id:'b',name:'B',freezes:'x'},{id:'c',name:'C',finishedBag:true,freezes:[{from:'2026-03-01',to:null}]}],recipes:[]}).coffees.map(c=>c.freezes||null)""")
    ok('imported freezer data is cleaned up (one open period at most; none on finished bags)', out==[[{'from':'2026-01-01','to':'2026-02-01'},{'from':'2026-02-01','to':None}],None,[{'from':'2026-03-01','to':'2026-03-01'}]], out)
    # Plan next nudge
    ok('078S: Finer/Coarser moves half a number', pg.evaluate("planGrindNudge(GRINDERS.find(g=>g.id==='e29'),'Pourover','')")==0.5)
    um=pg.evaluate("GRINDERS.filter(g=>grinderScale(g)).map(g=>{const sc=grinderScale(g), n=planGrindNudge(g,'Pourover',''), st=planGrindStep(g,'Pourover',''); return [g.model, n*sc.per, st*sc.per]})")
    ok('every grinder nudges about the same amount (≈28µm, or one step if a step is bigger)', all(abs(x[1]-27.8)<=max(x[2]/2,0.06*27.8)+0.01 or (x[2]>27.8 and abs(x[1]-x[2])<0.01) for x in um), [x for x in um if not (abs(x[1]-27.8)<=max(x[2]/2,1.7)+0.01 or (x[2]>27.8 and abs(x[1]-x[2])<0.01))])
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
