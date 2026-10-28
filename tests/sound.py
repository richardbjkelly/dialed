# Brew sounds: off by default; beeps at 3, 2, 1 before each timed step and a chime as it starts (also while minimised)
from playwright.sync_api import sync_playwright
import json, sys
res=[]; errs=[]
def ok(n,c,i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)
STUB = """window.__tones=[]; class FakeCtx { constructor(){ this.state='running'; this.currentTime=0; this.destination={}; }
  resume(){ this.state='running'; return Promise.resolve(); }
  createOscillator(){ const o={type:'',frequency:{value:0},connect:(g)=>g,start:()=>window.__tones.push(o.frequency.value),stop:()=>{}}; return o; }
  createGain(){ return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect:(d)=>d}; } }
window.AudioContext=FakeCtx;"""
seed={'coffees':[{'id':'c1','name':'Alpha','roaster':'R'}],'recipes':[]}
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(**p.devices['Pixel 7']); ctx.add_init_script(STUB); pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/dialed/index.html'); pg.evaluate("s=>localStorage.setItem('dialin_v2', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(600)
    def run(at):   # put the brew at `at` seconds and tick
        pg.evaluate(f"brewTimer.startedAt=Date.now()-{at}*1000; renderBrewTimer()")
    def tones(): return pg.evaluate("window.__tones.splice(0)")
    pg.evaluate("state.selectedCoffeeId='c1'; state.selectedMethod='AeroPress'; state.selectedRecipeId='aeropress-hoffmann'; openRecipeModal(); setBrewPage('dial')"); pg.wait_for_timeout(300)
    pg.evaluate("toggleBrewTimer(); clearInterval(brewTimer.tick)"); pg.wait_for_timeout(200)
    for t in [0,7,8,9,10]: run(t)
    ok('off by default: no sound at all', tones()==[] and pg.evaluate("appSettings.brewSound")!=True)
    pg.evaluate("stopBrewTimer(); closeBrewMode(); resetBrewTimer()"); pg.evaluate("openSettings()"); pg.wait_for_timeout(300)
    pg.tap('#settings-brewsound-switch'); pg.wait_for_timeout(200)
    ok('Settings switch turns it on and plays a sample chime', pg.get_attribute('#settings-brewsound-switch','aria-checked')=='true' and tones()==[784,1175])
    pg.evaluate("closeSettings()"); pg.wait_for_timeout(300)
    pg.evaluate("toggleBrewTimer(); clearInterval(brewTimer.tick)"); pg.wait_for_timeout(200)
    run(0); ok('starting the brew: silent', tones()==[])
    for t in [6,7,8,9]: run(t)
    ok('3, 2, 1 before the 0:10 step: three beeps', tones()==[880,880,880])
    run(10); ok('step starts: chime', tones()==[784,1175])
    run(10); run(11); ok('no repeats while the step runs', tones()==[])
    pg.evaluate("closeBrewMode()"); pg.wait_for_timeout(200)
    for t in [117,118,119,120]: run(t)
    ok('minimised: still beeps and chimes for the 2:00 step', tones()==[880,880,880,784,1175])
    for t in [148,150,160]: run(t)
    ok('last step (2:30): beep, chime, then quiet', tones()==[880,784,1175])
    for t in [177,178,179,180,190]: run(t)
    ok('finish (3:00, "press over 30 seconds"): 3, 2, 1 and a chime, then quiet', tones()==[880,880,880,784,1175])
    pg.evaluate("stopBrewTimer()"); run(170)
    ok('stopped: silent', tones()==[])
    pg.evaluate("resetBrewTimer(); state.selectedRecipeId=null; toggleBrewTimer(); clearInterval(brewTimer.tick)")
    for t in [0,5,10,60]: run(t)
    ok('no timed recipe: silent', tones()==[])
    ok('setting is remembered', json.loads(pg.evaluate("localStorage.getItem('dialin_settings')")).get('brewSound') is True)
    ok('no page errors', not errs, errs)
print(sum(res),'/',len(res)); sys.exit(0 if all(res) else 1)
