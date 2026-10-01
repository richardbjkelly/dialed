from playwright.sync_api import sync_playwright
import json
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
with sync_playwright() as p:
    b=p.chromium.launch()
    for dark in (True, False):
        pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('http://localhost:8765/dialed/index.html')
        seed={'coffees':[{'id':'c1','name':'Supernova','roaster':'Danelaw','roastDate':'2026-09-01','price':13,'priceGBP':13,'weight':250,'decaf':True},{'id':'c2','name':'Pepe','roaster':'Ninth'}],
          'recipes':[{'id':'r1','coffeeId':'c1','grinderId':'e29','method':'AeroPress','grind':'10','dose':'11','yield':'200','temp':'88','time':228,'rating':9,'extraction':'over','taste':{'sweetness':1,'acidity':2,'body':3,'bitterness':3},'notes':'Decent acidity, bit of astringency, bitterness','createdAt':'2026-09-30T08:00:00Z'},
                     {'id':'r2','coffeeId':'c1','method':'AeroPress','dose':'11','yield':'200','taste':{'acidity':4},'notes':'<b>not bold</b> & fine','createdAt':'2026-09-29T08:00:00Z'},
                     {'id':'r3','coffeeId':'c2','method':'Espresso','dose':'18','createdAt':'2026-09-28T08:00:00Z'}]}
        pg.evaluate(f"localStorage.setItem('dialin_v2', JSON.stringify({json.dumps(seed)})); localStorage.setItem('dialin_settings', JSON.stringify({{darkMode:{str(dark).lower()}}}))")
        pg.reload(); pg.wait_for_timeout(500)
        m='dark' if dark else 'light'
        for where, go in [('overview',"showView('dashboard')"),('insights',"showView('tracker')"),('coffee page',"showView('coffees'); showCoffeeDetail('c1')")]:
            pg.evaluate(go); pg.wait_for_timeout(400)
            vis=pg.locator('.recipe-entry').locator('visible=true')
            ok(f'{m} {where}: cards render', vis.count()>=2, vis.count())
        pg.evaluate("showView('coffees'); showCoffeeDetail('c1')"); pg.wait_for_timeout(400)
        c1=pg.locator('.recipe-entry').locator('visible=true').nth(0)
        ok(f'{m}: decaf badge in header', c1.locator('.decaf-label').count()==1)
        ok(f'{m}: four taste cells', c1.locator('.ts-cell').count()==4 and c1.locator('.ts-cell b').all_inner_texts()==['1','2','3','3'])
        ok(f'{m}: rating 9/10', c1.locator('.brew-rating').inner_text().replace('\n','')=='9/10')
        ok(f'{m}: spec line', '1:18.2' in c1.locator('.brew-spec').inner_text() and '88' in c1.locator('.brew-spec').inner_text())
        c2=pg.locator('.recipe-entry').locator('visible=true').nth(1)
        ok(f'{m}: partial taste shows one cell', c2.locator('.ts-cell').count()==1)
        ok(f'{m}: no rating -> no rating text', c2.locator('.brew-rating').count()==0)
        ok(f'{m}: notes escaped', '<b>not bold</b>' in c2.locator('.brew-note').inner_text())
        widths=pg.eval_on_selector_all('.recipe-entry .ts-cell','es=>es.filter(e=>e.getClientRects().length).map(e=>Math.round(e.getBoundingClientRect().width))'); ok(f'{m}: roomy cells', min(widths)>=44, widths)
        sw=pg.evaluate("document.documentElement.scrollWidth"); ok(f'{m}: no sideways scroll', sw<=412, sw)
        pg.evaluate("document.querySelector('.fab').style.display='none'; document.querySelector('.nav-tab').parentElement.style.display='none'")
        c1.scroll_into_view_if_needed(); c1.screenshot(path=f'shots/bc_{m}.png')
        if dark:
            pg.evaluate("setTextSize('xlarge')"); pg.wait_for_timeout(300)
            sw=pg.evaluate("document.documentElement.scrollWidth"); ok('xl: no sideways scroll', sw<=412, sw)
            c1=pg.locator('.recipe-entry').locator('visible=true').nth(0); c1.scroll_into_view_if_needed(); c1.screenshot(path='shots/bc_xl.png')
            pg.evaluate("setTextSize('default')")
        pg.close()
    b.close()
print(f"{sum(res)}/{len(res)} passed; errors {errs}"); assert all(res) and not errs; print('PASS')
