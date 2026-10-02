# Tests

Browser tests for dialed. Each file opens the app in a phone-sized Chromium, seeds its own data and checks behaviour.

    pip install playwright pillow
    playwright install chromium
    python tests/run_all.py

Run a subset with `python tests/run_all.py safety a11y`. Screenshots some suites take go to `tests/shots/` (not committed).
The same command runs on every push (see `.github/workflows/tests.yml`).

`python tests/live.py` checks the published site instead of a local copy: version, files, fonts, offline and a real tap-through.
It runs automatically after each GitHub Pages deploy (`.github/workflows/live.yml`).

| Suite | Covers |
|---|---|
| safety | loading/restoring damaged or hostile data, backup, undo restore |
| inject | user text is always shown as text, never run |
| behave | refresh after delete, validation, double-tap, timer pill, back button |
| photos | label photos, paged brew lists |
| a11y | keyboard use, dialogs, labels, text size |
| hygiene | version, fonts, content policy, prices and exchange rates, update prompt |
| others | one per feature (library layouts, plan next, insights bars, finish bag, brew cards, …) |
