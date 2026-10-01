from playwright.sync_api import sync_playwright
import json
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    countries=['Colombia']*4+['Ethiopia']*3+['Kenya']*2+['Ecuador','Brazil','Peru','Rwanda','Burundi','Panama']
    cfs=[{'id':f'c{i}','name':f'Coffee {i}','roaster':['Square Mile','Dak','Ninth','Rave'][i%4],'country':c,'process':['Washed','Natural','Honey','Anaerobic'][i%4],'createdAt':'2026-09-01T00:00:00Z'} for i,c in enumerate(countries)]
    rs=[{'id':f'r{i}','coffeeId':f'c{i}','method':'V60','createdAt':'2026-09-20T00:00:00Z'} for i in range(len(cfs))]
    pg.evaluate(f"localStorage.setItem('dialin_v2', JSON.stringify({json.dumps({'coffees':cfs,'recipes':rs})}))")
    pg.reload(); pg.wait_for_timeout(600); pg.evaluate("showView('tracker')"); pg.wait_for_timeout(500)
    cols=pg.evaluate("[...document.querySelectorAll('#stats-dashboard [title]')].slice(0,8).map(e=>e.title+' '+getComputedStyle(e).backgroundColor)"); print(cols)
    pg.evaluate("document.querySelector('#stats-dashboard').scrollIntoView()"); pg.wait_for_timeout(200); pg.screenshot(path='shots/bars_light.png')
    pg.evaluate("toggleDarkMode()"); pg.wait_for_timeout(300)
    cols2=pg.evaluate("[...document.querySelectorAll('#stats-dashboard [title]')].slice(0,2).map(e=>getComputedStyle(e).backgroundColor)"); print(cols2); assert cols2[0]!=cols[0].split(' ',2)[-1]
    pg.evaluate("document.querySelector('#stats-dashboard').scrollIntoView()"); pg.wait_for_timeout(200); pg.screenshot(path='shots/bars_dark.png')
    b.close()
print(errs); assert not errs; print('PASS')
