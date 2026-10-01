from playwright.sync_api import sync_playwright
import json, base64, io
from PIL import Image
import os
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
im=Image.frombytes('RGB',(400,500),os.urandom(400*500*3)); buf=io.BytesIO(); im.save(buf,'JPEG',quality=90)
photo='data:image/jpeg;base64,'+base64.b64encode(buf.getvalue()).decode()
print('photo kB', len(photo)//1024)
recs=[{'id':f'r{i}','coffeeId':'c1','method':'AeroPress','dose':'11','rating':7,'createdAt':'2026-08-%02dT07:%02d:00Z'%(i%28+1,i%60)} for i in range(70)]
seed={'coffees':[{'id':'c1','name':'Photo Coffee','labelPhoto':photo},{'id':'c2','name':'Plain'}],'recipes':recs}
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_context(**p.devices['Pixel 7']).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(900)
    ok('photo loaded into state', pg.evaluate("!!state.coffees[0].labelPhoto"))
    pg.evaluate("showView('tracker')"); pg.wait_for_timeout(600)
    n=pg.locator('#view-tracker .recipe-entry').count(); ok('H4 first page is 30 brews', n==30, n)
    size=pg.evaluate("document.body.innerHTML.length"); ok('H4 page markup stays small (<600 kB)', size<600000, size)
    ok('H4 no embedded photo data in the list', pg.evaluate("[...document.querySelectorAll('#view-tracker img')].every(i=>i.src.startsWith('blob:'))"))
    ok('H4 one shared address for the photo', pg.evaluate("new Set([...document.querySelectorAll('#view-tracker img.brew-label-thumb')].map(i=>i.src)).size")==1)
    pg.wait_for_timeout(400)
    ok('H4 thumbnails actually display', pg.evaluate("(()=>{const i=document.querySelector('#view-tracker img.brew-label-thumb'); return i.complete && i.naturalWidth===400})()"))
    btn=pg.locator('#view-tracker button:has-text("more")'); ok('H4 show-more offered', btn.count()==1 and '30 more (40 left)' in btn.inner_text().lower(), btn.inner_text() if btn.count() else '')
    btn.click(); pg.wait_for_timeout(400); ok('H4 show more -> 60', pg.locator('#view-tracker .recipe-entry').count()==60)
    pg.locator('#view-tracker button:has-text("more")').click(); pg.wait_for_timeout(400)
    ok('H4 all 70 shown, button gone', pg.locator('#view-tracker .recipe-entry').count()==70 and pg.locator('#view-tracker button:has-text("left)")').count()==0)
    # lightbox
    pg.locator('#view-tracker img.brew-label-thumb').first.click(); pg.wait_for_timeout(500)
    ok('lightbox opens with the photo', pg.locator('#modal-lightbox.open').count()==1 and pg.evaluate("(()=>{const i=document.getElementById('lightbox-img'); return i.src.startsWith('blob:') && i.naturalWidth===400})()"))
    pg.evaluate("closeModal('modal-lightbox')"); pg.wait_for_timeout(300)
    # coffee detail
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(400)
    ok('library tile uses the shared address', pg.evaluate("[...document.querySelectorAll('#view-coffees img')].every(i=>i.src.startsWith('blob:'))"))
    pg.evaluate("showCoffeeDetail('c1')"); pg.wait_for_timeout(500)
    ok('coffee page first 30 + more', pg.locator('#view-coffees .recipe-entry').count()==30 and pg.locator('#view-coffees button:has-text("left)")').count()==1)
    pg.locator('#view-coffees button:has-text("left)")').click(); pg.wait_for_timeout(500)
    ok('coffee page show more keeps you on the page', pg.locator('#view-coffees .recipe-entry').count()==60 and 'Photo Coffee' in pg.inner_text('#view-coffees'))
    # menu still works on a paged card
    old=pg.evaluate("photoUrl(state.coffees[0])")
    # change photo -> new url, old revoked
    im2=Image.new('RGB',(120,150),(200,30,30)); b2=io.BytesIO(); im2.save(b2,'JPEG'); p2='data:image/jpeg;base64,'+base64.b64encode(b2.getvalue()).decode()
    pg.evaluate("p=>{state.coffees[0].labelPhoto=p; save(); rerenderCurrentView()}", p2); pg.wait_for_timeout(600)
    new=pg.evaluate("photoUrl(state.coffees[0])"); ok('changed photo gets a new address', new!=old)
    ok('new photo displays', pg.evaluate("(()=>{const i=document.querySelector('#view-coffees img'); return i.naturalWidth===120})()"))
    ok('old address released', pg.evaluate("u=>fetch(u).then(()=>false,()=>true)", old))
    # persists via IndexedDB, not localStorage
    ok('photo not stored in localStorage', 'base64' not in pg.evaluate("localStorage.getItem('dialin_v2')"))
    pg.reload(); pg.wait_for_timeout(900); ok('photo survives reload', pg.evaluate("state.coffees[0].labelPhoto")==p2)
    # bad photo data is not rendered
    pg.evaluate("state.coffees[1].labelPhoto='javascript:alert(1)'"); ok('non-image photo value ignored', pg.evaluate("photoUrl(state.coffees[1])")=='')
    pg.evaluate("state.coffees[1].labelPhoto='data:text/html;base64,PHNjcmlwdD4='"); ok('non-image data URL ignored', pg.evaluate("photoUrl(state.coffees[1])")=='')
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res))
