#!/usr/bin/env python3
"""Runs every browser test against a local copy of the app.

    pip install playwright pillow && playwright install chromium
    python tests/run_all.py            # all suites
    python tests/run_all.py safety a11y   # just these

Each suite opens the app in a phone-sized Chromium (Pixel 7), seeds its own data and checks behaviour.
Exit code is non-zero if any check fails.
"""
import os, subprocess, sys, tempfile, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PORT = 8765
SUITES = ['basics', 'taps', 'safety', 'inject', 'behave', 'photos', 'a11y', 'hygiene', 'cost', 'del', 'ext', 'plan', 'grid', 'var',
          'same', 'decaf', 'order', 'bars', 'group', 'quick', 'zoom', 'motion', 'motion:reduce', 'finish', 'menu', 'rating',
          'tileb', 'rslider', 'taste', 'brewcard', 'hist', 'rwidth']

def main():
    wanted = sys.argv[1:] or SUITES
    os.makedirs(os.path.join(HERE, 'shots'), exist_ok=True)
    site = tempfile.mkdtemp()
    os.symlink(ROOT, os.path.join(site, 'dialed'))          # the tests load http://localhost:8765/dialed/index.html
    server = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=site, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try: urllib.request.urlopen(f'http://localhost:{PORT}/dialed/index.html', timeout=1); break
            except Exception: time.sleep(0.2)
        else:
            print('Could not start the local server'); return 1
        failed = []
        def run(s):
            name, _, arg = s.partition(':')
            try:
                r = subprocess.run([sys.executable, name + '.py'] + ([arg] if arg else []), cwd=HERE, capture_output=True, text=True,
                                   timeout=400, env={**os.environ, 'DIALED_ROOT': ROOT})
                out, rc = r.stdout + r.stderr, r.returncode
            except subprocess.TimeoutExpired:
                out, rc = 'timed out', 1
            return out, rc != 0 or any(l.startswith('FAIL') for l in out.splitlines())
        ci = bool(os.environ.get('GITHUB_ACTIONS'))
        def note(level, s, out):   # shows on the GitHub run summary without opening the log
            if ci:
                lines = [l for l in out.splitlines() if l.startswith('FAIL')] or out.splitlines()[-3:]
                print(f"::{level} title={s}::" + ' | '.join(lines)[:900].replace('%', '%25'))
        for s in wanted:
            t0 = time.time()
            out, bad = run(s)
            if bad:                 # timing-sensitive browser checks: one more go before calling it a failure
                first = out; out, bad = run(s)
                if not bad:
                    print(f"ok   {s:14s} {time.time() - t0:5.1f}s  (passed on a second attempt)"); note('warning', s + ' needed a second attempt', first); continue
            print(f"{'FAIL' if bad else 'ok  '} {s:14s} {time.time() - t0:5.1f}s")
            if bad:
                failed.append(s); print('\n'.join('     ' + l for l in out.splitlines()[-25:])); note('error', s, out)
        print(f"\n{len(wanted) - len(failed)}/{len(wanted)} suites passed" + (f" — failed: {', '.join(failed)}" if failed else ''))
        return 1 if failed else 0
    finally:
        server.terminate()

if __name__ == '__main__':
    sys.exit(main())
