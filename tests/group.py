from playwright.sync_api import sync_playwright
import json
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    countries=['Colombia']*4+['Ethiopia']*3+['Kenya']*2+['Ecuador','Brazil','Peru','Rwanda','Burundi','Panama','Guatemala','Yemen','Indonesia','Atlantis']
    procs=['Washed','Fully Washed','Natural','Honey','Anaerobic Natural','Carbonic Maceration','Thermal Shock','EA','Swiss Water','Wet-hulled','Red Honey','Co-ferment','Natural','Washed','Washed','Washed','Natural','Mystery']
    cfs=[{'id':f'c{i}','name':f'Coffee {i}','roaster':'R'+str(i%3),'country':c,'process':procs[i % len(procs)],'createdAt':'2026-09-01T00:00:00Z'} for i,c in enumerate(countries)]
    pg.evaluate(f"localStorage.setItem('dialin_v2', JSON.stringify({json.dumps({'coffees':cfs,'recipes':[]})}))")
    pg.reload(); pg.wait_for_timeout(600); pg.evaluate("showView('tracker')"); pg.wait_for_timeout(500)
    txt=pg.inner_text('#stats-dashboard'); 
    import re
    for sec in ['ORIGIN COUNTRY','PROCESS','ROASTER']:
        i=txt.find(sec); print(txt[i:i+420].replace('\n',' | ')); print('---')
    assert 'Grouped by region · 13 countries' in txt and 'Grouped by process family' in txt
    # expand a group
    pg.locator('.stack-group summary').first.click(); pg.wait_for_timeout(200)
    print('opened:', pg.locator('.stack-group[open]').first.inner_text().replace('\n',' | '))
    pg.evaluate("document.querySelector('#stats-dashboard').scrollIntoView()"); pg.wait_for_timeout(200)
    pg.screenshot(path='shots/group.png')
    pg.evaluate("toggleDarkMode()"); pg.wait_for_timeout(300); pg.evaluate("document.querySelector('#stats-dashboard').scrollIntoView()"); pg.screenshot(path='shots/group_dark.png')
    b.close()
print(errs); assert not errs; print('PASS')
