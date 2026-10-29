# Brew trends: no crowded labels; tap/hold/slide a point for details; arrow keys; card shows the selected brew
from playwright.sync_api import sync_playwright
import json, sys
res=[]; errs=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
grinds=[10,11,12,12,11,10,12,12,12,11,11.5,12.5,10.5,10.5,10.5,11,11.5,11]; temps=[88,88,88,92,92,92,96,100,100,100,100,100,100,100,100,100,100,100]
scores=[6,7,0,7,7,8,7,8,0,8,9,0,9,0,0,9,8,8]; ex=['over','over','','under','under','over','under','','','over','','','good','','','good','good','good']
times=[228,213,210,202,208,223,202,230,372,230,281,325,242,358,257,243,230,223]
recs=[{'id':f'r{i}','coffeeId':'c1','method':'Pourover','grind':str(grinds[i]),'temp':str(temps[i]),'dose':'15','yield':'250','rating':scores[i],'extraction':ex[i],'time':times[i],'createdAt':f'2026-10-{i+1:02d}T08:00:00Z',**({'notes':'Juicy, sweet finish.'} if i==12 else {})} for i in range(18)]
seed={'coffees':[{'id':'c1','name':'Supernova','roaster':'Danelaw','country':'Colombia'}],'recipes':recs}
with sync_playwright() as p:
    b=p.chromium.launch()
    for dark in (True, False):
        pg=b.new_context(viewport={'width':393,'height':852},is_mobile=True,has_touch=True).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.evaluate(f"localStorage.setItem('dialin_settings', JSON.stringify({{darkMode:{str(dark).lower()}}}))"); pg.reload(); pg.wait_for_timeout(500)
        pg.evaluate("showView('coffees'); showCoffeeDetail('c1'); showTrendModal('c1')"); pg.wait_for_timeout(600)
        m='dark' if dark else 'light'
        card=lambda: pg.inner_text('#trend-charts-wrap .tr-card')
        ok(f'{m}: opens on the latest brew', 'brew 18 of 18 · latest' in card() and 'Grind 11' in card() and '8/10' in card().replace('\n',''), card())
        ok(f'{m}: no per-point labels (no rows of temps/grinds under the chart)', pg.evaluate("[...document.querySelectorAll('#trend-charts-wrap .tr-plot text')].filter(t=>/°C$/.test(t.textContent)).length")==0)
        dl=pg.evaluate("(()=>{const s=document.querySelector('.tr-plot'); return [...s.querySelectorAll('text')].filter(t=>/[A-Z][a-z]{2}$/.test(t.textContent)).map(t=>t.getBoundingClientRect()).map(r=>[r.left,r.right])})()")
        ok(f'{m}: at most 5 dates and none overlap', len(dl)<=5 and all(dl[i][1] < dl[i+1][0] for i in range(len(dl)-1)), dl)
        box=pg.locator('#trend-charts-wrap .tr-plot').first.bounding_box()
        x13=box['x']+box['width']*(26+12*(340-38)/17)/340
        pg.mouse.move(x13, box['y']+box['height']*0.3); pg.mouse.down(); pg.wait_for_timeout(150)
        ok(f'{m}: holding brew 13 shows the bubble and its card', pg.locator('#trend-charts-wrap .tr-tip').count()==1 and 'brew 13 of 18' in card() and '9/10' in card().replace('\n','') and 'Juicy, sweet finish' in card(), card())
        ok(f'{m}: card shows what changed', 'grind 12.5 → 10.5' in card(), card())
        x5=box['x']+box['width']*(26+4*(340-38)/17)/340
        pg.mouse.move(x5, box['y']+box['height']*0.3, steps=8); pg.wait_for_timeout(150)
        ok(f'{m}: sliding moves to brew 5', 'brew 5 of 18' in card(), card())
        pg.mouse.up(); pg.wait_for_timeout(150)
        ok(f'{m}: letting go hides the bubble and keeps the brew', pg.locator('#trend-charts-wrap .tr-tip').count()==0 and 'brew 5 of 18' in card())
        tb=pg.locator('#trend-charts-wrap .tr-plot').nth(1).bounding_box()
        pg.mouse.click(tb['x']+tb['width']*(26+8*(340-38)/17)/340, tb['y']+tb['height']*0.5); pg.wait_for_timeout(150)
        ok(f'{m}: tapping the brew-time chart picks that brew (9, longest)', 'brew 9 of 18' in card() and '—' in card() and 'longest 6:12' in pg.inner_text('#trend-charts-wrap'), card())
        hs=set()
        for i in range(18):
            pg.evaluate(f"trendState.sel={i}; drawTrend()"); hs.add(round(pg.evaluate("document.querySelector('#modal-trends .modal').scrollHeight")))
            hs.add(round(pg.evaluate("document.querySelector('#trend-charts-wrap .tr-card').getBoundingClientRect().height"))*1000)
        pg.evaluate("trendState.holding=true; drawTrend()"); hs.add(round(pg.evaluate("document.querySelector('#modal-trends .modal').scrollHeight"))); pg.evaluate("trendState.holding=false; trendState.sel=8; drawTrend()")
        ok(f'{m}: window and card stay the same height for every brew (and while holding)', len([h for h in hs if h<1000])==1 and len([h for h in hs if h>=1000])==1, sorted(hs))
        pg.focus('#trend-charts-wrap .tr-box'); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(100)
        ok(f'{m}: arrow keys move between brews', 'brew 10 of 18' in card())
        pg.screenshot(path=f'shots/trends_{m}.png')
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
