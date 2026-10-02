// dialed — Saved state, data validation, navigation and form controls
// Plain scripts sharing one global scope, loaded in order: data, core, coffee, views, tools, app.

// ==================== STATE ====================
let state = {
  coffees: [], recipes: [],
  selectedCoffeeId: null, selectedGrinderId: null,
  selectedMethod: 'Espresso', selectedExtraction: '', selectedRating: 0,
  currentView: 'dashboard', compareIds: [], favouriteGrinderId: null, selectedRecipeId: null, customRecipes: [], plannedBrews: [],
};
let currentGrinderFilter = 'all';

// Photos live in IndexedDB (large quota); everything else in localStorage (~5MB).
// Photos are stripped from the localStorage copy and re-attached from IndexedDB on start-up.
let saveFailedWarned = false;
function save() {
  if (blockSave) return;   // unreadable data is still in storage and couldn't be copied: don't overwrite it
  try {
    localStorage.setItem('dialin_v2', JSON.stringify(state, (k, v) => k === 'labelPhoto' ? undefined : v));
    saveFailedWarned = false;
  } catch(e) {
    console.error('Save failed', e);
    if (!saveFailedWarned) { saveFailedWarned = true; showSaveError(); }
  }
  syncPhotos();
}
function showSaveError() {
  const el = document.getElementById('save-error-banner'); if (!el) return;
  el.style.display = 'block';
}

// ---- IndexedDB photo store ----
let photoDbPromise = null;
function photoDb() {
  if (!photoDbPromise) photoDbPromise = new Promise((res, rej) => {
    if (!window.indexedDB) return rej('no idb');
    const req = indexedDB.open('dialed', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('photos');
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return photoDbPromise;
}
function idbDo(mode, fn) {
  return photoDb().then(db => new Promise((res, rej) => {
    const tx = db.transaction('photos', mode); const out = fn(tx.objectStore('photos'));
    tx.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    tx.onerror = () => rej(tx.error);
  }));
}
const savedPhotos = {};   // coffeeId -> dataURL last written, so we only write changes
function syncPhotos() {
  const live = {};
  state.coffees.forEach(cf => { if (cf.labelPhoto) live[cf.id] = cf.labelPhoto; });
  const writes = Object.entries(live).filter(([id, url]) => savedPhotos[id] !== url);
  const deletes = Object.keys(savedPhotos).filter(id => !live[id]);
  if (!writes.length && !deletes.length) return;
  idbDo('readwrite', st => { writes.forEach(([id, url]) => st.put(url, id)); deletes.forEach(id => st.delete(id)); })
    .then(() => { writes.forEach(([id, url]) => savedPhotos[id] = url); deletes.forEach(id => delete savedPhotos[id]); })
    .catch(e => {
      console.error('Photo save failed', e);
      const names = writes.map(([id]) => (state.coffees.find(c => c.id === id) || {}).name).filter(Boolean);
      const el = document.getElementById('photo-error-banner');
      if (el && names.length) { el.style.display = 'block'; el.querySelector('.pe-text').textContent = `The label photo for ${names.join(', ')} couldn't be stored and will be lost when the app closes. Free up space or try a smaller photo.`; }
      else if (!saveFailedWarned) { saveFailedWarned = true; showSaveError(); }
    });
}
async function loadPhotos() {
  try {
    // Legacy: photos still embedded in localStorage from earlier versions -> compress + move to IndexedDB
    const legacy = state.coffees.filter(cf => cf.labelPhoto && !savedPhotos[cf.id]);
    for (const cf of legacy) { cf.labelPhoto = await compressDataUrl(cf.labelPhoto); }
    const keys = await idbDo('readonly', st => st.getAllKeys());
    const vals = await idbDo('readonly', st => st.getAll());
    (keys||[]).forEach((id, i) => {
      const cf = state.coffees.find(x => x.id === id);
      if (cf && !cf.labelPhoto) cf.labelPhoto = vals[i];
      if (cf && cf.labelPhoto === vals[i]) savedPhotos[id] = vals[i];
    });
    if (legacy.length) save();   // only when old embedded photos were migrated: writes them to IDB and strips them from localStorage
    rerenderCurrentView();
  } catch(e) { console.error('Photo load failed', e); }
}
function rerenderCurrentView() {
  renderDashboard();
  if (state.currentView === 'coffees') {
    if (typeof detailShownId !== 'undefined' && detailShownId && state.coffees.some(c => c.id === detailShownId)) showCoffeeDetail(detailShownId);
    else if (document.getElementById('coffees-list')) renderCoffeesView();
    else restoreCoffeeList();
  }
  if (state.currentView === 'tracker') renderTracker();
  if (state.currentView === 'recipes') renderRecipes();
}

// ---- Photo compression: long edge 900px, JPEG ~0.8 (a phone photo drops from ~4MB to ~100KB) ----
function compressDataUrl(dataUrl, maxEdge = 900, quality = 0.8) {
  return new Promise(resolve => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) return resolve(dataUrl);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      if (scale === 1 && dataUrl.length < 250000) return resolve(dataUrl);
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      const out = cv.toDataURL('image/jpeg', quality);
      resolve(out.length < dataUrl.length ? out : dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ---- Storage usage (Settings) ----
async function renderStorageInfo() {
  const el = document.getElementById('storage-info'); if (!el) return;
  let ls = 0; try { ls = (localStorage.getItem('dialin_v2')||'').length * 2; } catch(e) {}
  const photos = Object.values(savedPhotos).reduce((s, u) => s + u.length, 0);
  const n = Object.keys(savedPhotos).length;
  const kb = b => b > 1048576 ? (b/1048576).toFixed(1)+' MB' : Math.max(1, Math.round(b/1024))+' KB';
  const pct = Math.min(100, Math.round(ls / (5*1048576) * 100));
  const last = appSettings.lastBackupAt ? new Date(appSettings.lastBackupAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : 'never';
  let hasPrev = !!restoreUndo; try { hasPrev = hasPrev || !!localStorage.getItem('dialin_v2_prev'); } catch(e) {}
  const safety = storageSafetyLine();
  el.innerHTML = `Data ${kb(ls)} of ~5 MB (${pct}%) · ${n} photo${n!==1?'s':''} ${kb(photos)} stored separately<br>Last backup: ${last}` + (safety ? `<br>${safety}` : '')
    + (hasPrev ? `<br><button type="button" class="taste-clear-all" style="padding:6px 0 0" data-on-click="confirmUndoRestore()">Undo last restore</button>` : '');
}
// ==================== DATA VALIDATION ====================
// Everything read from storage or a backup file passes through sanitizeState(), so a bad value can never
// crash start-up, and ids are safe to place in the page.
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
function newId(prefix = '') {
  const rnd = (window.crypto && crypto.randomUUID) ? crypto.randomUUID().replace(/-/g, '').slice(0, 16) : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  return prefix + rnd;
}
function sanitizeState(raw) {
  if (!isObj(raw)) throw new Error('Not a dialed data file');
  ['coffees', 'recipes', 'plannedBrews', 'customRecipes'].forEach(k => { if (raw[k] != null && !Array.isArray(raw[k])) throw new Error(`"${k}" is not a list`); });
  const idMap = {}, seen = new Set();
  const fixId = (id, pfx) => {
    const old = String(id == null ? '' : id);
    if (SAFE_ID.test(old) && !seen.has(old)) { seen.add(old); return old; }
    const n = newId(pfx); if (old && !(old in idMap)) idMap[old] = n; seen.add(n); return n;
  };
  const safeRef = v => { const t = String(v == null ? '' : v); return idMap[t] || (SAFE_ID.test(t) ? t : null); };
  const num010 = v => { const n = Math.round(Number(v)); return n >= 1 && n <= 10 ? n : 0; };
  // Values that are shown as numbers must be numbers (or number-like text); anything else is blanked
  const NUMISH = /^-?\d{1,7}([.,]\d{1,4})?$/;
  const numish = v => (v == null || v === '') ? v : (typeof v === 'number' ? (isFinite(v) ? v : '') : (NUMISH.test(String(v).trim()) ? String(v).trim() : ''));
  const plain = (v, max = 30) => { const t = String(v == null ? '' : v); return /^[\p{L}\p{N} .,+&\/()’:\-]*$/u.test(t) && t.length <= max ? t : ''; };
  const isoDate = v => (typeof v === 'string' && !isNaN(Date.parse(v))) ? v : undefined;
  const nums = (o, keys) => keys.forEach(k => { if (k in o) o[k] = numish(o[k]); });
  const cleanTaste = t => { if (!isObj(t)) return undefined; const r = {}; ['sweetness','acidity','body','bitterness'].forEach(k => { const n = Math.round(Number(t[k])); if (t[k] != null && n >= 0 && n <= 5) r[k] = n; }); return Object.keys(r).length ? r : undefined; };
  const out = {};
  out.coffees = (raw.coffees || []).filter(isObj).map(c => {
    const o = { ...c, id: fixId(c.id, 'c'), name: String(c.name == null || c.name === '' ? 'Unnamed coffee' : c.name) };
    if (typeof o.labelPhoto !== 'string' || !o.labelPhoto.startsWith('data:image/')) delete o.labelPhoto;
    if (o.rating != null) o.rating = num010(o.rating);
    o.finishedBag = !!o.finishedBag; o.decaf = !!o.decaf;
    nums(o, ['weight', 'price', 'priceGBP', 'masl']);
    if ('currency' in o && !/^[A-Z]{3}$/.test(String(o.currency))) o.currency = 'GBP';
    if ('roastDate' in o && !/^\d{4}-\d{2}-\d{2}$/.test(String(o.roastDate))) o.roastDate = '';
    ['createdAt', 'finishedAt'].forEach(k => { if (k in o) { const d = isoDate(o[k]); if (d) o[k] = d; else delete o[k]; } });
    if ('buyAgain' in o && !['yes', 'maybe', 'no', ''].includes(o.buyAgain)) o.buyAgain = '';
    return o;
  });
  out.customRecipes = (raw.customRecipes || []).filter(isObj).map(r => ({ ...r, id: fixId(r.id, 'cr'), name: String(r.name == null ? 'Recipe' : r.name),
    steps: Array.isArray(r.steps) ? r.steps.map(x => String(x)) : [], method: plain(r.method) || 'Other',
    dose: numish(r.dose), water: numish(r.water), temp: numish(r.temp), custom: true }));
  out.recipes = (raw.recipes || []).filter(isObj).map(r => {
    const o = { ...r, id: fixId(r.id, 'b'), coffeeId: safeRef(r.coffeeId) || '', grinderId: safeRef(r.grinderId), recipeId: safeRef(r.recipeId) };
    if (o.rating != null) o.rating = num010(o.rating);
    if ('taste' in o) { const t = cleanTaste(o.taste); if (t) o.taste = t; else delete o.taste; }
    if (!['under', 'good', 'over', ''].includes(o.extraction || '')) o.extraction = '';
    nums(o, ['dose', 'yield', 'temp', 'time', 'grindUm']);
    if ('grind' in o) o.grind = plain(o.grind, 20);
    o.method = plain(o.method) || 'Other';
    if ('createdAt' in o) { const d = isoDate(o.createdAt); if (d) o.createdAt = d; else delete o.createdAt; }
    return o;
  });
  out.plannedBrews = (raw.plannedBrews || []).filter(isObj).map(p => {
    const o = { ...p, id: fixId(p.id, 'plan-'), coffeeId: safeRef(p.coffeeId) || '', grinderId: safeRef(p.grinderId), recipeId: safeRef(p.recipeId), basedOn: safeRef(p.basedOn) };
    nums(o, ['dose', 'yield', 'temp', 'tempFrom']);
    ['grind', 'grindFrom', 'grindDir', 'tempDir'].forEach(k => { if (k in o) o[k] = plain(o[k], 20); });
    o.method = plain(o.method) || 'Other';
    if (!['under', 'good', 'over', ''].includes(o.fromExtraction || '')) o.fromExtraction = '';
    return o;
  });
  out.compareIds = Array.isArray(raw.compareIds) ? raw.compareIds.map(safeRef).filter(Boolean) : [];
  out.favouriteGrinderId = safeRef(raw.favouriteGrinderId);
  out.selectedGrinderId = safeRef(raw.selectedGrinderId);
  out.selectedRecipeId = safeRef(raw.selectedRecipeId);
  out.selectedCoffeeId = safeRef(raw.selectedCoffeeId);
  if (plain(raw.selectedMethod)) out.selectedMethod = plain(raw.selectedMethod);
  return out;
}
function tsOf(x) { const t = x && x.createdAt ? Date.parse(x.createdAt) : NaN; return isNaN(t) ? 0 : t; }
function fmtDate(iso, opts = { day:'numeric', month:'short', year:'numeric' }) {
  const t = iso ? Date.parse(iso) : NaN;
  return isNaN(t) ? 'Unknown date' : new Date(t).toLocaleDateString('en-GB', opts);
}

let loadProblem = null, blockSave = false;
let storagePersisted = null;   // true / false / null (unknown)
async function requestPersistence() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return;
    storagePersisted = await navigator.storage.persisted();
    if (!storagePersisted) storagePersisted = await navigator.storage.persist();
  } catch(e) {}
}
function storageSafetyLine() {
  const iosSafariTab = /iP(hone|ad|od)/.test(navigator.userAgent) && navigator.standalone !== true;
  if (iosSafariTab) return 'On iPhone, Safari can clear this data after 7 days unused. Use Share › Add to Home Screen to keep it.';
  if (storagePersisted === true) return 'Storage is protected: the browser won’t clear it automatically.';
  if (storagePersisted === false) return 'The browser may clear this data if the device runs low on space. Export a backup now and then.';
  return '';
}
function load() {
  let s = null;
  try { s = localStorage.getItem('dialin_v2'); } catch(e) { loadProblem = 'storage'; return; }
  if (!s) return;
  try { state = { ...state, ...sanitizeState(JSON.parse(s)) }; }
  catch(e) {
    // Never throw unreadable data away: keep a copy, and don't save over the original unless the copy was made
    console.error('Saved data could not be read', e);
    loadProblem = 'corrupt';
    try { localStorage.setItem('dialin_v2_corrupt', s); } catch(_) { blockSave = true; }
  }
}
function showLoadProblem() {
  const el = document.getElementById('load-error-banner'); if (!el || !loadProblem) return;
  el.style.display = 'block';
  el.querySelector('.lp-text').textContent = loadProblem === 'storage'
    ? "This browser is blocking the app's storage, so nothing can be saved. Check you're not in private browsing."
    : blockSave ? "Your saved data couldn't be read, and there wasn't room to keep a copy. Nothing new will be saved until you export the unreadable data and start fresh."
                : "Your saved data couldn't be read, so the app has started empty. A copy of the unreadable data has been kept.";
  el.querySelector('.lp-actions').style.display = loadProblem === 'corrupt' ? 'flex' : 'none';
}
function exportUnreadable() {
  let raw = null; try { raw = localStorage.getItem('dialin_v2_corrupt') || localStorage.getItem('dialin_v2'); } catch(e) {}
  if (!raw) { showToast('Nothing to export'); return; }
  downloadText(raw, `dialed-unreadable-${new Date().toISOString().slice(0,10)}.txt`, 'text/plain');
}
function dismissLoadProblem() {
  if (blockSave) { blockSave = false; }
  loadProblem = null; const el = document.getElementById('load-error-banner'); if (el) el.style.display = 'none';
}

// ==================== NAVIGATION ====================
function showView(name, pushState=true) {
  const changed = state.currentView !== name;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  const idx = ['dashboard','coffees','tracker'].indexOf(name);
  document.querySelectorAll('.nav-tab')[idx]?.classList.add('active');
  state.currentView = name;
  if(name==='dashboard') renderDashboard();
  if(name==='coffees') { if (!document.getElementById('coffees-list')) restoreCoffeeList(); else renderCoffeesView(); }
  if(name==='recipes') renderRecipes();
  if(name==='grinders') renderGrinders();
  if(name==='tracker') renderTracker();
  if(name==='compare') renderCompare();
  if(changed) playEnter(document.getElementById('view-' + name), 'view-enter');
  if(pushState) history.pushState({view:name}, '', '');
}

// Android back gesture + double-back to exit
let lastBackTime = 0;
window.addEventListener('popstate', function(e) {
  // Back closes the top layer first: a confirm box, then full-screen brew mode, then any open sheet
  const confirmOpen = document.querySelector('#modal-confirm-delete.open');
  const brewing = !confirmOpen && document.querySelector('#brew-mode.open');
  if (brewing) { closeBrewMode(); history.pushState({view:state.currentView},'',''); return; }
  const openModal = confirmOpen || document.querySelector('.modal-overlay.open');
  if (openModal) { closeModal(openModal.id); history.pushState({view:state.currentView},'',''); return; }
  const settingsOpen = document.getElementById('settings-panel')?.classList.contains('open');
  if (settingsOpen) { closeSettings && closeSettings(); history.pushState({view:state.currentView},'',''); return; }
  if (state.currentView !== 'dashboard') {
    showView('dashboard', false);
    history.pushState({view:'dashboard'}, '', '');
  } else {
    const now = Date.now();
    if (now - lastBackTime < 2000) { /* second back — allow exit */ }
    else { lastBackTime = now; showToast('Press back again to exit'); history.pushState({view:'dashboard'},'',''); }
  }
});

document.addEventListener('touchstart', () => {}, { passive: true });  // lets :active press states show on iOS
const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const closingTimers = {};
function openModal(id) {
  const el = document.getElementById(id); if (!el) return;
  clearTimeout(closingTimers[id]); el.classList.remove('closing');
  el.classList.add('open');
  try { a11yOpened(id); } catch(e) {}
  if (id === 'modal-fab') document.querySelector('.fab')?.classList.add('fab-open');
  if (id === 'modal-recipe') { try { renderTimerPill(); } catch(e) {} }
}
function closeModal(id) {
  const el = document.getElementById(id); if (!el || !el.classList.contains('open')) return;
  el.classList.remove('open');
  try { a11yClosed(id); } catch(e) {}
  if (id === 'modal-fab') document.querySelector('.fab')?.classList.remove('fab-open');
  if (id === 'modal-recipe') { try { closeBrewMode(); renderTimerPill(); } catch(e) {} }   // brew mode belongs to Log Brew
  if (reduceMotion()) return;
  // Stays visible (and ignores taps) while it slides away; a timer guarantees it always finishes
  el.classList.add('closing');
  clearTimeout(closingTimers[id]);
  closingTimers[id] = setTimeout(() => el.classList.remove('closing'), 240);
}
function openFab() { openModal('modal-fab'); }

let editKeepCoffeeId = null;   // set by fillBrewModal when editing: that coffee stays selectable even if its bag is finished
function openRecipeModal() {
  if (!state.coffees.length) { showToast('Add a coffee first!'); return; }
  const keepId = editKeepCoffeeId; editKeepCoffeeId = null;
  const selectable = c => !c.finishedBag || c.id === keepId;
  if (!state.coffees.some(selectable)) {
    confirmAction({ title: 'No open bags', text: 'All your coffees are marked finished. Add a new coffee, or reopen one from its ⋯ menu in the Coffee Library.',
      button: 'Add a coffee', neutral: true, onYes: () => { resetCoffeeModal(); openModal('modal-coffee'); } });
    return;
  }
  // Always reset edit state when opening fresh
  const reid = document.getElementById('r-edit-id'); if(reid) reid.value = '';
  const rtitle = document.getElementById('r-modal-title'); if(rtitle) rtitle.textContent = 'Log Brew';
  // Coffee selector
  const cs = document.getElementById('coffee-selector');
  cs.innerHTML = '';
  state.coffees.filter(selectable).forEach(c => {
    const d = document.createElement('div');
    d.className = 'coffee-selector-item' + (state.selectedCoffeeId===c.id?' selected':'');
    d.innerHTML = `<div class="cs-name">${escHtml(c.name)}</div><div class="cs-sub">${escHtml(c.roaster||'')}</div>`;
    d.onclick = () => { state.selectedCoffeeId=c.id; cs.querySelectorAll('.coffee-selector-item').forEach(x=>x.classList.remove('selected')); d.classList.add('selected'); renderBrewHistory(); renderBrewSuggestion(); };
    cs.appendChild(d);
  });
  const activeCoffees = state.coffees.filter(selectable);
  if (!state.selectedCoffeeId || !activeCoffees.find(c=>c.id===state.selectedCoffeeId)) { if(activeCoffees.length){state.selectedCoffeeId=activeCoffees[0].id; cs.children[0]?.classList.add('selected');} }
  // Default grinder to favourite if none previously selected
  if (!state.selectedGrinderId && state.favouriteGrinderId) { state.selectedGrinderId = state.favouriteGrinderId; }
  // Grinder selector
  const gs = document.getElementById('grinder-selector');
  gs.innerHTML = '';
  const none = document.createElement('div');
  none.className = 'coffee-selector-item' + (!state.selectedGrinderId?' selected':'');
  none.innerHTML = '<div class="cs-name" style="font-size:13px;font-family:var(--font-mono)">No grinder / unspecified</div>';
  none.onclick = () => { state.selectedGrinderId=null; gs.querySelectorAll('.coffee-selector-item').forEach(x=>x.classList.remove('selected')); none.classList.add('selected'); };
  gs.appendChild(none);
  function makeGrinderItem(g) {
    const d = document.createElement('div');
    d.className = 'coffee-selector-item' + (state.selectedGrinderId===g.id?' selected':'');
    const isFav = state.favouriteGrinderId === g.id;
    d.innerHTML = `<div class="cs-name" style="font-size:14px">${g.model}</div><div class="cs-sub">${g.brand} · ${g.type==='manual'?'Manual':'Electric'}${isFav?' · Default':''}</div>`;
    d.onclick = () => { state.selectedGrinderId=g.id; gs.querySelectorAll('.coffee-selector-item').forEach(x=>x.classList.remove('selected')); d.classList.add('selected'); };
    return d;
  }
  // Favourites first
  const favGrinders = GRINDERS.filter(g => g.id === state.favouriteGrinderId);
  const otherGrinders = GRINDERS.filter(g => g.id !== state.favouriteGrinderId);
  if (favGrinders.length) {
    const hdr = document.createElement('div');
    hdr.style.cssText = "font-family:var(--font-mono);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--crema);padding:6px 2px 4px;";
    hdr.textContent = 'Favourite';
    gs.appendChild(hdr);
    favGrinders.forEach(g => gs.appendChild(makeGrinderItem(g)));
    const sep = document.createElement('div');
    sep.style.cssText = "font-family:var(--font-mono);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-muted);padding:8px 2px 4px;border-top:1px solid var(--border);margin-top:4px;";
    sep.textContent = 'All Grinders';
    gs.appendChild(sep);
  }
  otherGrinders.forEach(g => gs.appendChild(makeGrinderItem(g)));
  // Set correct yield/water label for current method on open
  const lbl2 = document.getElementById('r-yield-label');
  const inp2 = document.getElementById('r-yield');
  if (lbl2 && inp2) {
    if (isEspressoMethod(state.selectedMethod)) {
      lbl2.textContent = 'Yield (g)'; inp2.placeholder = 'e.g. 36';
    } else {
      lbl2.textContent = 'Water (ml)'; inp2.placeholder = 'e.g. 250';
    }
  }
  // Init recipe dropdown
  updateRecipeDropdown(state.selectedMethod);
  // Highlight the current method and set labels/time format to match it
  const mTab = [...document.querySelectorAll('.method-tab')].find(t => (t.getAttribute('data-on-click')||'').includes("'"+state.selectedMethod+"'"));
  if (mTab) selectMethod(mTab, state.selectedMethod);
  const rpid = document.getElementById('r-plan-id'); if (rpid) rpid.value = '';
  const rfin = document.getElementById('r-finish-bag'); if (rfin) rfin.checked = false;
  if (currentRecipe()) autofillFromRecipe(currentRecipe(), true);
  renderBrewTimer();
  resetTaste();
  updateBrewLive();
  suggestionSuppressed = false; renderBrewHistory(); renderBrewSuggestion(); updateGrindMicrons();
  openModal('modal-recipe');
}

// ==================== FORM CONTROLS ====================
function selectExtraction(val) {
  state.selectedExtraction = val;
  document.querySelectorAll('.extraction-btn').forEach(b => b.classList.remove('selected'));
  document.querySelector('.extraction-btn.'+val)?.classList.add('selected');
}
function setRating(n) {
  n = Math.max(0, Math.min(10, Math.round(+n || 0)));
  state.selectedRating = n;
  const r = document.getElementById('r-rating-range'), v = document.getElementById('r-rating-val');
  if (r) { if (+r.value !== n) r.value = n; r.classList.toggle('unset', n === 0); r.setAttribute('aria-valuetext', n ? `${n} out of 10` : 'Not rated'); }
  if (v) v.innerHTML = n ? `<div class="rs-num"><b>${n}</b>/10</div><div class="rs-word">${RATING_WORDS[n]}</div>` : `<div class="rs-num rs-none">–</div><div class="rs-word">Not rated</div>`;
}
const ESPRESSO_METHODS = ['Espresso'];
function isEspressoMethod(m) { return ESPRESSO_METHODS.includes(m); }

function selectMethod(el, val) {
  state.selectedMethod = val;
  document.querySelectorAll('.method-tab').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected');
  // Swap yield ↔ water volume label depending on method
  const lbl = document.getElementById('r-yield-label');
  const inp = document.getElementById('r-yield');
  if (lbl && inp) {
    if (isEspressoMethod(val)) {
      lbl.textContent = 'Yield (g)'; inp.placeholder = 'e.g. 36';
    } else {
      lbl.textContent = 'Water (ml)'; inp.placeholder = 'e.g. 250';
    }
  }
  // Update recipe dropdown
  updateRecipeDropdown(val);
  // Toggle time format
  const espT=document.getElementById('r-time-esp'), filT=document.getElementById('r-time-filter');
  if(espT&&filT){ espT.style.display=isEspressoMethod(val)?'flex':'none'; filT.style.display=isEspressoMethod(val)?'none':'flex'; }
  autofillFromRecipe(currentRecipe(), false);
  renderBrewSuggestion(); updateGrindMicrons();
}

function updateRecipeDropdown(method) {
  const wrap = document.getElementById('r-recipe-wrap');
  const sel = document.getElementById('r-recipe-select');
  if (!wrap || !sel) return;
  if (isEspressoMethod(method)) {
    wrap.style.display = 'none';
    state.selectedRecipeId = null;
    return;
  }
  wrap.style.display = 'block';
  const options = getAllRecipesForMethod(method);
  sel.innerHTML = '<option value="">— No recipe / custom —</option>' +
    options.map(r => `<option value="${r.id}">${r.custom?'★ ':''}${escHtml(r.name)} · ${escHtml(r.dose)}g / ${escHtml(r.water)}ml</option>`).join('');
  // Restore previously selected recipe if same method
  if (state.selectedRecipeId) {
    const still = options.find(r => r.id === state.selectedRecipeId);
    if (still) sel.value = state.selectedRecipeId;
    else { sel.value = ''; state.selectedRecipeId = null; }
  }
  renderRecipeCard(method, sel.value);
}

// Dose and water come from the recipe but stay editable.
// force=true (user picked a recipe, or a fresh Log Brew) always fills;
// otherwise only empty fields, or fields still holding the last autofilled value, are replaced.
let recipeAutofill = { dose: null, water: null };
function autofillFromRecipe(recipe, force) {
  const d = document.getElementById('r-dose'), y = document.getElementById('r-yield');
  if (!d || !y) return;
  const nd = recipe && recipe.dose ? recipe.dose : null, nw = recipe && recipe.water ? recipe.water : null;
  const replaceable = (el, prev) => force || !el.value || (prev != null && parseFloat(el.value) === parseFloat(prev));
  if (replaceable(d, recipeAutofill.dose)) d.value = nd != null ? nd : '';
  if (replaceable(y, recipeAutofill.water)) y.value = nw != null ? nw : '';
  recipeAutofill = { dose: nd, water: nw };
  updateBrewLive();
}
function currentRecipe() {
  if (!state.selectedRecipeId || isEspressoMethod(state.selectedMethod)) return null;
  return getAllRecipesForMethod(state.selectedMethod).find(r => r.id === state.selectedRecipeId) || null;
}

function onRecipeChange(sel) {
  state.selectedRecipeId = sel.value || null;
  setTimeout(() => { renderStepGuide(); updateBrewLive(); renderBrewSuggestion(); }, 0);
  renderRecipeCard(state.selectedMethod, sel.value);
  const method = state.selectedMethod;
  const options = getAllRecipesForMethod(method);
  const recipe = options.find(r => r.id === sel.value);
  if (recipe) {
    autofillFromRecipe(recipe, true);
    if (recipe.temp) document.getElementById('r-temp').value = recipe.temp;
    // Set grind hint in notes if field is empty and hint exists
    const grindEl = document.getElementById('r-grind');
    if (grindEl && !grindEl.value && recipe.grindHint) {
      // Don't autofill grind — it's machine-specific
    }
  } else {
    // No recipe selected — clear autofilled fields
    autofillFromRecipe(null, true);
    document.getElementById('r-temp').value = '';
  }
}
