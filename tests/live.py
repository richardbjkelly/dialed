#!/usr/bin/env python3
"""Checks the published site (not a local copy): right version is live, real taps work, it runs offline.

    python tests/live.py                      # https://richardbjkelly.github.io/dialed/
    DIALED_URL=https://example.com/ python tests/live.py
"""
import json, os, re, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
URL = os.environ.get('DIALED_URL', 'https://richardbjkelly.github.io/dialed/')
if not URL.endswith('/'): URL += '/'
want = re.search(r"const APP_VERSION = '([^']+)'", open(os.path.join(ROOT, 'js', 'app.js'), encoding='utf8').read()).group(1)
res = []
def ok(n, c, i=''):
    res.append(bool(c)); print(('ok  ' if c else 'FAIL'), n, '' if c else i)

# 1. the published version matches this commit (allow a few minutes for the deploy to reach the CDN)
live = None
for _ in range(30):
    try: live = json.load(urllib.request.urlopen(URL + 'version.json?t=%d' % time.time(), timeout=15))['version']
    except Exception as e: live = 'unreachable: %s' % e
    if live == want: break
    time.sleep(10)
ok(f'live site is serving v{want}', live == want, live)

errs, cons, failed = [], [], []
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(**p.devices['Pixel 7']); pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: cons.append(m.text))
    pg.on('response', lambda r: failed.append('%s %s' % (r.status, r.url)) if r.status >= 400 else None)
    pg.goto(URL); pg.wait_for_timeout(1500)
    ok('page starts and shows the same version', pg.evaluate("typeof APP_VERSION === 'string' ? APP_VERSION : null") == want)
    ok('every file the page asks for is found', not failed, failed[:5])
    ok('styles applied', pg.evaluate("getComputedStyle(document.querySelector('.bottom-nav')).position") == 'fixed')
    ok('fonts load from the site', pg.evaluate("document.fonts.ready.then(() => document.fonts.check('12px \"Space Mono\"') && document.fonts.check('600 16px \"Space Grotesk\"'))"))
    ok('manifest and icons resolve', pg.evaluate("""fetch(document.querySelector('link[rel=manifest]').href).then(r => r.json()).then(m => Promise.all(m.icons.map(i => fetch(new URL(i.src, document.querySelector('link[rel=manifest]').href)).then(r => r.ok))).then(a => a.every(Boolean)))"""))
    ok('service worker installs', pg.evaluate("navigator.serviceWorker.ready.then(r => !!r.active)"))
    pg.wait_for_timeout(2500)
    ctx.set_offline(True); pg.reload(); pg.wait_for_timeout(1500)
    ok('runs offline after the first visit', pg.evaluate("typeof showView === 'function' && typeof ACTIONS === 'object' && getComputedStyle(document.querySelector('.bottom-nav')).position === 'fixed'"))
    ctx.set_offline(False)
    blocked = [c for c in cons if 'Content Security Policy' in c]
    ok('nothing blocked by the content policy', not blocked, blocked[:3])
    ok('no page errors', not errs, errs[:3])
    b.close()

# 2. the real-tap walkthrough (add a coffee, log a brew, menus, settings) against the live address
r = subprocess.run([sys.executable, os.path.join(HERE, 'taps.py')], capture_output=True, text=True, timeout=400, env={**os.environ, 'DIALED_URL': URL})
bad = r.returncode != 0 or any(l.startswith('FAIL') for l in r.stdout.splitlines())
ok('tap-through on the live site', not bad, '\n' + (r.stdout + r.stderr)[-1500:])
print(sum(res), '/', len(res)); sys.exit(0 if all(res) else 1)
