from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    pg.evaluate("""localStorage.setItem('dialin_v2', JSON.stringify({coffees:[{id:'c1',name:'Bean',roaster:'R'}],recipes:[]}))""")
    pg.reload(); pg.wait_for_timeout(500)
    shots=[]
    for dark in (False, True):
        if dark: pg.evaluate("toggleDarkMode()")
        pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(400)
        for v in ('under','good','over'):
            pg.evaluate(f"selectExtraction('{v}')"); pg.wait_for_timeout(100)
            el=pg.locator('.extraction-btn.'+v); el.scroll_into_view_if_needed()
            bg=el.evaluate("e=>getComputedStyle(e).backgroundColor"); other=pg.locator('.extraction-btn:not(.selected)').first.evaluate("e=>getComputedStyle(e).backgroundColor")
            print('dark' if dark else 'light', v, bg, 'unselected', other); assert bg!=other
            box=pg.locator('.extraction-btn.good').locator('..').bounding_box()
            f=f'shots/ext_{int(dark)}_{v}.png'; pg.screenshot(path=f, clip={'x':0,'y':box['y']-8,'width':412,'height':box['height']+16}); shots.append(f)
        pg.evaluate("closeModal('modal-recipe')"); pg.wait_for_timeout(300)
    b.close()
print(errs)
