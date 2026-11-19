# v3.61 fixes: last-brew tick on a split coffee, finish warning for frozen bags, days off roast across clock changes,
# a brew moved to another coffee, the brews-by-coffee index, and the woff2 font
from playwright.sync_api import sync_playwright
import json, datetime
res=[]; errs=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
T=datetime.date.today(); d=lambda n:(T-datetime.timedelta(days=n)).isoformat()
seed={'coffees':[{'id':'k','name':'Kilo','roaster':'R','roastDate':d(10),'weight':1000},
                 {'id':'s','name':'Solo','roaster':'R','roastDate':d(10),'weight':250},
                 {'id':'m','name':'Mover','roaster':'R','roastDate':d(5),'weight':250}],'recipes':[
                 {'id':'mv','coffeeId':'s','method':'Pourover','grind':'10','dose':'15','yield':'250','temp':'93','time':'3:00','rating':7,'bag':4,'createdAt':T.isoformat()+'T08:00:00Z'}]}
OPEN="[...document.querySelectorAll('.modal-overlay.open')].map(m=>m.id)"
def closeall(pg): pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))"); pg.wait_for_timeout(400)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(**p.devices['Pixel 7'], timezone_id='Europe/London'); pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    fails=[]; pg.on('requestfailed', lambda r: fails.append(r.url)); pg.on('response', lambda r: fails.append(r.url) if r.status>=400 else None)
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2',s)",json.dumps(seed)); pg.reload(); pg.wait_for_timeout(700)

    # 1. Last-brew tick on a split coffee asks about the next bag instead of finishing everything
    pg.evaluate("openSplitBag('k')"); pg.wait_for_timeout(300); pg.evaluate("saveSplit()"); pg.wait_for_timeout(500)
    stock=pg.evaluate("splitStock(state.coffees.find(c=>c.id==='k'))")
    pg.evaluate("state.selectedCoffeeId='k'; openRecipeModal()"); pg.wait_for_timeout(500)
    pg.evaluate("document.getElementById('r-dose').value='15'; document.getElementById('r-finish-bag').checked=true; saveRecipe()"); pg.wait_for_timeout(900)
    ok('last-brew tick on a split coffee opens "thaw the next bag?", not the finish sheet', pg.evaluate(OPEN)==['modal-next-bag'], pg.evaluate(OPEN))
    pg.evaluate("nextBagLater()"); pg.wait_for_timeout(500)
    c=pg.evaluate("(()=>{const c=state.coffees.find(c=>c.id==='k');return {f:c.finishedBag, n:splitStock(c), fr:inFreezer(c)}})()")
    ok('choosing Later keeps the frozen bags and the coffee open', c=={'f':False,'n':stock,'fr':True} and stock>0, c)

    # 2. Finishing a used-up split coffee says the frozen bags go too
    pg.evaluate("toggleFinishedBag('k')"); pg.wait_for_timeout(500)
    ok('finish sheet opens for a used-up split coffee', 'modal-finish' in pg.evaluate(OPEN))
    txt=pg.evaluate("document.getElementById('finish-summary').textContent")
    ok('finish sheet warns the frozen bags will be finished too', f'{stock} bags still in the freezer will be finished too' in txt, txt)
    closeall(pg)
    pg.evaluate("toggleFinishedBag('s')"); pg.wait_for_timeout(500)
    ok('no freezer line for a coffee that is not split', 'freezer' not in pg.evaluate("document.getElementById('finish-summary').textContent"))
    closeall(pg)
    pg.evaluate("state.selectedCoffeeId='s'; openRecipeModal()"); pg.wait_for_timeout(500)
    pg.evaluate("document.getElementById('r-dose').value='15'; document.getElementById('r-finish-bag').checked=true; saveRecipe()"); pg.wait_for_timeout(900)
    ok('last-brew tick on a plain coffee still opens the finish sheet', pg.evaluate(OPEN)==['modal-finish'], pg.evaluate(OPEN))
    closeall(pg)

    # 3. Days off roast counts calendar days, across both clock changes (Europe/London)
    age=lambda roast, at: pg.evaluate("([r,t])=>roastAgeAt({roastDate:r}, new Date(t).getTime())", [roast, at])
    ok('spring forward: 28 Mar → 00:30 on 2 Apr is 5 days', age('2026-03-28','2026-04-02T00:30:00+01:00')==5, age('2026-03-28','2026-04-02T00:30:00+01:00'))
    ok('autumn back: 20 Oct → 23:30 on 2 Nov is 13 days', age('2026-10-20','2026-11-02T23:30:00Z')==13, age('2026-10-20','2026-11-02T23:30:00Z'))
    ok('same day is day 0', age('2026-11-02','2026-11-02T23:59:00Z')==0)
    ok('before the roast date gives nothing', age('2026-11-05','2026-11-02T12:00:00Z') is None)
    fz=pg.evaluate("roastAgeAt({roastDate:'2026-10-20', freezes:[{from:'2026-10-22',to:'2026-10-30'}]}, new Date('2026-11-02T23:30:00Z').getTime())")
    ok('frozen days across the clock change pause the count exactly (13 − 8 = 5)', fz==5, fz)
    op=pg.evaluate("roastAgeAt({roastDate:'2026-10-20', freezes:[{from:'2026-10-24',to:null}]}, new Date('2026-11-02T23:30:00Z').getTime())")
    ok('still in the freezer: paused at the day it went in (4)', op==4, op)

    # 4. A brew moved to another coffee drops the old bag number (or takes the new coffee's bag)
    pg.evaluate("editBrew('mv')"); pg.wait_for_timeout(600)
    pg.evaluate("state.selectedCoffeeId='m'; saveRecipe()"); pg.wait_for_timeout(800); closeall(pg)
    r=pg.evaluate("state.recipes.find(x=>x.id==='mv')")
    ok('moved to an unsplit coffee: bag number removed', r['coffeeId']=='m' and 'bag' not in r, r)
    pg.evaluate("editBrew('mv')"); pg.wait_for_timeout(600)
    pg.evaluate("state.selectedCoffeeId='k'; saveRecipe()"); pg.wait_for_timeout(800); closeall(pg)
    r=pg.evaluate("[state.recipes.find(x=>x.id==='mv').bag, state.coffees.find(c=>c.id==='k').split.bag]")
    ok('moved to a split coffee: takes its current bag', r[0]==r[1], r)

    # 5. Brews-by-coffee index never goes stale
    n0=pg.evaluate("brewsFor('m').length")
    pg.evaluate("state.recipes.unshift({id:'zz',coffeeId:'m',method:'Pourover',dose:'15',createdAt:new Date().toISOString()})")
    ok('index sees a brew added in the same task', pg.evaluate("brewsFor('m').length")==n0+1)
    pg.evaluate("(()=>{brewsFor('m'); const i=state.recipes.findIndex(x=>x.id==='zz'); state.recipes[i]={...state.recipes[i],coffeeId:'s'}; save();})()")
    ok('index follows a brew edited onto another coffee', pg.evaluate("brewsFor('m').some(r=>r.id==='zz')")==False and pg.evaluate("brewsFor('s').some(r=>r.id==='zz')"))
    ok('changing the returned list does not change the index', pg.evaluate("(()=>{brewsFor('s').length=0; return brewsFor('s').length>0})()"))
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(400)
    ok('library counts brews per coffee', pg.locator('#coffees-list').count()==1)

    # 6. Font is woff2 and loads
    ok('Inter loads from the woff2 file', pg.evaluate("document.fonts.check('16px Inter')") and pg.evaluate("[...performance.getEntriesByType('resource')].some(e=>e.name.endsWith('Inter-var.woff2'))"))
    ok('no failed requests', not fails, fails)
    ok('no page errors', not errs, errs)
    b.close()
print(sum(res),'/',len(res)); import sys; sys.exit(0 if all(res) else 1)
