# Dial in fits on one screen (no scrolling) when brewing from Up next, on common phone sizes
from playwright.sync_api import sync_playwright
import json, sys, datetime
res=[]; errs=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
d=lambda n:(datetime.date.today()-datetime.timedelta(days=n)).isoformat()
seed={'coffees':[{'id':'c1','name':'Supernova','roaster':'Manhattan','roastDate':d(18)}],
 'recipes':[{'id':'r1','coffeeId':'c1','method':'Pourover','grind':'24','dose':'15','yield':'250','temp':'94','time':'180','extraction':'sour','rating':3,'date':d(1)}],
 'plannedBrews':[{'id':'p1','coffeeId':'c1','method':'Pourover','grind':'22','grindFrom':'24','grindDir':'finer','temp':'95','tempFrom':'94','dose':'15','yield':'250','fromExtraction':'sour'}]}
with sync_playwright() as p:
    b=p.chromium.launch()
    for dev in ['Pixel 7','Pixel 5','iPhone 13','Galaxy S9+']:
        pg=b.new_context(**p.devices[dev]).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(600)
        gid=pg.evaluate("GRINDERS.find(g=>!g.stepless && grinderScale(g)).id")
        pg.evaluate(f"state.plannedBrews[0].grinderId='{gid}'; state.recipes[0].grinderId='{gid}'; state.selectedGrinderId='{gid}'")
        pg.locator('#upnext-section .upnext-actions .btn-primary, #upnext-section button:has-text("Brew")').first.tap(); pg.wait_for_timeout(600)
        m=pg.evaluate("(()=>{const m=document.querySelector('#modal-recipe .modal'); return {page:brewPage, sh:m.scrollHeight, ch:m.clientHeight, folded:document.querySelectorAll('#brew-history .bh-col').length===0}})()")
        ok(f'{dev}: Up next → Dial in with Last & best folded', m['page']=='dial' and m['folded'], m)
        ok(f'{dev}: Dial in fits without scrolling', m['sh']<=m['ch']+1, m)
        if dev=='Pixel 7':
            pg.click('#brew-history .bh-strip'); pg.wait_for_timeout(150)
            ok('Last & best opens on tap', pg.locator('#brew-history .bh-col').count()>0)
            pg.click('#brew-history .bh-strip'); pg.wait_for_timeout(150)
    # footer buttons: same height, text on screen, Start brew stands out in dark mode
    LUM="""c=>{const v=c.match(/[\d.]+/g).slice(0,3).map(x=>{x/=255; return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)}); return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]}"""
    for dev in ['Pixel 7','Galaxy S9+']:
      for ts in ['default','large','xlarge']:
        for dark in (False, True):
            pg=b.new_context(**p.devices[dev]).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
            pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed))
            pg.evaluate(f"localStorage.setItem('dialin_settings', JSON.stringify({{darkMode:{str(dark).lower()}, textSize:'{ts}'}}))"); pg.reload(); pg.wait_for_timeout(500)
            tag=f"{dev}/{ts}/{'dark' if dark else 'light'}"
            ok(f'{tag}: page is not wider than the screen', pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"), pg.evaluate("[document.documentElement.scrollWidth, innerWidth]"))
            pg.evaluate("openRecipeModal(); setBrewPage('dial')"); pg.wait_for_timeout(400)
            r=pg.evaluate("""(()=>{const vw=document.querySelector('#modal-recipe .modal').getBoundingClientRect().right, a=document.getElementById('r-start-btn'), b=document.getElementById('r-skip-btn'), ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
              return {ha:ra.height, hb:rb.height, ta:ra.top, tb:rb.top, right:ra.right, vw, clip:a.scrollWidth>a.clientWidth+1}})()""")
            ok(f'{tag}: Start brew and Skip timer are the same height and in line', abs(r['ha']-r['hb'])<=1 and abs(r['ta']-r['tb'])<=1, r)
            ok(f'{tag}: Start brew fits on screen, text not clipped', r['right']<=r['vw']+1 and not r['clip'], r)
            if dark and ts=='default':
                c=pg.evaluate(f"(()=>{{const L={LUM}; const bg=getComputedStyle(document.getElementById('r-start-btn')).backgroundColor, fg=getComputedStyle(document.getElementById('r-start-btn')).color, foot=getComputedStyle(document.querySelector('#modal-recipe .modal')).backgroundColor; const cr=(x,y)=>{{const a=L(x),b=L(y); return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)}}; return {{btnVsSheet:cr(bg,foot), textVsBtn:cr(fg,bg)}}}})()")
                ok(f'{tag}: Start brew stands out from the sheet (≥3:1) with readable text (≥4.5:1)', c['btnVsSheet']>=3 and c['textVsBtn']>=4.5, c)
            pg.evaluate("setBrewPage('taste')"); pg.wait_for_timeout(200)
            t=pg.evaluate("[...document.querySelectorAll('#modal-recipe .taste-row')].map(r=>{const i=r.querySelector('input').getBoundingClientRect(), v=r.querySelector('.tv').getBoundingClientRect(); return [Math.round(i.left), Math.round(i.right), Math.round(v.right)]})")
            vw=pg.evaluate("document.querySelector('#modal-recipe .modal').getBoundingClientRect().right")
            ok(f'{tag}: taste-profile sliders line up and stay on screen', len({x[0] for x in t})==1 and len({x[1] for x in t})==1 and all(x[2]<=vw+1 for x in t), t)
            pg.context.close()
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
