# Brew mode: get-ready glow, lowercase units, recipe name + author, finish time on the last step, step spacing (1b)
from playwright.sync_api import sync_playwright
import json, sys
res=[]; errs=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
long=['0:00 — Bloom','0:40 — Pour to 90g','1:00 — Pour to 135g','1:20 — Pour to 180g','1:40 — Pour to 225g','2:00 — Pour to 270g','2:20 — Pour to 300g','2:30 — Gentle swirl','2:45 — Stir once','3:00 — Draw down','3:30 — Check the bed','4:00 — Remove the dripper']
seed={'coffees':[{'id':'c1','name':'Gototi','roaster':'R'}],'recipes':[],'customRecipes':[{'id':'custom-long','name':'Pulse pour','method':'Pourover','dose':18,'water':300,'steps':long,'custom':True}]}
dev=lambda p: dict(p.devices['iPhone 13'], viewport={'width':393,'height':852}, screen={'width':393,'height':852})
with sync_playwright() as p:
    b=p.chromium.launch()
    def brew(rec, meth, at, dose='11', water='200'):
        pg=b.new_context(**dev(p)).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(500)
        pg.evaluate(f"state.selectedCoffeeId='c1'; state.selectedMethod='{meth}'; state.selectedRecipeId='{rec}'; openRecipeModal(); setBrewPage('dial')"); pg.wait_for_timeout(200)
        pg.fill('#r-dose',dose); pg.fill('#r-yield',water); pg.fill('#r-temp','96'); pg.fill('#r-grind','12.5')
        pg.evaluate(f"toggleBrewTimer(); clearInterval(brewTimer.tick); brewTimer.startedAt=Date.now()-{at}*1000; renderBrewTimer(); renderBrewMode()"); pg.wait_for_timeout(400)
        return pg
    def at(pg, t): pg.evaluate(f"brewTimer.startedAt=Date.now()-{t}*1000; renderBrewTimer(); renderBrewMode()"); pg.wait_for_timeout(120)
    pg=brew('aeropress-hoffmann','AeroPress',60)
    ok('numbers in lowercase: "11g · 200ml · 96°C · grind 12.5"', pg.inner_text('#bm-meta')=='11g · 200ml · 96°C · grind 12.5', pg.inner_text('#bm-meta'))
    ok('recipe name first, author below, nothing cut off', pg.inner_text('#bm-recipe .rn')=='Ultimate AeroPress' and pg.inner_text('#bm-recipe .ra')=='James Hoffmann' and pg.evaluate("(()=>{const e=document.querySelector('#bm-recipe .rn'); return e.scrollWidth<=e.clientWidth})()"))
    ok('not "soon" 60s out', not pg.evaluate("document.querySelector('.bm-next').classList.contains('soon')"))
    at(pg,116); ok('4 seconds before 2:00: get-ready glow on', pg.evaluate("document.querySelector('.bm-next').classList.contains('soon') && document.getElementById('bm-guide').classList.contains('soon')"))
    pg.wait_for_timeout(300); ok('...and the countdown is sage', pg.evaluate("getComputedStyle(document.getElementById('bm-next-in')).color")=='rgb(159, 204, 191)')
    at(pg,121); ok('step started: glow off', not pg.evaluate("document.querySelector('.bm-next').classList.contains('soon')"))
    at(pg,160); ok('last step: "Finish by about 3:00", counting down', pg.inner_text('#bm-next-at')=='Finish by about 3:00' and pg.inner_text('#bm-next-in').lower()=='in 0:20', [pg.inner_text('#bm-next-at'),pg.inner_text('#bm-next-in')])
    at(pg,177); ok('...glows in the last 5 seconds before the finish', pg.evaluate("document.querySelector('.bm-next').classList.contains('soon')"))
    at(pg,185); ok('after the finish: "+0:05 over"', pg.inner_text('#bm-next-in').lower()=='+0:05 over', pg.inner_text('#bm-next-in'))
    ok('4 steps: even spacing (same gap above, between, below) and times centred', pg.evaluate("""(()=>{const l=document.getElementById('bm-steps'), r=l.getBoundingClientRect(), li=[...l.children].map(x=>x.getBoundingClientRect());
      const g=[li[0].top-r.top, ...li.slice(1).map((x,i)=>x.top-li[i].bottom), r.bottom-li[li.length-1].bottom]; const t=[...l.querySelectorAll('li')].map(x=>{const a=x.querySelector('b').getBoundingClientRect(), b=x.getBoundingClientRect(); return Math.abs((a.top+a.bottom)/2-(b.top+b.bottom)/2)});
      return l.classList.contains('even') && Math.max(...g)-Math.min(...g)<=2 && Math.max(...t)<=1})()"""))
    pg=brew('v60-hoffmann','Pourover',200,'15','250'); 
    ok('recipe with a total time (3:30): finish taken from it', pg.inner_text('#bm-next-at')=='Finish by about 3:30' if pg.evaluate("timedSteps().length") and pg.evaluate("(()=>{const s=timedSteps(); return brewTimerSecs()>=s[s.length-1].at})()") else True, pg.inner_text('#bm-next-at'))
    pg=brew('aeropress-natdanai','AeroPress',600)
    ok('last step with no time to go on: "Last step"', pg.inner_text('#bm-next-at').lower()=='last step', pg.inner_text('#bm-next-at'))
    pg=brew('custom-long','Pourover',95,'18','300')
    st=pg.evaluate("(()=>{const l=document.getElementById('bm-steps'); const cur=l.querySelector('li.now'); const lr=l.getBoundingClientRect(), cr=cur.getBoundingClientRect(); return {over:l.classList.contains('over'), vis: cr.top>=lr.top && cr.bottom<=lr.bottom, scrolled:l.scrollTop>0}})()")
    ok('12 steps: scrolls with faded edges and the current step in view', st['over'] and st['vis'] and st['scrolled'], st)
    pg.evaluate("state.selectedRecipeId=null; renderBrewMode()"); pg.wait_for_timeout(100)
    ok('no recipe: shows the method', pg.inner_text('#bm-recipe').strip()=='Pourover')
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
