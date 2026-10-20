# Log Brew is split into screens (Choose / Dial in / How was it?). Older tests act on fields
# without walking the screens, so before each interaction this opens whichever screen holds
# the element (never in score-only mode). Import it once at the top of a test.
from playwright.sync_api import Page, Locator
JS = """e => { const c = e && e.closest && e.closest('[data-brew-page]');
  if (c && c.hidden && !document.getElementById('modal-recipe').classList.contains('score-only') && typeof setBrewPage === 'function') setBrewPage(c.dataset.brewPage); }"""
def _show_loc(loc):
    try:
        if loc.count() > 0: loc.first.evaluate(JS)
    except Exception: pass
def _wrap_page(name):
    orig = getattr(Page, name)
    def f(self, selector, *a, **k):
        _show_loc(self.locator(selector)); return orig(self, selector, *a, **k)
    setattr(Page, name, f)
def _wrap_loc(name):
    orig = getattr(Locator, name)
    def f(self, *a, **k):
        _show_loc(self); return orig(self, *a, **k)
    setattr(Locator, name, f)
for n in ['fill', 'tap', 'click', 'check', 'uncheck', 'select_option', 'type', 'press', 'is_visible', 'input_value', 'inner_text', 'dispatch_event', 'is_disabled', 'is_enabled', 'get_attribute', 'eval_on_selector']:
    if hasattr(Page, n): _wrap_page(n)
for n in ['fill', 'tap', 'click', 'check', 'uncheck', 'select_option', 'type', 'press', 'scroll_into_view_if_needed', 'bounding_box', 'is_visible', 'input_value', 'inner_text', 'screenshot']:
    if hasattr(Locator, n): _wrap_loc(n)
