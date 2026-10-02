// dialed — Settings, version check, accessibility, tap handling and start-up (loaded last)
// Plain scripts sharing one global scope, loaded in order: data, core, coffee, views, tools, app.

// ==================== SETTINGS PANEL ====================
function openSettings() {
  renderOverviewCategoryOptions(); syncSuggestedStartSwitch(); applyTextSize();
  renderStorageInfo(); renderAbout();
  document.getElementById('settings-panel').classList.add('open');
  document.getElementById('settings-panel').inert = false;
  try { a11yOpened('settings-panel'); } catch(e) {}
  document.getElementById('settings-backdrop').classList.add('open');
}

const OVERVIEW_CATEGORIES = [
  { key:'country', label:'Origin Country' },
  { key:'process', label:'Process' },
  { key:'roaster', label:'Roaster' },
  { key:'roasterCountry', label:'Roaster Country' },
  { key:'varietal', label:'Varietal' },
  { key:'roastLevel', label:'Roast Level' },
];

function renderOverviewCategoryOptions() {
  const el = document.getElementById('overview-category-options');
  if (!el) return;
  const active = appSettings.overviewCategories || ['country','process','roaster','roasterCountry'];
  el.innerHTML = OVERVIEW_CATEGORIES.map(cat => `
    <label style="display:flex;align-items:center;gap:10px;margin-bottom:10px;cursor:pointer">
      <input type="checkbox" ${active.includes(cat.key)?'checked':''} data-on-change="toggleOverviewCategory('${cat.key}',this.checked)" style="width:16px;height:16px;accent-color:var(--crema)">
      <span style="font-size:13px;color:var(--text)">${cat.label}</span>
    </label>`).join('');
}

function toggleOverviewCategory(key, on) {
  let cats = appSettings.overviewCategories || ['country','process','roaster','roasterCountry'];
  if (on && !cats.includes(key)) cats.push(key);
  if (!on) cats = cats.filter(k => k !== key);
  appSettings.overviewCategories = cats;
  saveSettings();
  renderStatsDashboard();
}
function closeSettings() {
  document.getElementById('settings-panel').classList.remove('open');
  try { a11yClosed('settings-panel'); } catch(e) {}
  document.getElementById('settings-panel').inert = true;   // off-screen controls can't be tabbed to
  document.getElementById('settings-backdrop').classList.remove('open');
}



// ==================== VERSION & UPDATES ====================
const APP_VERSION = '3.31';
// The app page is fetched fresh when online, but on a slow connection the saved copy is used instead.
// version.json is tiny and never cached, so we can tell when a newer version is waiting.
async function checkForUpdate() {
  if (!location.protocol.startsWith('http')) return;
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
    const v = (await r.json()).version;
    const el = document.getElementById('update-banner');
    if (el && typeof v === 'string' && v !== APP_VERSION) { el.querySelector('.ub-text').textContent = 'Update available (v' + v + ')'; el.hidden = false; }
  } catch(e) {}
}
async function reloadForUpdate() {
  try { const reg = await navigator.serviceWorker?.getRegistration(); if (reg) await reg.update(); } catch(e) {}
  location.reload();
}
function renderAbout() {
  const el = document.getElementById('settings-about'); if (!el) return;
  el.querySelector('.about-version').textContent = 'Version ' + APP_VERSION;
  const ts = document.getElementById('text-size-row');
  if (ts && !(window.CSS && CSS.supports && CSS.supports('zoom', '1.1'))) ts.style.display = 'none';   // older Firefox ignores zoom
}

// ==================== ACCESSIBILITY ====================
// Anything tappable that isn't a real button gets a button role, a tab stop and Enter/Space;
// icon-only buttons get a spoken name; every field gets a linked label.
const A11Y_NAMES = { '✕':'Close', '×':'Close', '⋯':'More options', '···':'More options', '+':'Add', '←':'Back', '‹':'Back' };
const PRESSABLE = '.method-tab, .extraction-btn, .plan-chip';
let a11ySeq = 0;
function a11yEnhance(root) {
  root = root || document;
  root.querySelectorAll('[data-on-click]:not(button):not(a):not(input):not(select):not(textarea):not(label):not(.modal-overlay):not(.settings-backdrop):not([role])').forEach(el => {
    el.setAttribute('role', 'button');
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    if (el.tagName === 'IMG' && !el.getAttribute('aria-label')) el.setAttribute('aria-label', 'View ' + (el.alt || 'photo').toLowerCase());
  });
  root.querySelectorAll(PRESSABLE).forEach(el => {
    const on = String(el.classList.contains('selected') || el.classList.contains('active'));
    if (el.getAttribute('aria-pressed') !== on) el.setAttribute('aria-pressed', on);
  });
  root.querySelectorAll('button:not([aria-label])').forEach(b => {
    const t = b.textContent.trim();
    if (A11Y_NAMES[t]) b.setAttribute('aria-label', A11Y_NAMES[t]);
    else if (!t && b.title) b.setAttribute('aria-label', b.title);
  });
  const CTRL = 'input:not([type=hidden]):not([type=file]), select, textarea';
  root.querySelectorAll('label:not([for])').forEach(l => {
    if (l.querySelector(CTRL)) return;                       // already wraps its field
    let c = null, n = l.nextElementSibling;
    for (let i = 0; n && i < 3 && !c; i++, n = n.nextElementSibling) c = n.matches(CTRL) ? n : n.querySelector(CTRL);
    if (!c && l.parentElement) c = l.parentElement.querySelector(CTRL);
    if (!c || c.getAttribute('aria-labelledby') || (c.labels && c.labels.length)) return;
    if (!c.id) c.id = 'fld-' + (++a11ySeq);
    if (l.querySelector('[data-on-click], button')) { if (!l.id) l.id = 'lbl-' + (++a11ySeq); c.setAttribute('aria-labelledby', l.id); }
    else l.htmlFor = c.id;
  });
  root.querySelectorAll(CTRL).forEach(c => {
    if (c.getAttribute('aria-label') || c.getAttribute('aria-labelledby') || (c.labels && c.labels.length)) return;
    const name = c.placeholder || c.title || (c.id || '').replace(/^[a-z]{1,2}-/, '').replace(/[-_]/g, ' ');
    if (name) c.setAttribute('aria-label', name);
  });
}
function a11ySetupDialogs() {
  document.querySelectorAll('.modal-overlay').forEach(ov => {
    const dlg = ov.querySelector('.modal') || ov;
    dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.tabIndex = -1;
    const title = dlg.querySelector('.modal-title, [id$="-title"]');
    if (title) { if (!title.id) title.id = ov.id + '-heading'; dlg.setAttribute('aria-labelledby', title.id); }
    else dlg.setAttribute('aria-label', ov.id === 'modal-lightbox' ? 'Bag label photo' : 'Dialog');
  });
  const sp = document.getElementById('settings-panel');
  if (sp) { sp.setAttribute('role', 'dialog'); sp.setAttribute('aria-modal', 'true'); sp.setAttribute('aria-label', 'Settings'); sp.tabIndex = -1; sp.inert = !sp.classList.contains('open'); }
}
const modalStack = [], modalReturnFocus = {};
function dialogEl(id) { const ov = document.getElementById(id); return ov && (ov.matches('[role="dialog"]') ? ov : ov.querySelector('[role="dialog"]') || ov); }
function a11yOpened(id) {
  const d = dialogEl(id); if (!d) return;
  const i = modalStack.indexOf(id); if (i >= 0) modalStack.splice(i, 1);
  modalStack.push(id);
  const a = document.activeElement;
  if (!d.contains(a)) { modalReturnFocus[id] = a; try { d.focus({ preventScroll: true }); } catch(e) {} }
}
function a11yClosed(id) {
  const i = modalStack.indexOf(id); if (i >= 0) modalStack.splice(i, 1);
  const back = modalReturnFocus[id]; delete modalReturnFocus[id];
  const d = dialogEl(id);
  if (!d || !d.contains(document.activeElement)) return;      // focus has already moved on
  try { document.activeElement.blur(); } catch(e) {}
  // Never put focus back into a text field: on a phone that would pop the keyboard up
  if (back && back.isConnected && !/^(INPUT|TEXTAREA|SELECT)$/.test(back.tagName) && back !== document.body) { try { back.focus({ preventScroll: true }); } catch(e) {} }
}
function topDialogId() {
  for (let i = modalStack.length - 1; i >= 0; i--) {
    const el = document.getElementById(modalStack[i]);
    if (el && el.classList.contains('open')) return modalStack[i];
  }
  return null;
}
document.addEventListener('keydown', e => {
  const t = e.target;
  if ((e.key === 'Enter' || e.key === ' ') && t && t.getAttribute && t.getAttribute('role') === 'button' && !/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) {
    e.preventDefault(); t.click(); return;
  }
  const id = topDialogId(); if (!id) return;
  if (e.key === 'Escape') { e.preventDefault(); if (id === 'settings-panel') closeSettings(); else if (id === 'brew-mode') closeBrewMode(); else closeModal(id); return; }
  if (e.key !== 'Tab') return;
  const d = dialogEl(id);
  const f = [...d.querySelectorAll('button, [href], input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && el.offsetParent !== null);
  if (!f.length) { e.preventDefault(); return; }
  const first = f[0], last = f[f.length - 1], a = document.activeElement;
  if (!d.contains(a) || a === d) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
  else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
});
let a11yQueued = false;
function a11yQueue() { if (a11yQueued) return; a11yQueued = true; setTimeout(() => { a11yQueued = false; try { a11yEnhance(); } catch(e) {} }, 0); }
a11ySetupDialogs(); a11yEnhance();
document.addEventListener('DOMContentLoaded', () => { a11ySetupDialogs(); a11yEnhance(); });   // the settings panel and tab bar come later in the page
new MutationObserver(a11yQueue).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

// ==================== ACTIONS (tap/input handlers) ====================
// Markup carries handlers in data-on-click / data-on-input / … attributes, written as a short list of calls. Nothing in the page is ever run as
// script (the content policy forbids it): this reads the attribute, and only calls functions on the list below,
// with plain values (text, numbers, true/false/null, this, event, this.value, this.checked, this.src).
function hidePhotoError(andSave) { document.getElementById('photo-error-banner').style.display = 'none'; if (andSave) save(); }
function hideCompareSection() { document.getElementById('grinder-compare-section').style.display = 'none'; }
function pickLabelPhoto() { document.getElementById('c-label-input').click(); }
function pickRestoreFile() { document.getElementById('restore-input').click(); closeSettings(); }
function fabNewCustomRecipe() {
  closeModal('modal-fab'); showView('recipes');
  setTimeout(() => { const b = document.querySelector('#recipe-tab-bar .type-btn:last-child'); switchRecipeTab('custom', b); openNewCustomRecipe(); }, 100);
}
function confirmUndoRestore() {
  confirmAction({ title:'Undo last restore?', text:'Brings back the data that the last restore replaced.' + (restoreUndo ? '' : ' Label photos from before the restore can no longer be recovered.'), button:'Undo restore', onYes:undoRestore });
}
function removeStepRow(el) { el.closest('.step-row').remove(); renumberSteps(); }
function snoozeBackupReminder() { appSettings.backupSnoozeUntil = Date.now() + 7*86400000; saveSettings(); renderBackupReminder(); }
function clearCompare() { state.compareIds = []; save(); updateCompareBar(); renderCompare(); }
function hideParent(el) { el.parentElement.hidden = true; }

const ACTIONS = { openBrewMode, minimiseBrewMode, stopBrewFromMode, confirmCancelBrew, addRecipeStep, applyBrewSuggestion, backupData, brewPlan, clearCompare, closeModal, closeSettings, confirmDeleteBrew, confirmDeleteCoffee, confirmDeleteCustomRecipe, confirmUndoRestore, dismissLoadProblem, dismissPlan, duplicateRecipe, editBrew, endLongPress, exportUnreadable, fabNewCustomRecipe, filterGrinders, filterRecipeMethod, fxFor, goBackToCoffees, handleLabelPhoto, hideCompareSection, hideEditOverlay, hideParent, hidePhotoError, keyMovePlan, onRecipeChange, onTasteInput, openEditCoffee, openEditCustomRecipe, openFab, openLightbox, openLightboxFor, openModal, openNewCustomRecipe, openPlanNext, openRecipeModal, openSettings, pickLabelPhoto, pickRestoreFile, reloadForUpdate, removeLabelPhoto, removeStepRow, renderCompare, renderGrinders, renderTracker, reopenBrewSheet, repeatBrew, resetBrewTimer, resetCoffeeModal, resetTaste, restoreData, saveCoffee, saveCustomRecipe, saveFinishBag, savePlan, saveRecipe, selectExtraction, selectMethod, setCoffeeLayout, setCoffeeRating, setFinishAgain, setFinishRating, setPlanDir, setRating, setStatsPeriod, setTasteSlider, setTextSize, setTrackerSort, showAllBrews, showCoffeeDetail, showEditOverlay, showGrinderDetail, showMoreBrews, showToast, showTrendModal, showView, slidePlan, snoozeBackupReminder, startLongPress, startPlanDrag, switchRecipeTab, toggleBackupPhotos, toggleBrewHistory, toggleBrewTimer, toggleCompare, toggleCustomProcess, toggleDarkMode, toggleFavourite, toggleFinishedBag, toggleOverviewCategory, toggleShowCosts, toggleSuggestedStart, updateBrewLive, updateGrindMicrons, updateGrinderConverter, updatePricePreview, useBrewSettings };
const ACTION_EVENTS = ['click', 'input', 'change', 'touchstart', 'touchend', 'touchcancel', 'contextmenu', 'pointerdown', 'keydown'];
const actionCache = new Map();
function splitOutsideQuotes(str, sep) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "'") q = !q;
    if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur); return out;
}
function parseActionArg(a) {
  a = a.trim();
  if (a.length >= 2 && a[0] === "'" && a[a.length - 1] === "'") return { v: a.slice(1, -1) };
  if (/^-?\d+(\.\d+)?$/.test(a)) return { v: Number(a) };
  if (a === 'null') return { v: null };
  if (a === 'true') return { v: true };
  if (a === 'false') return { v: false };
  if (a === 'this' || a === 'event') return { ref: a };
  if (a === 'this.value' || a === 'this.checked' || a === 'this.src') return { prop: a.slice(5) };
  throw new Error('unsupported value: ' + a);
}
function parseAction(code) {
  if (actionCache.has(code)) return actionCache.get(code);
  let steps = [];
  try {
    for (const raw of splitOutsideQuotes(code, ';')) {
      const st = raw.trim(); if (!st) continue;
      if (st === 'return false') { steps.push({ prevent: true }); continue; }
      if (st === 'event.stopPropagation()') { steps.push({ stop: true }); continue; }
      const m = st.match(/^([A-Za-z_]\w*)\(([\s\S]*)\)$/);
      if (!m || !Object.prototype.hasOwnProperty.call(ACTIONS, m[1])) throw new Error('unknown action: ' + st);
      steps.push({ fn: ACTIONS[m[1]], args: m[2].trim() ? splitOutsideQuotes(m[2], ',').map(parseActionArg) : [] });
    }
  } catch (e) { console.error('Ignored handler "' + code + '":', e.message); steps = null; }
  actionCache.set(code, steps); return steps;
}
function runActions(e) {
  const attr = 'data-on-' + e.type;
  // Innermost element first, like normal event bubbling; event.stopPropagation() in a handler stops the walk
  for (const el of e.composedPath()) {
    if (!el.getAttribute) continue;
    const code = el.getAttribute(attr); if (code === null) continue;
    const steps = parseAction(code); if (!steps) continue;
    let stopped = false;
    for (const st of steps) {
      if (st.prevent) { e.preventDefault(); continue; }
      if (st.stop) { stopped = true; continue; }
      st.fn.apply(el, st.args.map(a => 'v' in a ? a.v : a.ref === 'this' ? el : a.ref === 'event' ? e : el[a.prop]));
    }
    if (stopped || e.cancelBubble) break;
  }
}
ACTION_EVENTS.forEach(t => document.addEventListener(t, runActions, /^touch/.test(t) ? { passive: true } : false));

// ==================== INIT (runs last, after every declaration) ====================
load();
loadSettings();
showLoadProblem();
requestPersistence();
if (showCosts() && needsFx()) refreshFx();
loadPhotos();
renderDashboard();
updateCompareBar();
// A second entry means the phone's Back button is always caught by the app first (closing a sheet or brew mode)
// instead of leaving it straight away on a fresh launch
try { history.replaceState({view:'dashboard'}, '', ''); history.pushState({view:'dashboard'}, '', ''); } catch(e) {}
// Offline support (only over http/https — e.g. GitHub Pages)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW registration failed', e)); checkForUpdate(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate(); });
}
