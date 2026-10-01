from playwright.sync_api import sync_playwright
import json
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    pg.evaluate("localStorage.setItem('dialin_v2', JSON.stringify({coffees:[{id:'c1',name:'Supernova',roaster:'Danelaw'}],recipes:[{id:'r0',coffeeId:'c1',method:'AeroPress',dose:'11',yield:'200',rating:6,createdAt:'2026-09-29T08:00:00Z'}]}))")
    pg.reload(); pg.wait_for_timeout(500)
    st=lambda: json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))
    pg.evaluate("state.selectedCoffeeId='c1'; openRecipeModal()"); pg.wait_for_timeout(500)
    ok('slider present, starts unrated', pg.input_value('#r-rating-range')=='0' and 'Not rated' in pg.inner_text('#r-rating-val'))
    ok('no cup buttons left', pg.locator('.star-btn').count()==0)
    # drag the slider with a real pointer
    r=pg.locator('#r-rating-range'); r.scroll_into_view_if_needed(); bb=r.bounding_box()
    pg.mouse.click(bb['x']+bb['width']*0.8, bb['y']+bb['height']/2); pg.wait_for_timeout(150)
    v=int(pg.input_value('#r-rating-range')); ok('tap on track sets value', 7<=v<=9, v)
    ok('label updates', f'{v}/10' in pg.inner_text('#r-rating-val'), pg.inner_text('#r-rating-val'))
    r.focus(); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(100)
    ok('keyboard adjusts', int(pg.input_value('#r-rating-range'))==min(10,v+1))
    pg.evaluate("setRating(8)"); pg.wait_for_timeout(100)
    pg.screenshot(path='shots/rs_light.png', clip={'x':0,'y':max(0,bb['y']-60),'width':412,'height':140})
    pg.fill('#r-dose','11'); pg.evaluate("saveRecipe()"); pg.wait_for_timeout(700); pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))"); pg.wait_for_timeout(300)
    new=[x for x in st()['recipes'] if x['id']!='r0'][0]; ok('rating saved', new.get('rating')==8, new.get('rating'))
    # next brew starts unrated again
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(400); ok('resets for next brew', pg.input_value('#r-rating-range')=='0'); pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(300)
    # edit existing brew shows its rating; can clear to Not rated
    pg.evaluate("editBrew('r0')"); pg.wait_for_timeout(500)
    ok('edit shows existing rating', pg.input_value('#r-rating-range')=='6' and '6/10' in pg.inner_text('#r-rating-val'))
    pg.evaluate("setRating(0)"); pg.evaluate("saveRecipe()"); pg.wait_for_timeout(600); pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))")
    r0=[x for x in st()['recipes'] if x['id']=='r0'][0]; ok('cleared to not rated', not r0.get('rating'), r0.get('rating'))
    # dark mode look
    pg.evaluate("toggleDarkMode(); openRecipeModal(); setRating(9)"); pg.wait_for_timeout(500)
    bb=pg.locator('#r-rating-range').bounding_box(); pg.locator('#r-rating-range').scroll_into_view_if_needed(); bb=pg.locator('#r-rating-range').bounding_box()
    pg.screenshot(path='shots/rs_dark.png', clip={'x':0,'y':max(0,bb['y']-60),'width':412,'height':140})
    b.close()
print(f"{sum(res)}/{len(res)} passed; errors {errs}"); assert all(res) and not errs; print('PASS')
