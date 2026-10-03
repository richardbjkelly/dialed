from playwright.sync_api import sync_playwright
import json, tempfile
errs=[]; res=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
def fresh(b, seed=None, settings=None, raw=None):
    pg=b.new_context(**p.devices['Pixel 7'], accept_downloads=True).new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html')
    if raw is not None: pg.evaluate("(v)=>localStorage.setItem('dialin_v2', v)", raw)
    elif seed is not None: pg.evaluate(f"localStorage.setItem('dialin_v2', JSON.stringify({json.dumps(seed)}))")
    pg.evaluate(f"localStorage.setItem('dialin_settings', JSON.stringify({json.dumps(settings or {})}))")
    pg.reload(); pg.wait_for_timeout(500); return pg
st=lambda pg: json.loads(pg.evaluate("localStorage.getItem('dialin_v2')"))
def restore(pg, obj):
    f=tempfile.NamedTemporaryFile('w',suffix='.json',delete=False); f.write(obj if isinstance(obj,str) else json.dumps(obj)); f.close()
    pg.locator('#restore-input').set_input_files(f.name); pg.wait_for_timeout(500)
MINE={'coffees':[{'id':'mine','name':'Mine'}],'recipes':[{'id':'b1','coffeeId':'mine','method':'AeroPress','dose':'11','createdAt':'2026-10-01T07:00:00Z'}]}
with sync_playwright() as p:
    b=p.chromium.launch()
    # C1: malformed backups are rejected, nothing changes
    for label,bad in [('coffees null',{'state':{'coffees':None,'recipes':'oops'}}),('recipes string',{'state':{'coffees':[],'recipes':'oops'}}),('no state',{'foo':1}),('not json','{{{'),('array',[1,2])]:
        pg=fresh(b,MINE); restore(pg,bad)
        ok(f'C1 rejected: {label}', st(pg)['coffees'][0]['name']=='Mine' and pg.locator('#modal-confirm-delete.open').count()==0)
        pg.reload(); pg.wait_for_timeout(400); ok(f'C1 app still starts: {label}', pg.inner_text('#stat-coffees')=='1'); pg.close()
    # valid restore asks first; cancel keeps data; confirm replaces; undo brings it back; settings restored
    good={'app':'dialed','version':3,'exportedAt':'2026-09-30T10:00:00Z','state':{'coffees':[{'id':'x1','name':'Restored A'},{'id':'x2','name':'Restored B'}],'recipes':[]},'settings':{'darkMode':True,'textSize':'large'}}
    pg=fresh(b,MINE); restore(pg,good)
    ok('restore asks for confirmation', pg.locator('#modal-confirm-delete.open').count()==1)
    t=pg.inner_text('#confirm-delete-subtitle').lower(); ok('confirmation states counts', '2 coffees' in t and '1 coffee and 1 brew' in t, t)
    pg.click('#modal-confirm-delete .btn-secondary'); pg.wait_for_timeout(400); ok('cancel keeps data', st(pg)['coffees'][0]['name']=='Mine')
    restore(pg,good); pg.click('#confirm-delete-btn'); pg.wait_for_timeout(600)
    ok('confirm replaces data', [c['name'] for c in st(pg)['coffees']]==['Restored A','Restored B'])
    ok('settings restored', pg.evaluate("document.body.classList.contains('dark-mode')") and pg.evaluate("appSettings.textSize")=='large')
    ok('overview refreshed', pg.inner_text('#stat-coffees')=='2')
    pg.evaluate("openSettings(); SETTINGS_SECTIONS.forEach(k=>setSettingsSection(k,true))"); pg.wait_for_timeout(300); ok('undo offered', pg.locator('#storage-info >> text=Undo last restore').count()==1)
    pg.evaluate("undoRestore()"); pg.wait_for_timeout(500); ok('undo brings data back', st(pg)['coffees'][0]['name']=='Mine' and len(st(pg)['recipes'])==1)
    pg.close()
    # old-format backup (v2) still accepted
    pg=fresh(b,{'coffees':[],'recipes':[]}); restore(pg,{'state':MINE,'customRecipes':[],'version':'dialin_v2'}); pg.click('#confirm-delete-btn'); pg.wait_for_timeout(500)
    ok('old backup format accepted', st(pg)['coffees'][0]['name']=='Mine'); pg.close()
    # H2: hostile ids are replaced and references kept
    evil={'state':{'coffees':[{'id':"x');window.__idxss=1;('", 'name':'Nice'}],'recipes':[{'id':'<b>','coffeeId':"x');window.__idxss=1;('",'method':'AeroPress','createdAt':'2026-10-01T07:00:00Z'}]}}
    pg=fresh(b,{'coffees':[],'recipes':[]}); restore(pg,evil); pg.click('#confirm-delete-btn'); pg.wait_for_timeout(500)
    s=st(pg); cid=s['coffees'][0]['id']; ok('H2 hostile id replaced', all(ch.isalnum() or ch in '_-' for ch in cid), cid)
    ok('H2 brew still linked to its coffee', s['recipes'][0]['coffeeId']==cid)
    pg.evaluate("showView('coffees')"); pg.wait_for_timeout(300); pg.locator('#coffees-list .coffee-card').first.click(); pg.wait_for_timeout(400)
    ok('H2 no code ran on tap', pg.evaluate("window.__idxss||0")==0); pg.close()
    # H3: corrupt storage -> warning, copy kept, later saves don't destroy the copy
    raw='{"coffees":[{"id":"c1","name":"Precious"}],"recipes":['
    pg=fresh(b,raw=raw)
    ok('H3 warning shown', pg.is_visible('#load-error-banner'))
    ok('H3 copy kept', pg.evaluate("localStorage.getItem('dialin_v2_corrupt')")==raw)
    pg.evaluate("state.coffees.unshift({id:'n1',name:'New'}); save()"); ok('H3 copy survives next save', 'Precious' in pg.evaluate("localStorage.getItem('dialin_v2_corrupt')"))
    with pg.expect_download() as d: pg.click('#load-error-banner >> text=Export the copy')
    ok('H3 unreadable data can be exported', 'Precious' in open(d.value.path()).read()); pg.close()
    # wrong types in storage don't brick the app
    pg=fresh(b,raw='{"coffees":null,"recipes":"x"}'); ok('bad types in storage: app starts with warning', pg.is_visible('#load-error-banner') and pg.inner_text('#stat-coffees')=='0'); pg.close()
    # C2: editing a brew on a finished bag keeps its coffee
    pg=fresh(b,{'coffees':[{'id':'active','name':'Active'},{'id':'done','name':'Done','finishedBag':True}],'recipes':[{'id':'r1','coffeeId':'done','method':'AeroPress','dose':'11','createdAt':'2026-10-01T07:00:00Z'}]})
    pg.evaluate("editBrew('r1')"); pg.wait_for_timeout(500)
    ok('C2 finished coffee shown and selected when editing', pg.locator('#coffee-selector .coffee-selector-item.selected').inner_text().startswith('Done'))
    pg.fill('#r-notes','edited'); pg.evaluate("saveRecipe()"); pg.wait_for_timeout(600)
    r=st(pg)['recipes'][0]; ok('C2 brew stays on its coffee', r['coffeeId']=='done' and r['notes']=='edited', r)
    pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))"); pg.wait_for_timeout(300)
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(400); ok('C2 new brews still exclude finished bags', pg.locator('#coffee-selector .coffee-selector-item').count()==1); pg.close()
    # backup: contents, settings, no transient keys, photos switch
    pg=fresh(b,MINE,{'showCosts':False})
    with pg.expect_download() as d: pg.evaluate("backupData()")
    data=json.load(open(d.value.path()))
    ok('backup has settings + version', data.get('version')==3 and data.get('settings',{}).get('showCosts')==False)
    ok('backup has no screen state', not any(k in data['state'] for k in ['currentView','selectedExtraction','selectedRating']))
    pg.evaluate("state.coffees[0].labelPhoto='data:image/png;base64,AAAA'; toggleBackupPhotos()")
    with pg.expect_download() as d: pg.evaluate("backupData()")
    data=json.load(open(d.value.path())); ok('photos can be left out of backup', 'labelPhoto' not in data['state']['coffees'][0] and data['photosIncluded']==False); pg.close()
    # L1 + existing data untouched
    pg=fresh(b,{'coffees':[{'id':'1759300000000','name':'Old style id'}],'recipes':[{'id':'1759300000001','coffeeId':'1759300000000','method':'AeroPress','dose':'11'}]})
    ok('L1 no "Invalid Date"', 'Invalid Date' not in pg.inner_text('body') and 'Unknown date' in pg.inner_text('body'))
    pg.evaluate("save()"); ok('existing ids unchanged by validation', st(pg)['coffees'][0]['id']=='1759300000000' and st(pg)['recipes'][0]['coffeeId']=='1759300000000'); pg.close()
    b.close()
print(f"{sum(res)}/{len(res)} passed; errors {errs}"); assert all(res) and not errs; print('PASS')
