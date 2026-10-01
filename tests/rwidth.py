from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    for size in ['default','xlarge','small']:
        pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('http://localhost:8765/dialed/index.html')
        pg.evaluate(f"localStorage.setItem('dialin_v2', JSON.stringify({{coffees:[{{id:'c1',name:'S'}}],recipes:[]}})); localStorage.setItem('dialin_settings', JSON.stringify({{textSize:'{size}'}}))"); pg.reload(); pg.wait_for_timeout(400)
        pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(400)
        widths=set(); clipped=[]
        for n in range(0,11):
            pg.evaluate(f"setRating({n})")
            widths.add(round(pg.locator('#r-rating-range').bounding_box()['width']))
            if pg.evaluate("(()=>{const w=document.querySelector('#r-rating-val .rs-word');return w.scrollWidth>w.clientWidth+1})()"): clipped.append(n)
        print(size, 'slider widths', widths, 'clipped words', clipped); assert len(widths)==1 and not clipped
        if size=='default':
            for n in (0,3,10):
                pg.evaluate(f"setRating({n})"); pg.locator('#r-rating-range').scroll_into_view_if_needed(); bb=pg.locator('.rating-slider').bounding_box()
                pg.screenshot(path=f'shots/rw_{n}.png', clip={'x':0,'y':bb['y']-36,'width':412,'height':bb['height']+46})
        pg.close()
    b.close()
print(errs); assert not errs; print('PASS')
