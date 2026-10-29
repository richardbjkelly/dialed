// dialed — Backup/restore, menus, timer, plan next, suggestions and charts
// Plain scripts sharing one global scope, loaded in order: data, core, coffee, views, tools, app.

// ==================== UTILS ====================
function formatDate(d) { if(!d) return ''; return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}).toUpperCase(); }
function showToast(msg) { const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }

document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if(e.target===o) closeModal(o.id); }));


let appSettings = { darkMode: false, suggestedStart: true, showCosts: true, textSize: 'default', overviewCategories: ['country','process','roaster','roasterCountry'] };

function loadSettings() {
  try {
    const s = localStorage.getItem('dialin_settings');
    const parsed = s ? JSON.parse(s) : null;
    if (isObj(parsed)) appSettings = { ...appSettings, ...parsed };
  ['paletteId', 'displayFontId', 'monoFontId'].forEach(k => delete appSettings[k]);   // leftovers from early versions
  } catch(e) {}
  if (['year', '6m', '3m', 'month', 'all'].includes(appSettings.statsPeriod)) {
    statsPeriod = appSettings.statsPeriod;
    document.querySelectorAll('#stats-period-bar .type-btn').forEach(b => b.classList.toggle('active', b.dataset.period === statsPeriod));
  }
  applySettings();
  applyDarkMode();
}

function saveSettings() {
  try { localStorage.setItem('dialin_settings', JSON.stringify(appSettings)); } catch(e) {}
}

const TEXT_SIZES = [ ['small','Small',0.9], ['default','Default',1], ['large','Large',1.15], ['xlarge','Extra large',1.3] ];
function uiZoom() { const t = TEXT_SIZES.find(x => x[0] === appSettings.textSize); return t ? t[2] : 1; }
function applyTextSize() {
  const z = uiZoom();
  document.documentElement.style.setProperty('--ui-zoom', z);
  document.body.classList.toggle('text-xl', z >= 1.3);
  document.querySelectorAll('#text-size-options button').forEach(b => { const on = b.dataset.size === (appSettings.textSize || 'default'); b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); });
}
function setTextSize(v) { appSettings.textSize = v; saveSettings(); applyTextSize(); }
function applySettings() {
  // Fonts are set in the stylesheet (Space Grotesk headings, Inter text)
  applyTextSize();
  applyDarkMode();
}

// ==================== BACKUP / RESTORE ====================
const TRANSIENT_KEYS = ['currentView', 'selectedExtraction', 'selectedRating', 'selectedCoffeeId'];
function downloadText(text, name, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
async function backupData() {
  const withPhotos = appSettings.backupPhotos !== false;
  const st = JSON.parse(JSON.stringify(state, (k, v) => (TRANSIENT_KEYS.includes(k) || (!withPhotos && k === 'labelPhoto')) ? undefined : v));
  const { lastBackupAt, backupSnoozeUntil, ...settings } = appSettings;
  const data = { app: 'dialed', version: 3, exportedAt: new Date().toISOString(), photosIncluded: withPhotos, state: st, settings };
  const text = JSON.stringify(data, null, 2), name = `dialed-backup-${new Date().toISOString().slice(0,10)}.json`;
  let done = false;
  // An app added to the iPhone Home Screen can't download files; hand the file to the share sheet instead
  if (navigator.standalone === true && navigator.canShare) {
    try { const file = new File([text], name, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'dialed backup' }); done = true; } }
    catch(e) { if (e && e.name === 'AbortError') return; }
  }
  if (!done) downloadText(text, name, 'application/json');
  showToast('Backup exported ✓');
  appSettings.lastBackupAt = Date.now(); saveSettings(); renderDashboard(); renderStorageInfo();
}

// Generic confirm sheet (shares the delete-confirm markup)
function confirmAction({ title, text, button = 'Yes', onYes, neutral = false, cancel = 'Cancel' }) {
  hideAllOverlays();
  setDeleteTitle(title);
  const sub = document.getElementById('confirm-delete-subtitle'); if (sub) sub.textContent = text;
  const btn = document.getElementById('confirm-delete-btn');
  if (btn) { btn.textContent = button; btn.style.background = neutral ? '' : '#8b1a1a'; btn.onclick = () => { closeModal('modal-confirm-delete'); onYes(); }; }
  const cb = document.getElementById('confirm-cancel-btn'); if (cb) cb.textContent = cancel;
  openModal('modal-confirm-delete');
}

let restoreUndo = null;   // in-memory snapshot (with photos) of what a restore replaced
function restoreData(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    let data, clean;
    try {
      data = JSON.parse(e.target.result);
      if (!isObj(data) || !isObj(data.state)) throw new Error('No "state" in file');
      clean = sanitizeState(data.state);
    } catch(err) { console.warn('Restore rejected', err); showToast("That file isn't a valid dialed backup — nothing was changed"); return; }
    const n = a => a.length;
    confirmAction({
      title: 'Replace your data?',
      text: `This backup has ${n(clean.coffees)} coffee${n(clean.coffees)!==1?'s':''} and ${n(clean.recipes)} brew${n(clean.recipes)!==1?'s':''}`
        + (data.exportedAt ? ` from ${fmtDate(data.exportedAt)}` : '') + `. It will replace the ${n(state.coffees)} coffee${n(state.coffees)!==1?'s':''} and ${n(state.recipes)} brew${n(state.recipes)!==1?'s':''} on this device.`
        + (data.photosIncluded === false ? ' The backup has no label photos.' : '') + ' You can undo this until you close the app.',
      button: 'Replace',
      onYes: () => applyRestore(clean, isObj(data.settings) ? data.settings : null)
    });
  };
  reader.onerror = () => showToast('Could not read that file');
  reader.readAsText(file);
  input.value = '';
}
const SETTING_KEYS = ['brewSound', 'darkMode', 'suggestedStart', 'showCosts', 'textSize', 'overviewCategories', 'coffeeLayout', 'brewHistoryOpen', 'lastCurrency', 'backupPhotos'];
function applyRestore(clean, settings) {
  restoreUndo = { state: JSON.parse(JSON.stringify(state)), settings: { ...appSettings } };
  try { localStorage.setItem('dialin_v2_prev', JSON.stringify(state, (k, v) => k === 'labelPhoto' ? undefined : v)); } catch(e) {}
  setWholeState(clean, settings);
  showToast('Backup restored ✓');
  renderStorageInfo();
}
function setWholeState(next, settings) {
  state = { coffees: [], recipes: [], selectedCoffeeId: null, selectedGrinderId: null, selectedMethod: 'Espresso', selectedExtraction: '', selectedRating: 0,
            currentView: 'dashboard', compareIds: [], favouriteGrinderId: null, selectedRecipeId: null, customRecipes: [], plannedBrews: [], ...next, currentView: 'dashboard' };
  if (settings) { SETTING_KEYS.forEach(k => { if (settings[k] !== undefined) appSettings[k] = settings[k]; }); saveSettings(); applySettings(); }
  detailShownId = null;
  save();
  if (document.getElementById('view-coffees')) restoreCoffeeList();
  showView('dashboard', false);
  try { updateCompareBar(); } catch(e) {}
}
function undoRestore() {
  if (restoreUndo) { const u = restoreUndo; restoreUndo = null; setWholeState(sanitizeState(u.state), u.settings); }
  else {
    let prev = null; try { prev = JSON.parse(localStorage.getItem('dialin_v2_prev') || 'null'); } catch(e) {}
    if (!prev) { showToast('Nothing to undo'); return; }
    try { setWholeState(sanitizeState(prev), null); } catch(e) { showToast('The previous data could not be read'); return; }
  }
  try { localStorage.removeItem('dialin_v2_prev'); } catch(e) {}
  showToast('Restore undone'); renderStorageInfo();
}
function toggleBackupPhotos() {
  appSettings.backupPhotos = appSettings.backupPhotos === false;
  saveSettings(); syncSuggestedStartSwitch();
}

function toggleSuggestedStart() {
  appSettings.suggestedStart = appSettings.suggestedStart === false;
  saveSettings(); syncSuggestedStartSwitch(); renderBrewSuggestion();
}
function syncSuggestedStartSwitch() {
  const b = document.getElementById('settings-suggest-switch');
  if (b) b.setAttribute('aria-checked', appSettings.suggestedStart === false ? 'false' : 'true');
  const c = document.getElementById('settings-costs-switch');
  if (c) c.setAttribute('aria-checked', showCosts() ? 'true' : 'false');
  const sl = document.getElementById('settings-scorelater-switch');
  if (sl) sl.setAttribute('aria-checked', scoreLaterOn() ? 'true' : 'false');
  const bp = document.getElementById('settings-backupphotos-switch');
  if (bp) bp.setAttribute('aria-checked', appSettings.backupPhotos === false ? 'false' : 'true');
  const bs = document.getElementById('settings-brewsound-switch');
  if (bs) bs.setAttribute('aria-checked', appSettings.brewSound === true ? 'true' : 'false');
}
function toggleShowCosts() {
  appSettings.showCosts = !showCosts();
  saveSettings(); syncSuggestedStartSwitch();
  // Redraw everything that can show a price, cost per brew or total spent
  renderDashboard(); renderCoffeesView();
  if (typeof detailShownId !== 'undefined' && detailShownId) showCoffeeDetail(detailShownId);
}

function toggleDarkMode() {
  appSettings.darkMode = !appSettings.darkMode;
  applyDarkMode();
  saveSettings();
  try { renderStatsDashboard(); } catch(e) {}   // chart colours have separate dark-mode steps
}

function applyDarkMode() {
  const isDark = appSettings.darkMode;
  document.body.classList.toggle('dark-mode', isDark);
  // Sync all dark mode toggle buttons
  const syncDarkBtns = () => {
    const btn = document.getElementById('dark-toggle-btn');
    const sBtn = document.getElementById('settings-dark-btn');
  if (sBtn) sBtn.innerHTML = isDark ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="-0.5 -0.5 16 16" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor" width="18" height="18"><path d="M5 7.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0 -5 0" stroke-width="1"></path><path d="M7.5 1.875v1.25m0 8.7525v1.25M3.125 7.5H1.875m11.25 0h-1.25m0 -4.375 -1.25 1.25M3.125 3.125l1.25 1.25m0 6.25 -1.25 1.25m8.75 0 -1.25 -1.25" stroke-width="1"></path></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.5 -0.5 16 16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M13.125 7.9937499999999995A5.625 5.625 0 1 1 7.0062500000000005 1.875 4.375 4.375 0 0 0 13.125 7.9937499999999995z" stroke-width="1"></path></svg>`;
  if (btn) btn.innerHTML = isDark ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="-0.5 -0.5 16 16" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor" width="18" height="18"><path d="M5 7.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0 -5 0" stroke-width="1"></path><path d="M7.5 1.875v1.25m0 8.7525v1.25M3.125 7.5H1.875m11.25 0h-1.25m0 -4.375 -1.25 1.25M3.125 3.125l1.25 1.25m0 6.25 -1.25 1.25m8.75 0 -1.25 -1.25" stroke-width="1"></path></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.5 -0.5 16 16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M13.125 7.9937499999999995A5.625 5.625 0 1 1 7.0062500000000005 1.875 4.375 4.375 0 0 0 13.125 7.9937499999999995z" stroke-width="1"></path></svg>`;
  };
  syncDarkBtns();
  // Also sync after a tick in case buttons aren't in DOM yet (page load)
  setTimeout(syncDarkBtns, 100);
}




// One short blob: URL per label photo, reused everywhere it's shown. Embedding the full photo data in every
// card made a 60-brew list tens of megabytes.
const photoBlobUrls = {};   // coffeeId -> { src: dataURL, url: blobURL }
function photoUrl(c) {
  if (!c || !c.labelPhoto) return '';
  const hit = photoBlobUrls[c.id];
  if (hit && hit.src === c.labelPhoto) return hit.url;
  if (hit) { try { URL.revokeObjectURL(hit.url); } catch(e) {} delete photoBlobUrls[c.id]; }
  try {
    const comma = c.labelPhoto.indexOf(','), mime = (c.labelPhoto.slice(0, comma).match(/^data:([^;]+);base64$/) || [])[1];
    if (!mime || !/^image\//.test(mime)) return '';
    const bin = atob(c.labelPhoto.slice(comma + 1)), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    photoBlobUrls[c.id] = { src: c.labelPhoto, url };
    return url;
  } catch(e) { return ''; }
}
function openLightboxFor(coffeeId) {
  const c = state.coffees.find(x => x.id === coffeeId); const url = photoUrl(c);
  if (url) openLightbox(url);
}
function openLightbox(src) {
  const img = document.getElementById('lightbox-img');
  if (img) img.src = src;
  openModal('modal-lightbox');
}
function resetConfirmBtn() { const cb = document.getElementById('confirm-cancel-btn'); if (cb) cb.textContent = 'Cancel'; const b = document.getElementById('confirm-delete-btn'); if (b) { b.textContent = 'Yes, Delete'; b.style.background = '#8b1a1a'; } }
function setDeleteTitle(t) { const el = document.getElementById('confirm-delete-title'); if (el) el.textContent = t; }
function confirmDeleteCustomRecipe(id) {
  setDeleteTitle('Delete Recipe?'); resetConfirmBtn();
  const r = (state.customRecipes||[]).find(x=>x.id===id);
  const sub = document.getElementById('confirm-delete-subtitle');
  if (sub) sub.textContent = r ? 'Delete recipe "' + r.name + '"?' : 'This cannot be undone.';
  const btn = document.getElementById('confirm-delete-btn');
  if (btn) btn.onclick = () => { deleteCustomRecipe(id); closeModal('modal-confirm-delete'); };
  openModal('modal-confirm-delete');
}

function confirmDeleteCoffee(id) {
  hideAllOverlays(); setDeleteTitle('Delete Coffee?'); resetConfirmBtn();
  const c = state.coffees.find(x=>x.id===id); if (!c) return;
  const n = state.recipes.filter(r=>r.coffeeId===id).length;
  const sub = document.getElementById('confirm-delete-subtitle');
  if (sub) sub.textContent = 'Delete "' + c.name + '"' + (n ? ' and its ' + n + ' brew' + (n!==1?'s':'') : '') + '? This cannot be undone.';
  const btn = document.getElementById('confirm-delete-btn');
  if (btn) btn.onclick = () => { deleteCoffee(id); closeModal('modal-confirm-delete'); };
  openModal('modal-confirm-delete');
}
function deleteCoffee(id) {
  state.coffees = state.coffees.filter(c=>c.id!==id);
  state.recipes = state.recipes.filter(r=>r.coffeeId!==id);
  state.plannedBrews = (state.plannedBrews||[]).filter(p=>p.coffeeId!==id);
  if (state.selectedCoffeeId === id) state.selectedCoffeeId = null;
  save();  // also removes the label photo from storage
  showToast('Coffee deleted');
  if (typeof detailShownId !== 'undefined' && detailShownId === id) restoreCoffeeList(); else renderCoffeesView();
  renderDashboard();
}

function confirmDeleteBrew(id) {
  hideAllOverlays(); setDeleteTitle('Delete Brew?'); resetConfirmBtn();
  const r = state.recipes.find(x=>x.id===id);
  const coffee = r ? state.coffees.find(c=>c.id===r.coffeeId) : null;
  const sub = document.getElementById('confirm-delete-subtitle');
  if (sub) sub.textContent = coffee ? 'Delete brew for ' + coffee.name + '?' : 'This cannot be undone.';
  const btn = document.getElementById('confirm-delete-btn');
  if (btn) btn.onclick = () => { deleteRecipe(id); closeModal('modal-confirm-delete'); };
  openModal('modal-confirm-delete');
}

function hideAllOverlays() {
  document.querySelectorAll('.card-edit-overlay').forEach(el => el.classList.remove('visible'));
}
// ==================== LONG PRESS ====================
let longPressTimer = null, lpStartX = 0, lpStartY = 0, suppressNextClick = false;
function startLongPress(id, type) {
  if (event && event.touches && event.touches[0]) { lpStartX = event.touches[0].clientX; lpStartY = event.touches[0].clientY; }
  if (event) event.stopPropagation();
  clearTimeout(longPressTimer);
  longPressTimer = setTimeout(() => { longPressTimer = null; suppressNextClick = true; showEditOverlay(type+'-'+id); if (navigator.vibrate) navigator.vibrate(15); }, 500);
}
function endLongPress() { clearTimeout(longPressTimer); longPressTimer = null; }
document.addEventListener('touchmove', e => {
  if (!longPressTimer || !e.touches[0]) return;
  if (Math.abs(e.touches[0].clientX-lpStartX) > 10 || Math.abs(e.touches[0].clientY-lpStartY) > 10) endLongPress();
}, {passive:true});
document.addEventListener('scroll', endLongPress, {passive:true, capture:true});
document.addEventListener('touchend', () => { if (suppressNextClick) setTimeout(() => { suppressNextClick = false; }, 400); }, {passive:true, capture:true});
// Swallow the click fired when a long-press is released, so it doesn't open the card underneath
document.addEventListener('click', e => {
  if (suppressNextClick) { suppressNextClick = false; e.stopPropagation(); e.preventDefault(); }
}, true);
// The same brew can be on screen twice (Overview "Recent brews" and a coffee's Brew Log, one of them hidden),
// so open the menu on the copy that's actually visible
function overlaysFor(key) { return [...document.querySelectorAll('[data-overlay]')].filter(o => o.dataset.overlay === key); }
function showEditOverlay(key) {
  document.querySelectorAll('.card-edit-overlay').forEach(el=>el.classList.remove('visible'));
  const all = overlaysFor(key);
  const el = all.find(o => o.closest('.card-wrap')?.getClientRects().length) || all[0];
  if (el) el.classList.add('visible');
}
function hideEditOverlay(key) { overlaysFor(key).forEach(el => el.classList.remove('visible')); }
document.addEventListener('touchstart', e=>{
  if(!e.target.closest('.card-edit-overlay')&&!e.target.closest('.recipe-entry')&&!e.target.closest('.coffee-card'))
    document.querySelectorAll('.card-edit-overlay').forEach(el=>el.classList.remove('visible'));
},{passive:true});

// ==================== TIME HELPERS ====================
function getBrewTimeSecs() {
  if(isEspressoMethod(state.selectedMethod||'Espresso')) return document.getElementById('r-time')?.value||'';
  const mins=parseInt(document.getElementById('r-time-mins')?.value||'0')||0;
  const secs=parseInt(document.getElementById('r-time-secs')?.value||'0')||0;
  return (mins>0||secs>0)?String(mins*60+secs):'';
}
function setTimeFields(totalSecs) {
  const s=parseInt(totalSecs)||0; if(!s) return;
  if(isEspressoMethod(state.selectedMethod||'Espresso')){const f=document.getElementById('r-time');if(f)f.value=s;}
  else{const mf=document.getElementById('r-time-mins');if(mf)mf.value=Math.floor(s/60);const sf=document.getElementById('r-time-secs');if(sf)sf.value=s%60;}
}
function formatBrewTime(secs,method) {
  if(!secs) return '—';
  const s=parseInt(secs)||0;
  if(isEspressoMethod(method||'Espresso')) return s+'s';
  const m=Math.floor(s/60),rem=s%60;
  return m>0?m+':'+(String(rem).padStart(2,'0')):s+'s';
}

// ==================== EDIT BREW ====================
function editBrew(id) {
  const r=state.recipes.find(x=>x.id===id); if(!r) return;
  fillBrewModal(r, { editId:id, title:'Edit Brew', keepResult:true });
}

// Opens Log Brew pre-filled. Selections are set in state first so the pickers render highlighted.
function fillBrewModal(r, opts={}) {
  const coffee = state.coffees.find(x=>x.id===r.coffeeId);
  if (coffee && coffee.finishedBag && !opts.editId) { showToast('That bag is marked finished'); return; }
  state.selectedCoffeeId = r.coffeeId;
  state.selectedGrinderId = r.grinderId || null;
  state.selectedMethod = r.method || 'Espresso';
  state.selectedRecipeId = r.recipeId || null;
  if (!opts.keepResult && !opts.keepTimer) resetBrewTimer();
  editKeepCoffeeId = opts.editId ? r.coffeeId : null;
  openRecipeModal();
  if (r.water) { selectedWaterId = r.water.id; brewWaterSnapshot = r.water; waterPickedByHand = true; }   // Repeat, Up next and Edit keep the brew's water
  else if (opts.editId) { selectedWaterId = 'w-none'; waterPickedByHand = true; }
  try { renderWaterPicker(); } catch(e) {}
  suggestionSuppressed = true; renderBrewSuggestion();
  if (opts.editId) { document.getElementById('r-edit-id').value = opts.editId; renderStartBtn(); const lb = document.getElementById('r-later-btn'); if (lb) lb.style.display = 'none'; }
  if (opts.planId) document.getElementById('r-plan-id').value = opts.planId;
  document.getElementById('r-modal-title').textContent = opts.title || 'Log Brew';
  const sel = document.getElementById('r-recipe-select');
  if (sel && r.recipeId) { sel.value = r.recipeId; renderRecipeCard(state.selectedMethod, r.recipeId); }
  ['grind','dose','yield','temp'].forEach(f => { const el=document.getElementById('r-'+f); if (el) el.value = (r[f]!==undefined && r[f]!==null) ? r[f] : ''; });
  document.getElementById('r-notes').value = opts.keepResult ? (r.notes||'') : (r.note ? 'Plan: '+r.note : '');
  ['r-time','r-time-mins','r-time-secs'].forEach(i => { const el=document.getElementById(i); if (el) el.value=''; });
  if (opts.keepResult) {
    setTimeFields(r.time);
    if (r.extraction) selectExtraction(r.extraction);
    else { state.selectedExtraction=''; document.querySelectorAll('.extraction-btn').forEach(b=>b.classList.remove('selected')); }
    setRating(r.rating || 0);
    TASTE_KEYS.forEach(([k]) => setTasteSlider(k, r.taste && r.taste[k] !== undefined ? r.taste[k] : null));
  } else {
    state.selectedExtraction=''; document.querySelectorAll('.extraction-btn').forEach(b=>b.classList.remove('selected'));
    setRating(0);
  }
  updateBrewLive(); updateGrindMicrons(); renderBrewHistory();
  if (!opts.editId) setBrewPage('dial');      // Repeat, Use or Brew now: coffee and recipe are already chosen
}


// ==================== DIALLING-IN HELPERS ====================
const DAY_MS = 86400000;
// ---- Freezer: a frozen bag's days-off-roast clock is paused ----
// c.freezes = [{ from:'YYYY-MM-DD', to:'YYYY-MM-DD' | null }]; an open period (to:null) means it's in the freezer now
const dayStart = s => new Date(s + 'T00:00:00').getTime();
function isFrozen(c) { return !!(c && Array.isArray(c.freezes) && c.freezes.some(f => f && !f.to)); }
function frozenSince(c) { const f = isFrozen(c) ? c.freezes.find(x => !x.to) : null; return f ? f.from : null; }
// Whole days spent frozen between the roast and time t
function frozenDaysBefore(c, t) {
  if (!c || !Array.isArray(c.freezes) || !c.roastDate) return 0;
  const r0 = dayStart(c.roastDate); let ms = 0;
  c.freezes.forEach(f => {
    if (!f || !f.from) return;
    const a = Math.max(r0, dayStart(f.from)), b = Math.min(t, f.to ? dayStart(f.to) : t);
    if (b > a) ms += b - a;
  });
  return Math.floor(ms / DAY_MS);
}
function roastAgeAt(cf, t) {
  if (!cf || !cf.roastDate) return null;
  const d = Math.floor((t - dayStart(cf.roastDate)) / DAY_MS);
  if (d < 0) return null;
  return Math.max(0, d - frozenDaysBefore(cf, t));
}
function daysOffRoast(r, cf) {
  if (!cf || !cf.roastDate || !r || !r.createdAt) return null;
  return roastAgeAt(cf, new Date(r.createdAt).getTime());
}
function roastAgeToday(cf) { return roastAgeAt(cf, Date.now()); }
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function toggleFreeze(id) {
  const c = state.coffees.find(x => x.id === id); if (!c || c.finishedBag) return;
  const today = todayISO();
  if (!Array.isArray(c.freezes)) c.freezes = [];
  if (isFrozen(c)) {
    const f = c.freezes.find(x => !x.to); f.to = today;
    if (f.to <= f.from) c.freezes = c.freezes.filter(x => x !== f);   // frozen and thawed the same day: no pause
    showToast('Thawed: the roast clock is running again');
  } else {
    c.freezes.push({ from: today, to: null });
    const age = roastAgeToday(c);
    showToast(age != null ? `Frozen: paused at ${age} day${age === 1 ? '' : 's'} off roast` : 'Frozen');
  }
  save();
  hideAllOverlays();
  refreshAfterFinish(id);
}
// Frozen coffees can't be brewed: offer to thaw first, then carry on
function brewGuard(coffeeId, go) {
  const c = state.coffees.find(x => x.id === coffeeId);
  if (!c || !isFrozen(c)) { go(); return; }
  confirmAction({ title: 'In the freezer', text: `${c.name} is frozen. Thaw it to brew it? Its roast clock starts again from ${roastAgeToday(c) ?? 'where it paused'}${roastAgeToday(c) != null ? ' days' : ''}.`,
    button: 'Thaw and brew', neutral: true, onYes: () => { toggleFreeze(c.id); go(); } });
}
function logBrewFor(id) {
  brewGuard(id, () => { state.selectedCoffeeId = id; openRecipeModal(); });
}
function ratioStr(r) {
  const d = parseFloat(r.dose), y = parseFloat(r.yield);
  if (!(d > 0) || !(y > 0)) return '';
  const x = y / d; return '1:' + (x >= 10 ? x.toFixed(1) : x.toFixed(1).replace(/\.0$/, '.0'));
}
function costPerCup(r, cf) {
  const p = per100g(cf), d = parseFloat(r.dose);
  return (p != null && d > 0) ? p * d / 100 : null;
}
function brewsFor(cfId) { return state.recipes.filter(r => r.coffeeId === cfId); }
function gramsUsed(cf) { return brewsFor(cf.id).reduce((s, r) => s + (parseFloat(r.dose) || 0), 0); }
function gramsLeft(cf) { return cf && cf.weight > 0 ? Math.max(0, cf.weight - gramsUsed(cf)) : null; }
function avgDose(cf) { const ds = brewsFor(cf.id).map(r => parseFloat(r.dose)).filter(d => d > 0); return ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : null; }
function bestBrew(cfId) {
  const rated = brewsFor(cfId).filter(r => r.rating > 0);
  if (!rated.length) return null;
  return rated.sort((a, b) => (b.rating - a.rating) || ((b.extraction === 'good') - (a.extraction === 'good')) || (tsOf(b) - tsOf(a)))[0];
}
function bagPanelHtml(cf) {
  const left = gramsLeft(cf), used = gramsUsed(cf), ad = avgDose(cf);
  const costs = brewsFor(cf.id).map(r => costPerCup(r, cf)).filter(x => x != null);
  const age = roastAgeToday(cf);
  const rows = [];
  if (left != null && !cf.finishedBag) {
    const pct = Math.round(left / cf.weight * 100);
    const brewsLeft = ad ? Math.floor(left / ad) : null;
    const low = left <= 0 ? 'Empty' : (brewsLeft !== null && brewsLeft <= 1) ? 'Nearly empty' : '';
    rows.push(`<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
        <span style="font-size:13px;font-weight:600;color:var(--text)">${Math.round(left)}g left <span style="font-weight:400;color:var(--text-muted);font-size:11px">of ${cf.weight}g${brewsLeft !== null && left > 0 ? ' · ~' + brewsLeft + ' brew' + (brewsLeft !== 1 ? 's' : '') : ''}</span></span>
        ${low ? `<span class="extraction-tag tag-over">${low}</span>` : ''}
      </div>
      <div class="stats-bar-track" style="height:8px;margin-bottom:10px"><div class="stats-bar-fill" style="width:${pct}%;background:${pct <= 15 ? '#c0564b' : 'var(--crema)'}"></div></div>
      ${left <= 0 && !cf.finishedBag ? `<button class="btn-secondary" style="width:100%;margin-bottom:10px;color:var(--text)" data-on-click="toggleFinishedBag('${cf.id}')">Bag's empty — mark finished</button>` : ''}`);
  }
  const facts = [];
  const iced = cf.roastDate ? frozenDaysBefore(cf, Date.now()) : 0;
  if (age !== null) facts.push(iced > 0
    ? `<b>${age}</b> day${age !== 1 ? 's' : ''} off roast${isFrozen(cf) ? ' (paused in the freezer)' : ''} · ${iced} day${iced !== 1 ? 's' : ''} in the freezer not counted`
    : `Roasted <b>${age}</b> day${age !== 1 ? 's' : ''} ago`);
  if ((left == null || cf.finishedBag) && used > 0) facts.push(`<b>${Math.round(used)}g</b> used${cf.finishedBag ? ` over <b>${brewsFor(cf.id).length}</b> brew${brewsFor(cf.id).length !== 1 ? 's' : ''}` : ''}`);
  if (costs.length) facts.push(`<b>£${(costs.reduce((a, b) => a + b, 0) / costs.length).toFixed(2)}</b> avg per cup`);
  if (!rows.length && !facts.length) return '';
  return `<div class="card" style="padding:14px 16px">${rows.join('')}${facts.length ? `<div style="font-size:12px;color:var(--text-muted);display:flex;flex-wrap:wrap;gap:4px 14px">${facts.map(f => `<span>${f}</span>`).join('')}</div>` : ''}
    ${left == null && !cf.finishedBag ? `<div style="font-size:11px;color:var(--text-muted);margin-top:6px">Add the bag weight (Edit) to track grams left.</div>` : ''}</div>`;
}
function bestBrewHtml(cf) {
  const b = bestBrew(cf.id); if (!b) return '';
  const parts = [b.grind ? 'Grind ' + b.grind : '', b.dose ? b.dose + 'g' : '', ratioStr(b), b.temp ? b.temp + '°C' : '', b.time ? formatBrewTime(b.time, b.method) : ''].filter(Boolean);
  return `<div class="card" style="padding:14px 16px;border:1.5px solid var(--crema)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted)"><svg class="ico" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z"/></svg> Best brew so far</span>
      <span style="font-size:12px;color:var(--text);font-weight:600">${b.rating}/10</span>
    </div>
    <div style="font-size:14px;color:var(--text);font-weight:600;margin-bottom:2px">${escHtml(b.method)}</div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">${parts.join(' · ')}</div>
    <button class="btn-primary" style="margin-top:0;padding:11px" data-on-click="repeatBrew('${b.id}')">↻ Repeat this brew</button>
  </div>`;
}
// ---- Log Brew: last and best brew for the selected coffee ----
// "James Hoffmann — Ultimate AeroPress" -> "Hoffmann · Ultimate AeroPress"; method added only when the title doesn't say it
function brewRecipeLabel(r) {
  const method = r.method || '';
  const rec = r.recipeId ? getAllRecipesForMethod(method).find(x => x.id === r.recipeId) : null;
  if (!rec) return escHtml(method ? method + ' · Custom' : 'Custom');
  const [who, title] = rec.name.includes('—') ? rec.name.split(/\s*—\s*/) : ['', rec.name];
  const surname = who ? who.trim().split(/\s+/).pop() : '';
  const label = [surname, title].filter(Boolean).join(' · ');
  return escHtml(method && !label.toLowerCase().includes(method.toLowerCase()) ? method + ' · ' + label : label);
}
function brewHistCol(r, label, cls) {
  const g = r.grinderId ? GRINDERS.find(x => x.id === r.grinderId) : null;
  const isEsp = isEspressoMethod(r.method || 'Espresso');
  const d = fmtDate(r.createdAt, { day:'numeric', month:'short' });
  const tag = r.extraction ? `<span class="extraction-tag tag-${r.extraction}">${r.extraction === 'good' ? '✓ Good' : r.extraction}</span>` : '';
  const line2 = [r.dose ? `${escHtml(r.dose)}<span class="u">g</span>` : '', r.yield ? `${escHtml(r.yield)}<span class="u">${isEsp ? 'g' : 'ml'}</span>` : ''].filter(Boolean).join(' → ');
  const line3 = [r.temp ? `${escHtml(r.temp)}<span class="u">°C</span>` : '', r.time ? formatBrewTime(r.time, r.method) : ''].filter(Boolean).join(' · ');
  return `<div class="bh-col ${cls}">
    <div class="bh-k"><span>${label} · ${d}</span>${tag}</div>
    <div class="bh-recipe">${brewRecipeLabel(r)}</div>
    <div>Grind <b>${escHtml(r.grind || '—')}</b>${g ? ` <span class="u">${escHtml(g.model)}</span>` : ''}</div>
    ${line2 ? `<div>${line2}</div>` : ''}${line3 ? `<div>${line3}</div>` : ''}
    <div class="bh-foot">${r.rating > 0 ? `<span><b>${r.rating}</b><span class="u">/10</span></span>` : '<span class="u">Not rated</span>'}
      <button type="button" class="bh-use" data-on-click="useBrewSettings('${r.id}')">Use</button></div>
  </div>`;
}
function renderBrewHistory() {
  const el = document.getElementById('brew-history'); if (!el) return;
  const editing = !!document.getElementById('r-edit-id')?.value;
  const brews = state.selectedCoffeeId ? brewsFor(state.selectedCoffeeId).slice().sort((a, b) => tsOf(b) - tsOf(a)) : [];
  if (editing || !brews.length) { el.innerHTML = ''; return; }
  const last = brews[0], best = bestBrew(state.selectedCoffeeId);
  const same = !best || best.id === last.id;
  const open = appSettings.brewHistoryOpen === true;   // folded by default: the strip already shows the key numbers
  const sumBits = [last.rating > 0 ? `${last.rating}/10` : '', last.extraction ? (last.extraction === 'good' ? 'Good' : last.extraction[0].toUpperCase() + last.extraction.slice(1)) : '', last.grind ? `Grind ${escHtml(last.grind)}` : '', last.temp ? `${escHtml(last.temp)}°C` : ''].filter(Boolean).join(' · ');
  el.innerHTML = `<div class="bh">
    <button type="button" class="bh-strip" aria-expanded="${open}" data-on-click="toggleBrewHistory()">
      <span class="bh-sk">${same ? (best ? 'Last & best' : 'Last') : 'Last'}</span><span class="bh-sum">${sumBits || brewRecipeLabel(last)}</span><span class="bh-chev">${open ? '▴' : '▾'}</span>
    </button>
    ${open ? `<div class="bh-cols${same ? ' one' : ''}">${brewHistCol(last, same && best ? 'Last & best' : 'Last', same && best ? 'best' : '')}${same ? '' : brewHistCol(best, 'Best', 'best')}</div>` : ''}
  </div>`;
}
function toggleBrewHistory() { appSettings.brewHistoryOpen = appSettings.brewHistoryOpen !== true; saveSettings(); renderBrewHistory(); }
function useBrewSettings(id) {
  const r = state.recipes.find(x => x.id === id); if (!r) return;
  const notes = document.getElementById('r-notes').value;
  fillBrewModal({ coffeeId: r.coffeeId, grinderId: r.grinderId, method: r.method, recipeId: r.recipeId, grind: r.grind, dose: r.dose, yield: r.yield, temp: r.temp }, { title: 'Log Brew', keepTimer: true });
  document.getElementById('r-notes').value = notes;
  showToast('Settings filled in from that brew');
}

function repeatBrew(id) {
  const r = state.recipes.find(x => x.id === id); if (!r) return;
  brewGuard(r.coffeeId, () => fillBrewModal(r, { title: 'Log Brew · Repeat' }));
}

// ---- Live ratio + cost in Log Brew ----
// ---- Ratio lock: with it on, changing the dose changes the water to match (and the other way round) ----
let ratioLockValue = null;      // water ÷ dose, kept unrounded so repeated edits don't drift
const ratioLocked = () => appSettings.ratioLocked === true;
const LOCK_ICON = '<svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>', UNLOCK_ICON = '<svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/></svg>';
function doseWater() { return [parseFloat(document.getElementById('r-dose')?.value), parseFloat(document.getElementById('r-yield')?.value)]; }
function captureRatio() { const [d, w] = doseWater(); ratioLockValue = d > 0 && w > 0 ? w / d : null; renderRatioLock(); }
function renderRatioLock() {
  const b = document.getElementById('r-ratio-lock'); if (!b) return;
  const on = ratioLocked();
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  b.querySelector('.rl-ico').innerHTML = on ? LOCK_ICON : UNLOCK_ICON;
  b.querySelector('.rl-txt').textContent = on ? (ratioLockValue ? 'Locked 1:' + (Math.round(ratioLockValue * 10) / 10) : 'Ratio locked') : 'Lock ratio';
  b.setAttribute('aria-label', on ? 'Ratio locked. Changing the dose changes the water. Tap to unlock' : 'Lock the ratio, so changing the dose changes the water');
}
function toggleRatioLock() {
  if (ratioLocked()) { appSettings.ratioLocked = false; }
  else {
    captureRatio();
    if (!ratioLockValue) { showToast('Enter a dose and water first'); return; }
    appSettings.ratioLocked = true;
  }
  saveSettings(); renderRatioLock();
}
function doseInput() {
  const [d] = doseWater();
  if (ratioLocked() && ratioLockValue && d > 0) {
    const esp = isEspressoMethod(state.selectedMethod || 'Espresso');
    document.getElementById('r-yield').value = esp ? Math.round(d * ratioLockValue * 10) / 10 : Math.round(d * ratioLockValue);
  } else if (ratioLocked() && !ratioLockValue) captureRatio();
  updateBrewLive();
}
function waterInput() {
  const [, w] = doseWater();
  if (ratioLocked() && ratioLockValue && w > 0) document.getElementById('r-dose').value = Math.round(w / ratioLockValue * 10) / 10;
  else if (ratioLocked() && !ratioLockValue) captureRatio();
  updateBrewLive();
}

// ---- Recipes scale with your dose and water: gram and ml amounts in the steps follow the numbers you've entered ----
function recipeScale(recipe) {
  const [d, w] = doseWater();
  const fd = recipe && recipe.dose > 0 && d > 0 ? d / recipe.dose : null, fw = recipe && recipe.water > 0 && w > 0 ? w / recipe.water : null;
  const f = { dose: fd || fw || 1, water: fw || fd || 1 };
  return (Math.abs(f.dose - 1) < 0.005 && Math.abs(f.water - 1) < 0.005) ? null : f;
}
// "Pour 60g water … to 300g total" → scaled amounts. The coffee dose itself scales with the dose; everything else with the water.
function scaleStepText(text, recipe, f, mark) {
  if (!f) return mark ? escHtml(text) : text;
  const out = [], re = /(\d+(?:\.\d+)?)(\s?)(g|ml)\b/gi;
  let last = 0, m;
  while ((m = re.exec(text))) {
    const n = parseFloat(m[1]), isDose = recipe.dose && Math.abs(n - recipe.dose) < 0.01;
    const v = n * (isDose ? f.dose : f.water), shown = isDose ? String(Math.round(v * 10) / 10) : String(Math.round(v));
    out.push(mark ? escHtml(text.slice(last, m.index)) + `<span class="recipe-scaled">${shown}${m[2]}${escHtml(m[3])}</span>` : text.slice(last, m.index) + shown + m[2] + m[3]);
    last = m.index + m[0].length;
  }
  out.push(mark ? escHtml(text.slice(last)) : text.slice(last));
  return out.join('');
}

function updateBrewLive() {
  const el = document.getElementById('r-ratio-live'); if (!el) return;
  try { if (state.selectedRecipeId) { renderRecipeCard(state.selectedMethod, state.selectedRecipeId); renderStepGuide(); } } catch(e) {}
  const r = { dose: document.getElementById('r-dose').value, yield: document.getElementById('r-yield').value };
  const cf = state.coffees.find(c => c.id === state.selectedCoffeeId);
  const parts = [];
  const ratio = ratioStr(r); if (ratio) parts.push('Ratio <b>' + ratio + '</b>');
  const cost = costPerCup(r, cf); if (cost != null) parts.push('<b>£' + cost.toFixed(2) + '</b> per cup');
  const left = cf ? gramsLeft(cf) : null; const d = parseFloat(r.dose);
  if (left != null && d > 0 && !document.getElementById('r-edit-id').value) parts.push(`${Math.max(0, Math.round(left - d))}g left after this`);
  el.innerHTML = parts.join(' · ');
}

// ---- Tasting sliders ----
const TASTE_KEYS = [['sweetness', 'Sweetness'], ['acidity', 'Acidity'], ['body', 'Body'], ['bitterness', 'Bitterness']];
function setTasteSlider(key, val) {
  const inp = document.getElementById('taste-' + key), out = document.getElementById('taste-' + key + '-val');
  if (!inp) return;
  if (val === null || val === undefined) { inp.value = 0; inp.dataset.set = ''; out.textContent = '–'; out.disabled = true; out.classList.remove('set'); inp.classList.add('unset'); }
  else { inp.value = val; inp.dataset.set = '1'; out.innerHTML = `${val}<span class="tv-x" aria-hidden="true">×</span>`; out.disabled = false; out.classList.add('set'); inp.classList.remove('unset'); }
  const any = TASTE_KEYS.some(([k]) => document.getElementById('taste-' + k)?.dataset.set);
  const all = document.getElementById('taste-clear-all'); if (all) all.hidden = !any;
}
function onTasteInput(key) { const inp = document.getElementById('taste-' + key); setTasteSlider(key, parseInt(inp.value)); }
function resetTaste() { TASTE_KEYS.forEach(([k]) => setTasteSlider(k, null)); }
function readTaste() {
  const t = {}; TASTE_KEYS.forEach(([k]) => { const inp = document.getElementById('taste-' + k); if (inp && inp.dataset.set) t[k] = parseInt(inp.value); });
  return Object.keys(t).length ? t : null;
}

// ---- Guided recipe steps on the timer ----
let lastGuideIdx = -1;
function timedSteps() {
  const rec = state.selectedRecipeId ? getAllRecipesForMethod(state.selectedMethod).find(x => x.id === state.selectedRecipeId) : null;
  if (!rec) return [];
  const f = recipeScale(rec);
  return rec.steps.map(s => scaleStepText(s, rec, f, false)).map(s => { const m = s.match(/^~?\s*(\d{1,2}):(\d{2})\s*[—–-]\s*(.*)$/); return m ? { at: +m[1] * 60 + +m[2], text: m[3] } : null; }).filter(Boolean).sort((a, b) => a.at - b.at);
}
function renderStepGuide() {
  const el = document.getElementById('brew-step-guide'); if (!el) return;
  const steps = timedSteps();
  const s = brewTimerSecs(), running = !!brewTimer.startedAt;
  if (steps.length < 2 || (!running && s === 0)) { el.style.display = 'none'; lastGuideIdx = -1; return; }   // shown once a brew is under way
  let idx = -1; steps.forEach((st, i) => { if (s >= st.at) idx = i; });
  if ((running || s > 0) && idx !== lastGuideIdx && idx >= 0) {
    if (lastGuideIdx !== -1 || idx > 0) {
      if (navigator.vibrate) navigator.vibrate(120);
      if (running && !reduceMotion()) { el.classList.remove('guide-pulse'); void el.offsetWidth; el.classList.add('guide-pulse'); el.addEventListener('animationend', () => el.classList.remove('guide-pulse'), { once: true }); }
    }
    lastGuideIdx = idx;
  }
  const fmt = n => Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
  const next = steps[idx + 1];
  el.style.display = 'block';
  if (!running && s === 0) {
    el.innerHTML = `<div class="guide-label">First step at ${fmt(steps[0].at)}</div><div class="guide-now">${escHtml(steps[0].text)}</div>`;
    return;
  }
  el.innerHTML = `<div class="guide-label">Now</div><div class="guide-now">${idx >= 0 ? escHtml(steps[idx].text) : 'Get ready…'}</div>` +
    (next ? `<div class="guide-next">Next in <b>${fmt(Math.max(0, next.at - s))}</b> · ${escHtml(next.text)}</div>` : `<div class="guide-next">Last step — stop the timer when it's finished draining.</div>`);
}

// ---- Taste vs days off roast (Trends) ----
function renderAgeChart(coffeeId) {
  const cf = state.coffees.find(c => c.id === coffeeId);
  if (!cf || !cf.roastDate) return '';
  const pts = brewsFor(coffeeId).map(r => ({ d: daysOffRoast(r, cf), v: parseFloat(r.rating) })).filter(p => p.d !== null && p.v > 0).sort((a, b) => a.d - b.d);
  if (pts.length < 2) return '';
  const W = 320, H = 120, PL = 26, PR = 10, PT = 14, PB = 24, CW = W - PL - PR, CH = H - PT - PB;
  const dmin = pts[0].d, dmax = pts[pts.length - 1].d, dr = (dmax - dmin) || 1;
  const xs = d => PL + (d - dmin) / dr * CW, ys = v => PT + CH - v / 10 * CH;
  const path = pts.map((p, i) => (i ? 'L' : 'M') + xs(p.d).toFixed(1) + ',' + ys(p.v).toFixed(1)).join(' ');
  const best = pts.reduce((a, b) => b.v > a.v ? b : a);
  const grid = [0, 5, 10].map(v => `<line x1="${PL}" x2="${W - PR}" y1="${ys(v)}" y2="${ys(v)}" stroke="var(--border)"/><text x="${PL - 4}" y="${ys(v) + 3}" font-size="8" fill="var(--text-muted)" text-anchor="end">${v}</text>`).join('');
  const dots = pts.map(p => `<circle cx="${xs(p.d).toFixed(1)}" cy="${ys(p.v).toFixed(1)}" r="${p === best ? 5 : 3.5}" fill="${p === best ? '#123C27' : '#52796F'}" stroke="white" stroke-width="1.5"/>`).join('');
  const xl = [...new Set(pts.map(p => p.d))].map(d => `<text x="${xs(d).toFixed(1)}" y="${H - 6}" font-size="8" fill="var(--text-muted)" text-anchor="middle">D${d}</text>`).join('');
  return `<div class="trend-chart-wrap" style="padding:14px 10px 8px;margin-top:12px">
    <div style="font-size:12px;font-weight:600;color:var(--text);margin:0 0 2px 6px">Taste by days off roast</div>
    <div style="font-size:11px;color:var(--text-muted);margin:0 0 6px 6px">Best so far: ${best.v}/10 on day ${best.d}</div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;overflow:visible">${grid}<path class="chart-draw" pathLength="1" d="${path}" stroke="#52796F" stroke-width="2" fill="none" stroke-linejoin="round"/><g class="chart-fade">${dots}</g>${xl}</svg>
  </div>`;
}

document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#coffee-selector, #grinder-selector')) setTimeout(() => { updateBrewLive(); updateGrindMicrons(); renderBrewSuggestion(); }, 0); });


// ==================== GRIND ↔ MICRONS ====================
// Converts a grinder setting to approximate particle size (µm) and back, so grind sizes
// can be compared across grinders. Uses per-click data where known, otherwise spreads the
// grinder's settings linearly across its published range. Approximate: units vary.
function grinderScale(g) {
  if (!g) return null;
  if (!(g.max > g.min)) return null;
  if (g.umPerClick) {
    const s0 = g.clickMin || 0;
    const s1 = g.clickMax != null ? g.clickMax : s0 + Math.round((g.max - g.min) / g.umPerClick);
    return { s0, s1, um0: g.min, per: g.umPerClick, step: g.step, stepless: !!g.stepless };
  }
  if (g.clickMax != null) { const s0 = g.clickMin || 0; return { s0, s1: g.clickMax, um0: g.min, per: (g.max - g.min) / (g.clickMax - s0), step: g.step, stepless: !!g.stepless }; }
  if (!(g.settings > 0)) return null;
  return { s0: 0, s1: g.settings, um0: g.min, per: (g.max - g.min) / g.settings, step: g.step, stepless: !!g.stepless };
}
function settingInRange(g, setting) {
  const s = parseFloat(setting), sc = grinderScale(g);
  if (!sc || isNaN(s)) return true;
  const tol = (sc.step || 1) * 0.5;
  return s >= sc.s0 - tol && s <= sc.s1 + tol;
}
function settingToMicrons(g, setting) {
  const s = parseFloat(setting), sc = grinderScale(g);
  if (!sc || isNaN(s) || !settingInRange(g, setting)) return null;
  return Math.round(sc.um0 + (s - sc.s0) * sc.per);
}
function micronsToSetting(g, um) {
  const sc = grinderScale(g); if (!sc || um == null) return null;
  let s = sc.s0 + (um - sc.um0) / sc.per;
  s = Math.max(sc.s0, Math.min(sc.s1, s));
  const span = sc.s1 - sc.s0;
  const step = sc.step || (sc.stepless ? (span > 100 ? 1 : span >= 40 ? 0.5 : 0.1) : (span >= 15 ? 1 : 0.5));
  const dp = step < 1 ? (String(step).split('.')[1] || '').length : 0;
  return parseFloat((Math.round(s / step) * step).toFixed(dp));
}
function grindWord(um) {
  if (um == null) return '';
  return um < 250 ? 'extra fine' : um < 400 ? 'fine' : um < 550 ? 'medium-fine' : um < 750 ? 'medium' : um < 950 ? 'medium-coarse' : 'coarse';
}
function methodRange(method) {
  const name = method === 'Steep & Release' ? 'Pour Over' : method;
  return BREW_METHODS.find(m => m.name === name) || null;
}
function brewMicrons(r) {
  if (r.grindUm) return r.grindUm;
  const g = r.grinderId ? GRINDERS.find(x => x.id === r.grinderId) : null;
  return settingToMicrons(g, r.grind);
}
function selectedGrinder() { return state.selectedGrinderId ? GRINDERS.find(g => g.id === state.selectedGrinderId) : null; }

// Live readout under the grind field in Log Brew
// ---- Grind and temperature sliders (the number boxes beside them stay the source of truth) ----
function brewGrindSlider() {
  // The whole of the grinder's range; the usual range for the brew method is shown as a band on top
  const g = selectedGrinder(), sc = grinderScale(g); if (!sc) return null;
  const step = planGrindStep(g, state.selectedMethod, '');
  const lo = roundTo(Math.floor(sc.s0 / step) * step, step), hi = roundTo(Math.ceil(sc.s1 / step) * step, step);
  let band = null;
  const mr = methodRange(state.selectedMethod);
  if (mr) {
    const a = micronsToSetting(g, mr.min), b = micronsToSetting(g, mr.max);
    if (a != null && b != null && b > a) band = { lo: roundTo(Math.max(lo, a), step), hi: roundTo(Math.min(hi, b), step) };
  }
  return { lo, hi, step, band, stepless: !!sc.stepless, usual: false };
}
function syncBrewSliders() {
  const gr = document.getElementById('r-grind-range'), gi = document.getElementById('r-grind'); if (!gr || !gi) return;
  const cfg = brewGrindSlider(), set = (id, t) => { const e = document.getElementById(id); if (e && e.textContent !== t) e.textContent = t; };
  if (!cfg) { gr.disabled = true; gr.classList.add('unset'); set('r-grind-hint', 'Pick a grinder to use the slider'); set('r-grind-lo', ''); set('r-grind-hi', ''); }
  else {
    gr.disabled = false; gr.min = cfg.lo; gr.max = cfg.hi; gr.step = cfg.step;
    const v = parseFloat(gi.value);
    gr.value = isNaN(v) ? roundTo((cfg.lo + cfg.hi) / 2, cfg.step) : v;
    gr.classList.toggle('unset', isNaN(v));
    const sn = selectedGrinder()?.snap;
    set('r-grind-hint', sn ? `Full grinder range · steps of ${sn.map(([a, b, st], i) => st + (i < sn.length - 1 ? ' to ' + b : '')).join(', then ')}` : `Full grinder range · steps of ${cfg.step}`);
    set('r-grind-lo', String(cfg.lo)); set('r-grind-hi', String(cfg.hi));
  }
  // Suggested range band: positioned along the track, allowing for the thumb's travel stopping short of the ends
  const band = document.getElementById('r-grind-band'), sug = document.getElementById('r-grind-sug');
  if (band && sug) {
    const bnd = cfg && cfg.band, span = cfg ? (cfg.hi - cfg.lo) || 1 : 1;
    band.hidden = sug.hidden = !bnd;
    if (bnd) {
      const p0 = (bnd.lo - cfg.lo) / span, p1 = (bnd.hi - cfg.lo) / span, T = 11;
      band.style.left = `calc(${T}px + (100% - ${2 * T}px) * ${p0.toFixed(4)} - 7px)`;
      band.style.width = `calc((100% - ${2 * T}px) * ${(p1 - p0).toFixed(4)} + 14px)`;
      const unit = cfg.stepless ? '' : ' clicks';
      sug.querySelector('span').textContent = `Suggested ${bnd.lo}–${bnd.hi}`;
      sug.title = `Suggested for ${state.selectedMethod} · ${bnd.lo}–${bnd.hi}${unit}`;
      band.title = sug.title;
    }
  }
  const tr = document.getElementById('r-temp-range'), ti = document.getElementById('r-temp');
  if (tr && ti) { const t = parseFloat(ti.value), inRange = t >= 80 && t <= 100; tr.value = inRange ? t : 93; tr.classList.toggle('unset', !inRange); }
}
// Some grinders' sliders snap more coarsely in part of the range (Sculptor 078S: 0.1 up to 5, then 0.5).
// Only the slider snaps: a typed value such as 10.2 is kept as it is.
function snapGrind(g, v, step) {
  const band = g && Array.isArray(g.snap) ? g.snap.find(([a, b]) => v >= a && v < b) || (v >= g.snap[g.snap.length - 1][1] ? g.snap[g.snap.length - 1] : null) : null;
  const st = band ? band[2] : step;
  return roundTo(Math.round(v / st) * st, Math.min(st, step || st));
}
function slideBrew(kind, val) {
  if (kind === 'grind') {
    const cfg = brewGrindSlider(), v = cfg ? snapGrind(selectedGrinder(), +val, cfg.step) : val;
    document.getElementById('r-grind').value = v;
    const r = document.getElementById('r-grind-range'); if (r && cfg) r.value = v;   // the thumb jumps to the snapped value
    updateGrindMicrons();
  }
  else { document.getElementById('r-temp').value = Math.round(+val); syncBrewSliders(); }
  updateBrewLive();
}
// Anything in Log Brew that fills or changes these fields (picking a grinder or recipe, Use, Apply) keeps the sliders in step
['click', 'change', 'input'].forEach(t => document.addEventListener(t, e => {
  if (!(e.target.closest && e.target.closest('#modal-recipe'))) return;
  if (!/^r-(grind|temp)-range$/.test(e.target.id)) setTimeout(syncBrewSliders, 0);
  // Dose and water filled in some other way (recipe, Use, Apply): the locked ratio becomes the new one
  if (!/^r-(dose|yield)$/.test(e.target.id) && !(e.target.closest('#r-ratio-lock'))) setTimeout(() => { if (ratioLocked()) captureRatio(); }, 0);
}));

function updateGrindMicrons() {
  syncBrewSliders();
  const el = document.getElementById('r-grind-um'); if (!el) return;
  const g = selectedGrinder(), val = document.getElementById('r-grind').value;
  if (!g) { el.innerHTML = ''; return; }   // the slider hint already says to pick a grinder
  if (val !== '' && !settingInRange(g, val)) { const sc = grinderScale(g); el.innerHTML = `<span style="color:#c0564b">${val} is outside the ${g.model}'s ${sc.s0}–${sc.s1} range</span>`; return; }
  const um = settingToMicrons(g, val);
  if (um == null) { el.innerHTML = ''; return; }
  const mr = methodRange(state.selectedMethod);
  let fit = '';
  if (mr) fit = um < mr.min ? ` · <span style="color:#c0564b">finer than usual</span>`
               : um > mr.max ? ` · <span style="color:#c0564b">coarser than usual</span>`
               : ` · in range`;
  el.innerHTML = `≈ <b>${um}µm</b> (${grindWord(um)})${fit}`;
}

// ==================== STARTING-POINT SUGGESTIONS ====================
// Phase 0: rules from general brewing guidance (method, roast, process, altitude, decaf).
// Personal model: the user's own good brews shift the rules, weighted by how similar the
// coffees are. Runs entirely on the phone; nothing leaves the device.
const METHOD_BASE = {
  'Espresso':        { um: 280,  temp: 93, ratio: 2,  dose: 18 },
  'Pourover':        { um: 560,  temp: 94, ratio: 16, dose: 15 },
  'AeroPress':       { um: 520,  temp: 90, ratio: 15, dose: 15 },
  'Chemex':          { um: 720,  temp: 94, ratio: 16, dose: 30 },
  'French Press':    { um: 1000, temp: 95, ratio: 16, dose: 30 },
  'Moka Pot':        { um: 480,  temp: 90, ratio: 10, dose: 18 },
  'Cold Brew':       { um: 1100, temp: 20, ratio: 8,  dose: 100 },
  'Steep & Release': { um: 620,  temp: 96, ratio: 16, dose: 15 },
  'Other':           { um: 600,  temp: 93, ratio: 16, dose: 15 },
};
const ROAST_ADJ = { 'Light':[-40,2], 'Light-Medium':[-20,1], 'Medium':[0,0], 'Medium-Dark':[30,-2], 'Dark':[50,-4] };
const FERMENTY = ['Natural','Anaerobic','Carbonic Maceration','Extended Fermentation'];

function ruleSuggestion(cf, method) {
  const base = METHOD_BASE[method] || METHOD_BASE.Other;
  const scale = base.um / 600;                         // espresso adjusts in smaller µm steps
  let um = base.um, temp = base.temp; const reasons = [`${method}: typical start ≈${base.um}µm, ${base.temp}°C, 1:${base.ratio}`];
  const hotMethod = method !== 'Cold Brew';
  const add = (dum, dt, why) => { um += dum * scale; if (hotMethod) temp += dt; reasons.push(why); };
  if (cf) {
    const ra = ROAST_ADJ[cf.roastLevel];
    if (ra && (ra[0] || ra[1])) add(ra[0], ra[1], ra[0] < 0 ? `${escHtml(cf.roastLevel)} roast: finer and hotter (denser, less soluble)` : `${escHtml(cf.roastLevel)} roast: coarser and cooler (extracts easily, bitterness)`);
    const alt = parseFloat(cf.masl);
    if (alt >= 1800) add(-20, 1, `Grown at ${alt}m: dense bean, a little finer and hotter`);
    else if (alt > 0 && alt < 1200) add(20, -1, `Grown at ${alt}m: softer bean, a little coarser and cooler`);
    if (FERMENTY.includes(cf.process)) add(20, -1, `${escHtml(cf.process)} process: extracts readily, slightly coarser and cooler`);
    else if (cf.process === 'Honey') add(10, 0, 'Honey process: slightly coarser');
    else if (cf.process === 'Wet Hulled') add(10, -1, 'Wet hulled: slightly coarser and cooler');
    if (cf.decaf) add(20, -2, 'Decaf: extracts faster, coarser and cooler');
    const age = roastAgeToday(cf);
    if (age !== null && age < 7) reasons.push(`Only ${age} day${age !== 1 ? 's' : ''} off roast: expect a lively bloom${method === 'Espresso' ? '; shots may run fast' : ''}`);
  }
  if (hotMethod) temp = Math.min(100, Math.round(temp));
  return { um: Math.round(um), temp, ratio: base.ratio, reasons };
}

function coffeeSimilarity(a, b) {
  if (!a || !b) return 0;
  const order = ['Light','Light-Medium','Medium','Medium-Dark','Dark'];
  let s = 0;
  if (a.process && a.process === b.process) s += 0.3;
  if (a.roastLevel && b.roastLevel) { const d = Math.abs(order.indexOf(a.roastLevel) - order.indexOf(b.roastLevel)); s += d === 0 ? 0.25 : d === 1 ? 0.1 : 0; }
  if (a.country && a.country === b.country) s += 0.15;
  if (a.varietal && b.varietal && a.varietal.toLowerCase() === b.varietal.toLowerCase()) s += 0.15;
  const ma = parseFloat(a.masl), mb = parseFloat(b.masl);
  if (ma > 0 && mb > 0 && Math.abs(ma - mb) <= 200) s += 0.15;
  return s;
}
function describeMatch(a, b) {
  const bits = [];
  if (a.process && a.process === b.process) bits.push(a.process.toLowerCase());
  if (a.roastLevel && a.roastLevel === b.roastLevel) bits.push(a.roastLevel.toLowerCase() + ' roast');
  if (a.country && a.country === b.country) bits.push(a.country);
  return bits.join(', ');
}

function computeSuggestion(cfId, method) {
  const cf = state.coffees.find(c => c.id === cfId);
  const isGood = r => r.extraction === 'good' || (r.rating >= 7 && r.extraction !== 'under' && r.extraction !== 'over');
  // 1. This coffee already dialled in with this method -> use its best
  const own = brewsFor(cfId).filter(r => r.method === method && isGood(r)).sort((a, b) => (b.rating || 0) - (a.rating || 0) || (tsOf(b) - tsOf(a)))[0];
  if (own) {
    const d = parseFloat(own.dose), y = parseFloat(own.yield);
    return { source: 'coffee', um: brewMicrons(own), grindRaw: own.grind, grinderId: own.grinderId, temp: parseFloat(own.temp) || null,
      ratio: d > 0 && y > 0 ? y / d : null, recipeId: own.recipeId || null,
      reasons: [`Your ${own.rating ? own.rating + '/10 ' : ''}brew of this coffee on ${fmtDate(own.createdAt, {day:'numeric', month:'short'})}`] };
  }
  // 2. Rules, shifted by the user's own good brews on other coffees (similarity-weighted)
  const rule = ruleSuggestion(cf, method);
  const others = state.recipes.filter(r => r.coffeeId !== cfId && r.method === method && isGood(r));
  let dUm = 0, wUm = 0, dT = 0, wT = 0, dR = 0, wR = 0, best = null, bestSim = -1; const recipeVotes = {};
  others.forEach(r => {
    const oc = state.coffees.find(c => c.id === r.coffeeId); if (!oc) return;
    const sim = coffeeSimilarity(cf, oc), w = 0.3 + sim;       // every good brew counts a little; similar ones count more
    const ref = ruleSuggestion(oc, method);
    const um = brewMicrons(r); if (um != null) { dUm += w * (um - ref.um); wUm += w; }
    const t = parseFloat(r.temp); if (t > 0 && method !== 'Cold Brew') { dT += w * (t - ref.temp); wT += w; }
    const d = parseFloat(r.dose), y = parseFloat(r.yield); if (d > 0 && y > 0) { dR += w * (y / d - ref.ratio); wR += w; }
    if (r.recipeId) recipeVotes[r.recipeId] = (recipeVotes[r.recipeId] || 0) + w;
    if (sim > bestSim) { bestSim = sim; best = oc; }
  });
  const K = 2;                                                  // shrink towards the rules when there's little data
  const res = { source: others.length ? 'personal' : 'rules', um: rule.um, temp: rule.temp, ratio: rule.ratio, reasons: rule.reasons.slice(), recipeId: null };
  if (wUm) { const off = dUm / (wUm + K); res.um = Math.round(rule.um + off); if (Math.abs(off) >= 10) res.reasons.push(`Your good ${method} brews run ${off < 0 ? 'finer' : 'coarser'} than typical: ${off > 0 ? '+' : ''}${Math.round(off)}µm`); }
  if (wT) { const off = dT / (wT + K); res.temp = Math.min(100, Math.round(rule.temp + off)); if (Math.abs(off) >= 0.5) res.reasons.push(`You tend to brew ${off > 0 ? 'hotter' : 'cooler'}: ${off > 0 ? '+' : ''}${off.toFixed(1)}°C`); }
  if (wR) { res.ratio = Math.round((rule.ratio + dR / (wR + K)) * 10) / 10; }
  if (others.length) res.reasons.push(`Based on ${others.length} of your good ${method} brew${others.length !== 1 ? 's' : ''}${best && bestSim >= 0.25 && describeMatch(cf || {}, best) ? `, closest match ${escHtml(best.name)} (${describeMatch(cf || {}, best)})` : ''}`);
  const topRecipe = Object.entries(recipeVotes).sort((a, b) => b[1] - a[1])[0];
  if (topRecipe) res.recipeId = topRecipe[0];
  else if (RECIPES[method] && RECIPES[method].length) res.recipeId = RECIPES[method][0].id;
  return res;
}

let suggestionSuppressed = false, lastSuggestion = null;
function renderBrewSuggestion() {
  const el = document.getElementById('brew-suggestion'); if (!el) return;
  const editing = !!document.getElementById('r-edit-id')?.value;
  if (appSettings.suggestedStart === false || suggestionSuppressed || editing || !state.selectedCoffeeId || brewsFor(state.selectedCoffeeId).length) { el.innerHTML = ''; lastSuggestion = null; return; }
  const method = state.selectedMethod;
  const cf = state.coffees.find(c => c.id === state.selectedCoffeeId);
  const s = computeSuggestion(state.selectedCoffeeId, method);
  const g = selectedGrinder();
  // Grind in the user's current grinder: same grinder as the source brew -> reuse the raw setting
  let grindText, setting = null;
  if (s.source === 'coffee' && s.grindRaw && (!g || s.grinderId === (g && g.id))) { setting = s.grindRaw; grindText = `Grind <b>${escHtml(s.grindRaw)}</b>${s.um ? ` (≈${s.um}µm)` : ''}`; }
  else if (g && s.um != null) { setting = micronsToSetting(g, s.um); grindText = `Grind <b>${setting}</b> on ${g.model} (≈${s.um}µm)`; }
  else if (s.um != null) grindText = `Grind ≈<b>${s.um}µm</b> (${grindWord(s.um)}) — pick a grinder for a setting`;
  else grindText = s.grindRaw ? `Grind <b>${escHtml(s.grindRaw)}</b>` : '';

  // Recipes are fixed. A recipe the user picked is always kept; otherwise we may propose one.
  // Only grind and water temperature are tuned to the coffee — never dose, water, ratio or step timings.
  const recipes = getAllRecipesForMethod(method);
  const chosen = state.selectedRecipeId ? recipes.find(x => x.id === state.selectedRecipeId) : null;
  const rec = chosen || (s.recipeId ? recipes.find(x => x.id === s.recipeId) : null);
  let temp = s.temp, reasons = s.reasons.slice();
  const base = METHOD_BASE[method] || METHOD_BASE.Other;
  if (rec && s.source !== 'coffee') {
    reasons[0] = `${method}: typical grind ≈${base.um}µm`;
    if (rec.temp && method !== 'Cold Brew') {
      const delta = ruleSuggestion(cf, method).temp - base.temp;
      temp = Math.min(100, Math.round(rec.temp + delta));
      reasons.push(`Temperature starts from the recipe's ${rec.temp}°C${delta ? `, ${delta > 0 ? '+' : ''}${delta}°C for this coffee` : ''}${rec.temp + delta > 100 ? ' (capped at 100°C)' : ''}`);
    }
  }
  const recRatio = rec ? (rec.ratio || (rec.dose && rec.water ? '1:' + (rec.water / rec.dose).toFixed(1) : '')) : '';
  const ratioText = rec ? recRatio : (s.ratio ? '1:' + (Math.round(s.ratio * 10) / 10) : '');
  lastSuggestion = { ...s, temp, setting, recipe: rec, recipeChosen: !!chosen };
  const label = s.source === 'coffee' ? 'Your best for this coffee' : 'Suggested start';
  const basis = s.source === 'coffee' ? 'Your best-rated brew of this coffee' : s.source === 'personal' ? 'Learned from your brews' : 'Based on general brewing guidance';
  const parts = [grindText, temp && method !== 'Cold Brew' ? `<b>${temp}°C</b>` : ''].filter(Boolean);
  el.innerHTML = `<div class="suggest-card">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span class="suggest-label"><svg class="ico" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/></svg> ${label}</span>
      <button type="button" class="suggest-apply" data-on-click="applyBrewSuggestion()">Apply</button>
    </div>
    <div class="suggest-main">${parts.join(' · ')}${!rec && ratioText ? ` · <b>${ratioText}</b>` : ''}</div>
    ${rec ? `<div class="suggest-sub suggest-one">${chosen ? 'Your recipe' : 'Recipe'}: ${escHtml(rec.name)}${recRatio ? ' · ' + recRatio : ''}</div>` : ''}
    <details class="suggest-why"><summary>Why?</summary><div class="suggest-sub" style="margin:6px 0 2px">${basis}${rec ? ` · ${recipeScale(rec) ? 'recipe steps adjusted to your dose and water' : 'recipe dose, water and steps as written'}` : ''}</div><ul>${reasons.map(r => `<li>${r}</li>`).join('')}</ul>
      <div class="suggest-sub" style="margin-top:6px">A starting point, not a rule. Taste, then use Plan next to fine-tune.</div></details>
  </div>`;
}
function applyBrewSuggestion() {
  const s = lastSuggestion; if (!s) return;
  const method = state.selectedMethod;
  const sel = document.getElementById('r-recipe-select');
  // Fill in a proposed recipe only when none is chosen; never replace the user's recipe
  if (s.recipe && !s.recipeChosen && sel && !isEspressoMethod(method)) { sel.value = s.recipe.id; onRecipeChange(sel); }
  if (!s.recipe) {
    // No recipe: fill dose and water/yield from the suggested ratio
    const base = METHOD_BASE[method] || METHOD_BASE.Other;
    const doseEl = document.getElementById('r-dose'), yEl = document.getElementById('r-yield');
    if (!doseEl.value) doseEl.value = base.dose;
    if (s.ratio) yEl.value = Math.round(parseFloat(doseEl.value) * s.ratio);
  }
  if (s.setting != null && s.setting !== '') document.getElementById('r-grind').value = s.setting;
  if (s.temp && method !== 'Cold Brew') document.getElementById('r-temp').value = s.temp;
  updateGrindMicrons(); updateBrewLive();
  showToast(s.recipe ? 'Grind and temperature set' : 'Starting point applied');
}

// Grinder converter (grinder detail)
function updateGrinderConverter(gid) {
  const g = GRINDERS.find(x => x.id === gid); if (!g) return;
  const v = document.getElementById('conv-setting').value, out = document.getElementById('conv-out');
  const um = settingToMicrons(g, v);
  if (um == null) { out.innerHTML = ''; return; }
  const fav = state.favouriteGrinderId && state.favouriteGrinderId !== gid ? GRINDERS.find(x => x.id === state.favouriteGrinderId) : null;
  const fits = BREW_METHODS.filter(m => um >= m.min && um <= m.max && ['Espresso','Moka Pot','AeroPress','Pourover','French Press','Cold Brew'].includes(m.name)).map(m => m.name);
  out.innerHTML = `≈ <b>${um}µm</b> (${grindWord(um)})${fits.length ? ' · suits ' + fits.join(', ') : ''}` +
    (fav ? `<br>Same grind on your ${fav.model}: <b>${micronsToSetting(fav, um)}</b>` : '');
}

function planUmLine(d) {
  const g = d.from.grinderId ? GRINDERS.find(x => x.id === d.from.grinderId) : null;
  const a = settingToMicrons(g, d.grindBase), b = settingToMicrons(g, d.grind);
  return a != null ? `<div style="font-size:11px;color:var(--text-muted)">≈${a}${a !== b ? ' → ' + b : ''}µm</div>` : '';
}
function methodSettingsGuide(g) {
  const names = ['Espresso','Moka Pot','AeroPress','Pourover','French Press','Cold Brew'];
  const rows = BREW_METHODS.filter(m => names.includes(m.name) && g.min <= m.max && g.max >= m.min).map(m => {
    const a = micronsToSetting(g, Math.max(m.min, g.min)), b = micronsToSetting(g, Math.min(m.max, g.max));
    return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)"><span>${m.name}</span><b>${a === b ? a : a + '–' + b}</b></div>`;
  });
  return rows.length ? `<div style="font-size:12px;color:var(--text);margin-top:12px"><div style="font-size:11px;letter-spacing:0.6px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Where to start on this grinder</div>${rows.join('')}</div>` : '';
}


function grinderRangeLabel(g) {
  if (g.stepless) return g.clickMin !== undefined ? `stepless dial ${g.clickMin}–${g.clickMax}` : 'stepless';
  return g.clickMin !== undefined ? `${g.clickMin}–${g.clickMax} clicks` : `${g.settings} settings`;
}
// Slider resolution: 0.1 on stepless grinders, the grinder's own click size on stepped ones
function planGrindStep(g, method, rawGrind) {
  const sc = grinderScale(g);
  if (!sc) return grindStep(rawGrind);
  if (sc.stepless) return 0.1;
  return sc.step || 1;
}
// One Finer/Coarser nudge in Plan next: the same change in particle size on every grinder, set against the
// Timemore Sculptor 078S: half a number for filter (≈28µm), a fifth of a number for espresso (≈11µm), where small
// changes matter more. Rounded to what the grinder can do, and never less than one step.
const NUDGE_REF_GRINDER = 'e29', NUDGE_REF_SETTINGS = 0.5, NUDGE_REF_SETTINGS_ESPRESSO = 0.2;
function nudgeMicrons(method) {
  const sc = grinderScale(GRINDERS.find(g => g.id === NUDGE_REF_GRINDER));
  const n = isEspressoMethod(method || '') ? NUDGE_REF_SETTINGS_ESPRESSO : NUDGE_REF_SETTINGS;
  return sc ? n * sc.per : n * 55.6;
}
function planGrindNudge(g, method, rawGrind) {
  const step = planGrindStep(g, method, rawGrind), sc = grinderScale(g);
  if (!sc || !(sc.per > 0)) return step;
  const n = Math.max(1, Math.round(nudgeMicrons(method) / sc.per / step));
  return roundTo(n * step, step);
}
// Slider range: roughly ±150µm around the last setting (at least ±10 steps), kept inside the grinder's range
function planGrindRange(d) {
  const g = d.from.grinderId ? GRINDERS.find(x => x.id === d.from.grinderId) : null;
  const sc = grinderScale(g), st = d.grindStepSize, base = d.grindBase;
  let w = Math.max(10 * st, sc ? 150 / sc.per : 10 * st);
  w = Math.ceil(w / st) * st;
  let lo = base - w, hi = base + w;
  if (sc) { lo = Math.max(lo, sc.s0); hi = Math.min(hi, sc.s1); }
  lo = Math.max(0, lo);
  return { lo: roundTo(Math.floor(lo / st) * st, st), hi: roundTo(Math.ceil(hi / st) * st, st) };
}
function planStepHint(d) {
  const g = d.from.grinderId ? GRINDERS.find(x => x.id === d.from.grinderId) : null;
  const sc = grinderScale(g); if (!sc || d.grindBase === null) return '';
  const um = Math.round(d.grindStepSize * sc.per);
  const n = d.grindNudge || d.grindStepSize, unit = v => sc.stepless ? '' : v === 1 ? ' click' : ' clicks';
  return `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">Finer / Coarser moves ${n}${unit(n)} (≈${Math.round(n * sc.per)}µm) · slider fine-tunes in ${g && g.snap ? g.snap.map(([x, y, st], i) => st + (i < g.snap.length - 1 ? ' to ' + y : '')).join(', then ') : d.grindStepSize + unit(d.grindStepSize) + ' (≈' + um + 'µm)'}</div>`;
}

function playEnter(el, cls) {
  if (!el || reduceMotion()) return;
  el.classList.remove('view-enter','slide-in-right','slide-in-left');
  void el.offsetWidth;                // restart the animation if it was already applied
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), { once:true });
}
let detailShownId = null;

// ==================== BREW TIMER ====================
// Uses wall-clock timestamps, so it stays accurate if the phone sleeps or the app is backgrounded.
let brewTimer = { startedAt:null, elapsed:0, tick:null, wakeLock:null };
function brewTimerSecs() { return Math.floor((brewTimer.elapsed + (brewTimer.startedAt ? Date.now()-brewTimer.startedAt : 0)) / 1000); }
function renderBrewTimer() {
  const d = document.getElementById('brew-timer-display'), t = document.getElementById('brew-timer-toggle'), rs = document.getElementById('brew-timer-reset');
  if (!d) return;
  const s = brewTimerSecs(); d.textContent = Math.floor(s/60) + ':' + String(s%60).padStart(2,'0');
  const running = !!brewTimer.startedAt;
  d.classList.toggle('running', running);
  t.textContent = running ? '■ Stop' : (s ? '▶ Resume' : '▶ Start brew');
  t.className = 'brew-timer-btn ' + (running ? 'stop' : 'start');
  rs.style.display = (!running && s) ? '' : 'none';
  const ex = document.getElementById('brew-timer-expand'); if (ex) ex.style.display = running ? '' : 'none';
  const card = document.querySelector('#modal-recipe .brew-timer'); if (card) card.hidden = !(running || s > 0);   // Start brew lives in the footer until a brew has begun
  renderStartBtn();
  try { brewSoundTick(); } catch(e) {}
  renderStepGuide();
  renderBrewMode();
  // Keeping the screen awake is only useful for a normal brew: let it sleep again after 20 minutes
  if (running && s >= WAKE_LOCK_MAX_SECS && brewTimer.wakeLock) { try { brewTimer.wakeLock.release(); } catch(e) {} brewTimer.wakeLock = null; }
  renderTimerPill();
}
const WAKE_LOCK_MAX_SECS = 20 * 60;
// A running timer stays visible on every screen while Log Brew is closed
function renderTimerPill() {
  const pill = document.getElementById('timer-pill'); if (!pill) return;
  const running = !!brewTimer.startedAt, sheetOpen = document.getElementById('modal-recipe')?.classList.contains('open');
  const show = running && !sheetOpen;
  pill.hidden = !show;
  if (show) { const s = brewTimerSecs(); pill.querySelector('.tp-time').textContent = Math.floor(s/60) + ':' + String(s%60).padStart(2,'0'); }
}
function reopenBrewSheet() { openModal('modal-recipe'); renderTimerPill(); if (brewTimer.startedAt) openBrewMode(); }
// ---- Brew sounds (optional): beeps at 3, 2, 1 seconds before each step and a chime as it starts ----
// Made with Web Audio (no sound files). Phones only allow audio after a tap, so it's unlocked when you press Start brew.
let brewAudio = null, brewSoundState = { idx: null, beeped: -1 };
const brewSoundOn = () => appSettings.brewSound === true;
function unlockBrewAudio() {
  if (!brewSoundOn()) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    if (!brewAudio) brewAudio = new AC();
    if (brewAudio.state === 'suspended') brewAudio.resume();
  } catch(e) {}
}
function brewTone(freq, start, dur, vol) {
  const ctx = brewAudio, o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + start;
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.03);
}
function playBrewSound(kind) {
  if (!brewSoundOn() || !brewAudio || brewAudio.state !== 'running') return;
  try {
    if (kind === 'beep') brewTone(880, 0, 0.12, 0.25);
    else { brewTone(784, 0, 0.35, 0.3); brewTone(1175, 0.14, 0.5, 0.28); }   // two-note chime: a new step
  } catch(e) {}
}
// Called on every timer tick while brewing, whether brew mode is open or minimised
function brewSoundTick() {
  if (!brewSoundOn() || !brewTimer.startedAt) { brewSoundState = { idx: null, beeped: -1 }; return; }
  const steps = timedSteps(); if (steps.length < 2) return;
  const rec = state.selectedRecipeId ? getAllRecipesForMethod(state.selectedMethod).find(x => x.id === state.selectedRecipeId) : null;
  const fin = recipeFinishSecs(rec, steps); if (fin) steps.push({ at: fin, text: 'Finish' });   // the finish gets the same countdown and chime
  const s = brewTimerSecs(); let idx = -1; steps.forEach((st, i) => { if (s >= st.at) idx = i; });
  if (brewSoundState.idx === null) { brewSoundState = { idx, beeped: -1 }; return; }        // no sound for the step you start on
  if (idx !== brewSoundState.idx) { brewSoundState = { idx, beeped: -1 }; if (idx > 0) playBrewSound('chime'); return; }
  const next = steps[idx + 1]; if (!next) return;
  const left = next.at - s;
  if (left >= 1 && left <= 3 && brewSoundState.beeped !== left) { brewSoundState.beeped = left; playBrewSound('beep'); }
}
function toggleBrewSound() {
  appSettings.brewSound = !brewSoundOn(); saveSettings(); syncSuggestedStartSwitch();
  if (brewSoundOn()) { unlockBrewAudio(); setTimeout(() => playBrewSound('chime'), 60); showToast('Brew sounds on: beeps at 3, 2, 1, then a chime'); }
}
async function toggleBrewTimer() {
  if (brewTimer.startedAt) { stopBrewTimer(); return; }
  unlockBrewAudio(); brewSoundState = { idx: null, beeped: -1 };
  brewTimer.startedAt = Date.now();
  clearInterval(brewTimer.tick);
  brewTimer.tick = setInterval(renderBrewTimer, 250);
  if (navigator.vibrate) navigator.vibrate(20);
  openBrewMode();
  renderBrewTimer();
  try { if (navigator.wakeLock) brewTimer.wakeLock = await navigator.wakeLock.request('screen'); } catch(e) {}
  if (!brewTimer.startedAt && brewTimer.wakeLock) { try { brewTimer.wakeLock.release(); } catch(e) {} brewTimer.wakeLock = null; }   // stopped while the lock was being granted
}
function stopBrewTimer() {
  if (brewTimer.startedAt) { brewTimer.elapsed += Date.now() - brewTimer.startedAt; brewTimer.startedAt = null; }
  clearInterval(brewTimer.tick); brewTimer.tick = null;
  try { brewTimer.wakeLock && brewTimer.wakeLock.release(); } catch(e) {} brewTimer.wakeLock = null;
  const s = brewTimerSecs();
  if (s > 0) { ['r-time','r-time-mins','r-time-secs'].forEach(i => { const el=document.getElementById(i); if (el) el.value=''; }); setTimeFields(s); }
  if (navigator.vibrate) navigator.vibrate([20,60,20]);
  renderBrewTimer();
}
function resetBrewTimer() {
  clearInterval(brewTimer.tick);
  try { brewTimer.wakeLock && brewTimer.wakeLock.release(); } catch(e) {}
  brewTimer = { startedAt:null, elapsed:0, tick:null, wakeLock:null };
  lastGuideIdx = -1;
  closeBrewMode();
  renderBrewTimer();
}

// ---- Full-screen brew mode: big clock, current step, whole recipe as a timeline ----
let brewModeIdx = null;
const brewModeEl = () => document.getElementById('brew-mode');
const brewModeOpen = () => !!brewModeEl()?.classList.contains('open');
function openBrewMode() {
  const el = brewModeEl(); if (!el || brewModeOpen()) return;
  el.hidden = false; el.classList.add('open'); brewModeIdx = null;
  try { a11yOpened('brew-mode'); } catch(e) {}
  renderBrewMode();
}
function closeBrewMode() {
  const el = brewModeEl(); if (!el || !brewModeOpen()) return;
  el.classList.remove('open');
  try { a11yClosed('brew-mode'); } catch(e) {}
  el.hidden = true;
}
function minimiseBrewMode() { closeBrewMode(); }
function stopBrewFromMode() {  // → How was it?
  stopBrewTimer(); closeBrewMode();
  if (scoreLaterOn() && !document.getElementById('r-edit-id')?.value) openBrewDone();
  else setBrewPage('taste');
}
function confirmCancelBrew() {
  confirmAction({ title:'Cancel this brew?', text:"The timer will reset to 0:00. Everything else you've entered stays as it is.",
    button:'Yes, cancel brew', cancel:'Keep brewing', onYes() { resetBrewTimer(); showToast('Brew cancelled'); } });
}
// "James Hoffmann — Ultimate AeroPress" → title "Ultimate AeroPress", by "James Hoffmann"
function recipeTitleParts(rec) {
  if (!rec) return { title: state.selectedMethod || '', by: '' };
  const name = String(rec.name || ''), m = name.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  if (m) return { title: m[2], by: rec.author || m[1] };
  return { title: name, by: rec.author && !name.includes(rec.author) ? rec.author : '' };
}
// When a recipe should be finished (seconds): its total time, or the last step's own duration ("press over 30 seconds")
function recipeFinishSecs(rec, steps) {
  const last = steps[steps.length - 1]; if (!last) return null;
  const tt = rec && /^(\d{1,2}):(\d{2})$/.exec(String(rec.totalTime || ''));
  if (tt) { const t = +tt[1] * 60 + +tt[2]; if (t > last.at) return t; }
  const txt = last.text.toLowerCase();
  let m = txt.match(/(\d+)\s*[–-]\s*(\d+)\s*(?:s|sec|secs|seconds)\b/); if (m) return last.at + +m[2];
  m = txt.match(/over\s+(?:about\s+|~)?(\d+)\s*(?:s|sec|secs|seconds)\b/); if (m) return last.at + +m[1];
  m = txt.match(/over\s+(?:about\s+|~)?(\d+)\s*(?:min|mins|minutes)\b/); if (m) return last.at + 60 * +m[1];
  return null;
}
// Fit the step list: spread evenly if everything fits, otherwise scroll so the step just finished is at the top
// (then the current one), with faded edges to show there's more
function layoutBrewSteps(smooth) {
  const list = document.getElementById('bm-steps'); if (!list || !list.classList.contains('bm-steps')) return;
  const lis = [...list.children]; if (!lis.length) return;
  const content = lis.reduce((s, x) => s + x.offsetHeight, 0) + 16 * (lis.length - 1);
  const fits = content <= list.clientHeight - 6;
  list.classList.toggle('even', fits); list.classList.toggle('over', !fits);
  if (fits) { list.scrollTop = 0; return; }
  const cur = list.querySelector('li.now') || list.querySelector('li.next') || lis[0];
  // Start the list at the step just done if the current and next steps still fit below it; else at the current step;
  // on very small screens at the next step (the current one is already shown in large text above the list)
  const prev = cur.classList.contains('now') ? cur.previousElementSibling : null, nxt = cur.classList.contains('now') ? cur.nextElementSibling : null;
  const end = (nxt || cur).offsetTop + (nxt || cur).offsetHeight, fit = e => end - e.offsetTop + 16 <= list.clientHeight;
  const anchor = prev && fit(prev) ? prev : fit(cur) ? cur : (nxt || cur);
  const top = Math.max(0, anchor.offsetTop - 8);
  try { list.scrollTo({ top, behavior: smooth && !reduceMotion() ? 'smooth' : 'auto' }); } catch(e) { list.scrollTop = top; }
}
window.addEventListener('resize', () => { try { if (brewModeOpen()) layoutBrewSteps(false); } catch(e) {} });
function renderBrewMode() {
  if (!brewModeOpen()) return;
  const $ = id => document.getElementById(id), fmt = n => Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
  const set = (id, t) => { const e = $(id); if (e && e.textContent !== t) e.textContent = t; };
  const s = brewTimerSecs();
  set('bm-clock', fmt(s)); $('bm-clock').classList.toggle('long', s >= 600);
  const cf = state.coffees.find(c => c.id === state.selectedCoffeeId);
  const rec = state.selectedRecipeId ? getAllRecipesForMethod(state.selectedMethod).find(x => x.id === state.selectedRecipeId) : null;
  set('bm-coffee', cf ? cf.name : 'Brewing');
  // Recipe name first (not cut off), author underneath in smaller text
  const rn = recipeTitleParts(rec), key = rn.title + '|' + rn.by;
  const re = $('bm-recipe'); if (re && re.dataset.k !== key) { re.dataset.k = key; re.innerHTML = `<span class="rn">${escHtml(rn.title)}</span>${rn.by ? `<span class="ra">${escHtml(rn.by)}</span>` : ''}`; }
  const v = id => ($(id)?.value || '').trim(), isEsp = isEspressoMethod(state.selectedMethod || 'Espresso');
  set('bm-meta', [v('r-dose') && v('r-dose') + 'g', v('r-yield') && v('r-yield') + (isEsp ? 'g out' : 'ml'), v('r-temp') && v('r-temp') + '°C', v('r-grind') && 'grind ' + v('r-grind')].filter(Boolean).join(' · '));
  const steps = timedSteps(), guide = $('bm-guide'), list = $('bm-steps'), stop = $('bm-stop');
  if (steps.length < 2) {            // no timed recipe: just the clock
    guide.style.display = 'none'; list.innerHTML = ''; list.className = 'bm-spacer'; brewModeIdx = null;
    stop.classList.remove('final'); set('bm-stop', '■ Stop'); return;
  }
  guide.style.display = ''; if (!list.classList.contains('bm-steps')) list.className = 'bm-steps';   // keep the layout classes between ticks
  let idx = -1; steps.forEach((st, i) => { if (s >= st.at) idx = i; });
  const cur = steps[idx], next = steps[idx + 1];
  if (idx !== brewModeIdx) {
    const first = brewModeIdx === null;
    brewModeIdx = idx;
    set('bm-now', cur ? cur.text : 'Get ready…');
    list.innerHTML = steps.map((st, i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : i === idx + 1 ? 'next' : ''}"><b>${fmt(st.at)}</b><span>${i < idx ? '✓ ' : i === idx ? '● ' : ''}${escHtml(st.text)}</span></li>`).join('');
    layoutBrewSteps(!first);      // when the list has to scroll, start it at the next step: the current one is already shown large above
    if (!first && !reduceMotion()) { guide.classList.remove('bm-pulse'); void guide.offsetWidth; guide.classList.add('bm-pulse'); }
  }
  set('bm-now-label', cur ? `Now · step ${idx + 1} of ${steps.length}` : 'Starting');
  const from = cur ? cur.at : 0;
  // On the last step, count down to when the recipe should finish (if it says), instead of counting up
  const fin = !next ? recipeFinishSecs(rec, steps) : null;
  const target = next ? next.at : fin;
  $('bm-bar').style.width = (target ? Math.min(100, Math.max(0, (s - from) / Math.max(1, target - from) * 100)) : 100) + '%';
  set('bm-next-at', next ? 'Next at ' + fmt(next.at) : fin ? 'Finish by about ' + fmt(fin) : 'Last step');
  set('bm-next-in', next ? 'in ' + fmt(Math.max(0, next.at - s)) : fin ? (s < fin ? 'in ' + fmt(fin - s) : '+' + fmt(s - fin) + ' over') : '+' + fmt(Math.max(0, s - from)));
  $('bm-next-at').classList.toggle('fin', !next && !!fin);
  // Get ready: the last 5 seconds before the next step (or the finish) glow sage
  const soon = !!target && target - s > 0 && target - s <= 5 && !!brewTimer.startedAt;
  guide.classList.toggle('soon', soon); document.querySelector('.bm-next')?.classList.toggle('soon', soon);
  stop.classList.toggle('final', !next); set('bm-stop', next ? '■ Stop' : '■ Stop & save time');
}
document.addEventListener('visibilitychange', async () => {
  if (document.hidden) return;
  renderBrewTimer();
  // Wake locks are released when the app is hidden; re-acquire if still brewing
  if (brewTimer.startedAt && navigator.wakeLock && brewTimerSecs() < WAKE_LOCK_MAX_SECS) { try { brewTimer.wakeLock = await navigator.wakeLock.request('screen'); } catch(e) {} }
});

// ==================== LOG BREW: THREE SCREENS ====================
// 1 · Choose (coffee, grinder, method, recipe) → 2 · Dial in (numbers; Start brew) → brew mode → 3 · How was it? (scores; Save)
let brewPage = 'choose';
const BREW_PAGES = ['choose', 'dial', 'taste'];
const BREW_PAGE_LABELS = { choose: 'Step 1 of 3 · Choose', dial: 'Step 2 of 3 · Dial in', taste: 'Step 3 of 3 · How was it?' };
function setBrewPage(p) {
  if (p === 'setup') p = 'dial';          // older name for the numbers screen
  brewPage = BREW_PAGES.includes(p) ? p : 'choose';
  const $ = id => document.getElementById(id); if (!$('r-setup')) return;
  const i = BREW_PAGES.indexOf(brewPage);
  $('r-setup').hidden = brewPage === 'taste';
  $('r-choose').hidden = brewPage !== 'choose'; $('r-dial').hidden = brewPage !== 'dial'; $('r-taste-page').hidden = brewPage !== 'taste';
  $('r-foot-choose').hidden = brewPage !== 'choose'; $('r-foot-setup').hidden = brewPage !== 'dial'; $('r-foot-taste').hidden = brewPage !== 'taste';
  $('r-back-setup').hidden = brewPage === 'choose' || isScoreOnly();
  $('r-step-label').textContent = BREW_PAGE_LABELS[brewPage];
  document.getElementById('modal-recipe').dataset.page = brewPage;
  [...$('r-prog').children].forEach((b, k) => b.classList.toggle('on', k <= i));
  $('r-summary').hidden = brewPage !== 'taste';
  if (brewPage === 'taste') { renderBrewSummary(); try { renderDropsReminder(); } catch(e) {} }
  if (brewPage === 'choose') { try { renderWaterPicker(); } catch(e) {} }
  if (brewPage === 'dial') { renderDialSummary(); setTimeout(() => { try { syncBrewSliders(); } catch(e) {} }, 0); }
  renderStartBtn();
  const ae = document.activeElement, pg = ae && ae.closest && ae.closest('[data-brew-page]');
  if (pg && pg.hidden) ae.blur();       // don't leave focus in a screen that's just been put away
  const m = document.querySelector('#modal-recipe .modal'); if (m) m.scrollTop = 0;
}
function brewPageBack() { setBrewPage(brewPage === 'taste' ? 'dial' : 'choose'); }
function renderDialSummary() {
  const el = document.getElementById('r-dial-summary'); if (!el) return;
  const cf = state.coffees.find(c => c.id === state.selectedCoffeeId), g = selectedGrinder();
  const rec = state.selectedRecipeId ? getAllRecipesForMethod(state.selectedMethod).find(x => x.id === state.selectedRecipeId) : null;
  el.innerHTML = [cf && cf.name, g ? g.model : '', rec ? rec.name.split('—').pop().trim() : state.selectedMethod].filter(Boolean).map(b => `<span title="${escHtml(b)}">${escHtml(b)}</span>`).join('');
}
function renderBrewSummary() {
  const v = id => (document.getElementById(id)?.value || '').trim();
  const cf = state.coffees.find(c => c.id === state.selectedCoffeeId), isEsp = isEspressoMethod(state.selectedMethod || 'Espresso');
  const rec = state.selectedRecipeId ? getAllRecipesForMethod(state.selectedMethod).find(x => x.id === state.selectedRecipeId) : null;
  const t = getBrewTimeSecs();
  const bits = [cf && cf.name, rec ? rec.name.split('—').pop().trim() : state.selectedMethod, v('r-grind') && 'Grind ' + v('r-grind'),
    v('r-dose') && (v('r-dose') + 'g' + (v('r-yield') ? ' → ' + v('r-yield') + (isEsp ? 'g' : 'ml') : '')), v('r-temp') && v('r-temp') + '°C', t && formatBrewTime(t, state.selectedMethod)].filter(x => x && x !== '—');
  document.getElementById('r-summary').innerHTML = bits.map(b => `<span>${escHtml(b)}</span>`).join('');
}
function renderStartBtn() {
  const b = document.getElementById('r-start-btn'), skip = document.getElementById('r-skip-btn'); if (!b) return;
  const editing = !!document.getElementById('r-edit-id')?.value, running = !!brewTimer.startedAt, s = brewTimerSecs();
  const label = editing || (s > 0 && !running) ? 'Next ›' : running ? 'Back to the timer' : '▶ Start brew';
  if (b.textContent !== label) b.textContent = label;
  if (skip) { skip.hidden = editing || (s > 0 && !running); skip.textContent = running ? 'Next ›' : 'Skip timer'; }
}
function startOrNext() {
  const editing = !!document.getElementById('r-edit-id')?.value, running = !!brewTimer.startedAt, s = brewTimerSecs();
  if (editing || (s > 0 && !running)) setBrewPage('taste');
  else if (running) openBrewMode();
  else toggleBrewTimer();
}
// Coffee and grinder lists show only the current choice; tapping it opens the full list, picking one closes it again
function compactSelector(el) {
  el.classList.add('compact');
  el.onclick = e => {
    if (!e.target.closest('.coffee-selector-item')) return;
    if (el.classList.contains('compact')) el.classList.remove('compact');
    else { el.classList.add('compact'); el.scrollTop = 0; }
  };
}

// ==================== SCORE LATER ====================
// A brew can be saved straight after brewing and scored once it has cooled. The Overview card is the dependable
// prompt; the notification is best-effort (there is no server, so it only fires while the app is still alive).
const scoreLaterOn = () => appSettings.scoreLaterPrompt !== false;
const remindMins = () => [5, 10, 15].includes(appSettings.scoreRemindMins) ? appSettings.scoreRemindMins : 10;
const awaitingBrews = () => state.recipes.filter(r => r.awaitingScore);
const isScoreOnly = () => !!document.getElementById('modal-recipe')?.classList.contains('score-only');
function toggleScoreLater() { appSettings.scoreLaterPrompt = !scoreLaterOn(); saveSettings(); syncSuggestedStartSwitch(); }
function setScoreOnly(on) {
  const m = document.getElementById('modal-recipe'); if (!m) return;
  m.classList.toggle('score-only', !!on);
  const sb = document.getElementById('r-save-btn'); if (sb) sb.textContent = on ? 'Save score' : 'Save brew';
  const lb = document.getElementById('r-later-btn'); if (lb) lb.style.display = (!on && scoreLaterOn()) ? '' : 'none';
  if (on) setBrewPage('taste');
  if (!on) { const sub = document.getElementById('r-modal-sub'); if (sub) sub.textContent = 'Dialling in a recipe'; }
}
function brewLine(r) {
  const isEsp = isEspressoMethod(r.method || 'Espresso');
  return [r.grind && 'Grind ' + r.grind, r.dose && r.yield ? `${r.dose}g → ${r.yield}${isEsp ? 'g' : 'ml'}` : r.dose ? r.dose + 'g' : '', r.temp && r.temp + '°C', r.time && formatBrewTime(r.time, r.method)].filter(x => x && x !== '—').join(' · ');
}
function agoText(iso) {
  const t = Date.parse(iso); if (isNaN(t)) return '';
  const m = Math.floor((Date.now() - t) / 60000);
  return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.floor(m / 60) + ' h ago' : fmtDate(iso);
}
function setRemindMins(n) {
  appSettings.scoreRemindMins = n; saveSettings();
  document.querySelectorAll('#bd-chips button').forEach(b => { const on = +b.dataset.mins === remindMins(); b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
}
function openBrewDone() {
  const v = id => (document.getElementById(id)?.value || '').trim();
  const cf = state.coffees.find(c => c.id === state.selectedCoffeeId), g = selectedGrinder();
  const draft = { method: state.selectedMethod, grind: v('r-grind'), dose: v('r-dose'), yield: v('r-yield'), temp: v('r-temp'), time: getBrewTimeSecs() };
  const isEsp = isEspressoMethod(draft.method || 'Espresso');
  document.getElementById('bd-sub').textContent = [cf && cf.name, draft.method].filter(Boolean).join(' · ');
  const rows = [
    draft.grind && `Grind <b>${escHtml(draft.grind)}</b>${g ? ` <span>${escHtml(g.brand + ' ' + g.model)}</span>` : ''}`,
    draft.dose && `${escHtml(draft.dose)}g${draft.yield ? ' → ' + escHtml(draft.yield) + (isEsp ? 'g' : 'ml') : ''}`,
    [draft.temp && escHtml(draft.temp) + '°C', draft.time && `<b>${escHtml(formatBrewTime(draft.time, draft.method))}</b>`].filter(Boolean).join(' · '),
  ].filter(Boolean);
  document.getElementById('bd-summary').innerHTML = rows.map(x => `<div>${x}</div>`).join('') || '<div><span>No recipe details entered yet</span></div>';
  setRemindMins(remindMins());
  try { renderDropsReminder(); } catch(e) {}
  openModal('modal-brew-done');
}
function brewDoneNow() { closeModal('modal-brew-done'); setBrewPage('taste'); }
function brewDoneLater() { closeModal('modal-brew-done'); saveBrewForLater(); }
function saveBrewForLater() {
  // Asked on the tap itself, which is the only moment a phone allows the question
  try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {}); } catch(e) {}
  saveRecipe({ later: remindMins() });
}
function scoreBrew(id) {
  const r = state.recipes.find(x => x.id === id); if (!r) return;
  document.querySelectorAll('.modal-overlay.open').forEach(m => { if (m.id !== 'modal-recipe') closeModal(m.id); });
  fillBrewModal(r, { editId: id, title: 'Score brew', keepResult: true });
  if (document.getElementById('r-edit-id')?.value !== id) return;      // the sheet didn't open
  setScoreOnly(true);
  const cf = state.coffees.find(c => c.id === r.coffeeId), t = new Date(r.createdAt);
  const when = isNaN(t) ? '' : t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('r-modal-sub').textContent = [cf && cf.name, when, brewLine(r)].filter(Boolean).join(' · ');
  document.querySelector('#modal-recipe .modal').scrollTop = 0;
}
function leaveUnscored(id) {
  const r = state.recipes.find(x => x.id === id); if (!r) return;
  delete r.awaitingScore; delete r.scoreRemindAt; delete r.scoreNotified;
  save(); scheduleScoreReminders(); rerenderCurrentView(); showToast('Left unscored — you can still edit it later');
}
function renderScorePending() {
  const el = document.getElementById('score-pending'); if (!el) return;
  const list = awaitingBrews();
  el.innerHTML = list.slice(0, 3).map(r => {
    const cf = state.coffees.find(c => c.id === r.coffeeId);
    return `<div class="score-card"><div class="score-card-top"><div class="score-card-label">Awaiting score${agoText(r.createdAt) ? ' · ' + agoText(r.createdAt) : ''}</div><button type="button" class="score-card-x" aria-label="Leave this brew unscored" data-on-click="leaveUnscored('${r.id}')">✕</button></div>
      <div class="score-card-name">${escHtml(cf ? cf.name : 'Unknown coffee')}</div>
      <div class="score-card-sub">${escHtml([r.method, brewLine(r)].filter(Boolean).join(' · '))}</div>
      <button type="button" class="btn-primary" data-on-click="scoreBrew('${r.id}')">Score this brew</button></div>`;
  }).join('') + (list.length > 3 ? `<div class="score-card-sub" style="margin:-6px 0 14px">+${list.length - 3} more awaiting a score in your brew log</div>` : '');
  try { if (list.length) navigator.setAppBadge && navigator.setAppBadge(list.length); else navigator.clearAppBadge && navigator.clearAppBadge(); } catch(e) {}
}
let scoreTimers = [];
function scheduleScoreReminders() {
  scoreTimers.forEach(clearTimeout); scoreTimers = [];
  awaitingBrews().forEach(r => {
    if (r.scoreNotified) return;
    const due = Date.parse(r.scoreRemindAt); if (isNaN(due)) return;
    scoreTimers.push(setTimeout(() => fireScoreReminder(r.id), Math.min(Math.max(0, due - Date.now()), 6 * 3600 * 1000)));
  });
}
function fireScoreReminder(id) {
  const r = state.recipes.find(x => x.id === id); if (!r || !r.awaitingScore || r.scoreNotified) return;
  if (Date.parse(r.scoreRemindAt) > Date.now() + 1000) { scheduleScoreReminders(); return; }
  r.scoreNotified = true; save();
  const cf = state.coffees.find(c => c.id === r.coffeeId), name = cf ? cf.name : 'your brew';
  try { renderScorePending(); } catch(e) {}
  if (document.visibilityState === 'visible') {
    if (navigator.vibrate) navigator.vibrate([30, 80, 30]);
    if (!isScoreOnly()) showToast(`How was the ${name}? Score it from Overview`);
  } else notifyScore(r, name);
}
async function notifyScore(r, name) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const t = new Date(r.createdAt), when = isNaN(t) ? '' : t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ';
    const title = `How was the ${name}?`, o = { body: `Tap to score your ${when}brew.`, tag: 'score-' + r.id, data: { id: r.id }, icon: 'icon-any-192.png', badge: 'icon-any-192.png' };
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    if (reg && reg.showNotification) await reg.showNotification(title, o);
    else { const n = new Notification(title, o); n.onclick = () => { window.focus(); scoreBrew(r.id); n.close(); }; }
  } catch(e) {}
}
// Tapping the notification opens the score sheet
function scoreFromLink() {
  try {
    const id = new URLSearchParams(location.search).get('score'); if (!id) return;
    history.replaceState(history.state, '', location.pathname);
    if (SAFE_ID.test(id) && state.recipes.some(x => x.id === id && x.awaitingScore)) scoreBrew(id);
  } catch(e) {}
}
if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => {
  const d = e.data; if (d && d.type === 'score' && typeof d.id === 'string' && SAFE_ID.test(d.id)) scoreBrew(d.id);
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) { scheduleScoreReminders(); try { renderScorePending(); } catch(e) {} } });

// ==================== PLAN NEXT BREW ====================
let planDraft = null;
function numOrNull(v) { const n = parseFloat(v); return (v===''||v===null||v===undefined||isNaN(n)) ? null : n; }
function grindStep(v) { const s = String(v||''); return s.includes('.') ? (s.split('.')[1].length >= 2 ? 0.05 : 0.1) : 1; }
function roundTo(v, step) { const d = step < 1 ? String(step).split('.')[1].length : 0; return parseFloat(v.toFixed(d)); }
function openPlanNext(brewId) {
  const r = state.recipes.find(x=>x.id===brewId); if (!r) return;
  const coffee = state.coffees.find(x=>x.id===r.coffeeId);
  const grinder = r.grinderId ? GRINDERS.find(g=>g.id===r.grinderId) : null;
  const grind = numOrNull(r.grind), temp = numOrNull(r.temp), gs = planGrindStep(grinder, r.method, r.grind);
  planDraft = { from:r, grindBase:grind, tempBase:temp, grindStepSize:gs, grindNudge:planGrindNudge(grinder, r.method, r.grind), grind, temp, grindDir:'same', tempDir:'same' };
  document.getElementById('plan-subtitle').textContent = (coffee?coffee.name:'Coffee') + ' · ' + (r.method||'');
  const res = r.extraction ? `<span class="extraction-tag tag-${r.extraction}">${r.extraction==='good'?'✓ Good':r.extraction}</span>` : 'no result logged';
  document.getElementById('plan-last').innerHTML = `Last brew: grind <strong>${r.grind||'—'}</strong>${grinder?' ('+grinder.model+')':''} · <strong>${r.temp?r.temp+'°C':'—'}</strong> · <strong>${formatBrewTime(r.time,r.method)}</strong> · ${res}`;
  const tips = {
    under: "Under-extracted (sour, thin, finished fast): grind finer first. If you're already fine, raise the temperature by 1–2°C.",
    over:  "Over-extracted (bitter, harsh, drying, ran slow): grind coarser first. If it's still harsh, drop the temperature by 1–2°C.",
    good:  "Dialled in. Repeat it to confirm, or try a small tweak to see if it gets even better."
  };
  document.getElementById('plan-tip').textContent = (tips[r.extraction] || 'Pick what to change for the next brew.') + ' Changing one thing at a time shows what made the difference.';
  document.getElementById('plan-note').value = '';
  // Set up the sliders around last time's values
  const gr = document.getElementById('plan-grind-range');
  if (grind !== null) { const rg = planGrindRange(planDraft); gr.min = rg.lo; gr.max = rg.hi; gr.step = gs; gr.disabled = false;
    document.getElementById('plan-grind-min').textContent = rg.lo; document.getElementById('plan-grind-max').textContent = rg.hi;
    document.getElementById('plan-grind-step').textContent = gs + ' steps'; }
  else { gr.disabled = true; ['min','max','step'].forEach(k => document.getElementById('plan-grind-'+k).textContent = ''); }
  const tr = document.getElementById('plan-temp-range'); tr.disabled = false;
  document.getElementById('plan-temp-block').style.display = r.method === 'Cold Brew' ? 'none' : '';
  if (temp !== null) planDraft.temp = Math.min(100, Math.max(80, temp));
  setPlanDir('grind', r.extraction==='under' ? 'finer' : r.extraction==='over' ? 'coarser' : 'same');
  setPlanDir('temp', 'same');
  openModal('modal-plan');
}
function syncPlanChips(kind) {
  const dir = kind==='grind' ? planDraft.grindDir : planDraft.tempDir;
  document.querySelectorAll(`#plan-${kind}-chips .plan-chip`).forEach(ch => ch.classList.toggle('selected', ch.dataset.dir === dir));
}
function setPlanDir(kind, dir) {
  const d = planDraft; if (!d) return;
  if (kind === 'grind') {
    d.grindDir = dir;
    if (d.grindBase !== null) { const rg = planGrindRange(d); d.grind = roundTo(Math.min(rg.hi, Math.max(rg.lo, d.grindBase + (dir==='finer' ? -(d.grindNudge || d.grindStepSize) : dir==='coarser' ? (d.grindNudge || d.grindStepSize) : 0))), d.grindStepSize); }
  } else {
    d.tempDir = dir;
    if (d.tempBase !== null) d.temp = Math.min(100, Math.max(80, d.tempBase + (dir==='hotter' ? 1 : dir==='cooler' ? -1 : 0)));
    else if (dir === 'same') d.temp = null;
  }
  syncPlanChips(kind); renderPlanValues();
}
function slidePlan(kind, val) {
  const d = planDraft; if (!d) return;
  const v = parseFloat(val);
  if (kind === 'grind') {
    if (d.grindBase === null) return;
    const g = d.from.grinderId ? GRINDERS.find(x => x.id === d.from.grinderId) : null;
    d.grind = snapGrind(g, v, d.grindStepSize);
    const pr = document.getElementById('plan-grind-range'); if (pr) pr.value = d.grind;
    d.grindDir = d.grind < d.grindBase ? 'finer' : d.grind > d.grindBase ? 'coarser' : 'same';
  } else {
    d.temp = v;
    d.tempDir = d.tempBase === null ? 'set' : d.temp > d.tempBase ? 'hotter' : d.temp < d.tempBase ? 'cooler' : 'same';
  }
  syncPlanChips(kind); renderPlanValues(true);
}
function renderPlanValues(fromSlider) {
  const d = planDraft;
  const arrow = (a,b,u='') => a===b ? `<b>${b}${u}</b> (no change)` : `${a}${u} → <b>${b}${u}</b>`;
  document.getElementById('plan-grind-val').innerHTML = d.grindBase === null
    ? (d.from.grind ? `${d.grindDir==='same' ? 'Keep' : 'Go '+d.grindDir+' than'} <b>${d.from.grind}</b>` : 'No grind logged last time')
    : arrow(d.grindBase, d.grind) + planUmLine(d) + planStepHint(d);
  document.getElementById('plan-temp-val').innerHTML = d.tempBase === null
    ? (d.temp != null ? `No temperature last time · plan <b>${d.temp}°C</b>` : `No temperature logged — slide to set one`)
    : arrow(d.tempBase, d.temp, '°C') + (d.tempBase < 80 || d.tempBase > 100 ? `<div style="font-size:11px;color:var(--text-muted)">Last brew was ${d.tempBase}°C; the planner covers 80–100°C</div>` : '');
  if (!fromSlider) {
    const gr = document.getElementById('plan-grind-range'), tr = document.getElementById('plan-temp-range');
    if (d.grindBase !== null && d.grind !== null) gr.value = d.grind;
    tr.value = d.temp != null ? d.temp : 93;
    tr.classList.toggle('unset', d.temp == null);
  }
}
function savePlan() {
  const d = planDraft; if (!d) return;
  if (!tapOnce('savePlan')) return;
  const r = d.from;
  if (!state.plannedBrews) state.plannedBrews = [];
  // One plan per coffee + method: a newer plan replaces the older one in the same place; otherwise it joins the end of the queue
  const oldIdx = state.plannedBrews.findIndex(p => p.coffeeId===r.coffeeId && p.method===r.method);
  state.plannedBrews = state.plannedBrews.filter(p => !(p.coffeeId===r.coffeeId && p.method===r.method));
  state.plannedBrews.splice(oldIdx >= 0 ? oldIdx : state.plannedBrews.length, 0, {
    id: 'plan-' + Date.now(), createdAt: new Date().toISOString(), basedOn: r.id, fromExtraction: r.extraction || '',
    coffeeId: r.coffeeId, grinderId: r.grinderId || null, method: r.method, recipeId: r.recipeId || null,
    dose: r.dose, yield: r.yield, ...(r.water ? { water: r.water } : {}),
    grind: d.grindBase !== null ? String(d.grind) : r.grind, grindFrom: r.grind, grindDir: d.grindDir,
    temp: d.temp != null ? String(d.temp) : r.temp, tempFrom: r.temp, tempDir: d.tempDir,
    note: document.getElementById('plan-note').value.trim()
  });
  save(); closeModal('modal-plan'); planDraft = null;
  showToast('Added to Up next'); renderDashboard();
}
// ---- Drag to reorder Up next ----
let planDrag = null;
function startPlanDrag(e, handle) {
  const card = handle.closest('.upnext-card'), list = document.getElementById('upnext-list');
  if (!card || !list) return;
  e.preventDefault();
  try { handle.setPointerCapture(e.pointerId); } catch(_) {}
  const cards = [...list.querySelectorAll('.upnext-card')];
  planDrag = { card, list, startY: e.clientY, from: cards.indexOf(card), to: cards.indexOf(card), rects: cards.map(c => c.getBoundingClientRect()), cards };
  card.classList.add('dragging');
  cards.forEach(c => { if (c !== card) c.classList.add('drag-shift'); });
  if (navigator.vibrate) navigator.vibrate(15);
  handle.onpointermove = movePlanDrag;
  handle.onpointerup = handle.onpointercancel = endPlanDrag;
}
function movePlanDrag(e) {
  const d = planDrag; if (!d) return;
  const dy = (e.clientY - d.startY) / uiZoom();
  d.card.style.transform = `translateY(${dy}px) scale(1.02)`;
  const r = d.rects[d.from], mid = r.top + r.height / 2 + dy * uiZoom();
  let to = 0; d.rects.forEach((rc, i) => { if (i !== d.from && mid > rc.top + rc.height / 2) to++; });
  if (to === d.to) return;
  d.to = to;
  const h = r.height / uiZoom() + 10;  // card height + gap, in zoomed px
  d.cards.forEach((c, i) => {
    if (c === d.card) return;
    let shift = 0;
    if (d.from < to && i > d.from && i <= to) shift = -h;
    if (d.from > to && i >= to && i < d.from) shift = h;
    c.style.transform = shift ? `translateY(${shift}px)` : '';
  });
}
function endPlanDrag() {
  const d = planDrag; if (!d) return; planDrag = null;
  d.cards.forEach(c => { c.style.transform = ''; c.classList.remove('dragging', 'drag-shift'); });
  if (d.to !== d.from) reorderPlans(d.cards.map(c => c.dataset.planId), d.from, d.to);
}
function reorderPlans(ids, from, to) {
  const [moved] = ids.splice(from, 1); ids.splice(to, 0, moved);
  const all = state.plannedBrews || [];
  const shown = ids.map(id => all.find(p => p.id === id)).filter(Boolean);
  state.plannedBrews = shown.concat(all.filter(p => !ids.includes(p.id)));  // hidden plans (finished bags) keep their order after
  save(); renderUpNext();
}
// Keyboard: arrow up/down on a focused handle moves the plan
function keyMovePlan(e, id) {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  e.preventDefault();
  const ids = [...document.querySelectorAll('#upnext-list .upnext-card')].map(c => c.dataset.planId);
  const from = ids.indexOf(id), to = from + (e.key === 'ArrowUp' ? -1 : 1);
  if (from < 0 || to < 0 || to >= ids.length) return;
  reorderPlans(ids, from, to);
  document.querySelector(`#upnext-list [data-plan-id="${id}"] .upnext-handle`)?.focus();
}
function brewPlan(planId) {
  const p = (state.plannedBrews||[]).find(x=>x.id===planId); if (!p) return;
  brewGuard(p.coffeeId, () => fillBrewModal(p, { planId, title:'Log Brew · Up next' }));
}
function dismissPlan(planId) {
  state.plannedBrews = (state.plannedBrews||[]).filter(x=>x.id!==planId);
  save(); renderDashboard();
}
function renderUpNext() {
  const el = document.getElementById('upnext-section'); if (!el) return;
  const plans = (state.plannedBrews||[]).filter(p => { const cf = state.coffees.find(c=>c.id===p.coffeeId); return cf && !cf.finishedBag; });
  if (!plans.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<div class="divider">Up next</div>' + (plans.length > 1 ? '<div class="upnext-hint">Drag ⠿ to reorder</div>' : '') + '<div class="upnext-list" id="upnext-list">' + plans.map(p => {
    const cf = state.coffees.find(c=>c.id===p.coffeeId);
    const rec = p.recipeId ? getAllRecipesForMethod(p.method).find(x=>x.id===p.recipeId) : null;
    const chg = [];
    const numericGrind = numOrNull(p.grind) !== null;
    if (p.grind) chg.push(`<span class="meta-pill">Grind ${p.grindFrom && p.grindFrom!==p.grind ? p.grindFrom+' → ' : ''}${p.grind}${!numericGrind && p.grindDir!=='same' ? ' ('+p.grindDir+')' : ''}</span>`);
    if (p.temp) chg.push(`<span class="meta-pill">${p.tempFrom && p.tempFrom!==p.temp ? p.tempFrom+' → ' : ''}${p.temp}°C</span>`);
    if (isFrozen(cf)) chg.push('<span class="meta-pill frozen-pill">❄ Frozen · thaw to brew</span>');
    if (p.fromExtraction) chg.push(`<span class="extraction-tag tag-${p.fromExtraction}">after ${p.fromExtraction}</span>`);
    return `<div class="upnext-card" data-plan-id="${p.id}">
      <div class="upnext-head"><div style="flex:1;min-width:0">
      <div class="upnext-title">${escHtml(cf.name)}</div>
      <div class="upnext-sub">${escHtml(p.method)}${rec ? ' · '+escHtml(rec.name) : ''}</div>
      </div>${plans.length > 1 ? `<button type="button" class="upnext-handle" aria-label="Drag to reorder ${escHtml(cf.name)}" data-on-pointerdown="startPlanDrag(event, this)" data-on-keydown="keyMovePlan(event, '${p.id}')"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="5.5" cy="3.5" r="1.3"/><circle cx="10.5" cy="3.5" r="1.3"/><circle cx="5.5" cy="8" r="1.3"/><circle cx="10.5" cy="8" r="1.3"/><circle cx="5.5" cy="12.5" r="1.3"/><circle cx="10.5" cy="12.5" r="1.3"/></svg></button>` : ''}</div>
      <div class="upnext-changes">${chg.join('')}</div>
      ${p.note ? `<div class="upnext-sub" style="margin:-4px 0 10px"><svg class="ico" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4M8 9h8M8 13h5"/></svg> ${escHtml(p.note)}</div>` : ''}
      <div class="upnext-actions">
        <button class="btn-primary" style="flex:1" data-on-click="brewPlan('${p.id}')">Brew now</button>
        <button class="btn-secondary" data-on-click="dismissPlan('${p.id}')" aria-label="Dismiss">✕</button>
      </div>
    </div>`;
  }).join('') + '</div>';
}

// ==================== TREND CHARTS ====================
// ==================== BREW TRENDS (per coffee) ====================
// Tap or hold a point to see that brew; slide to move between brews. No labels crowd the chart:
// the details card underneath shows the selected brew (the latest to begin with).
let trendState = null;   // { coffeeId, brews, sel, holding, drawn }
function renderTrendCharts(coffeeId) {
  const container = document.getElementById('trend-charts-wrap');
  if (!container) return;
  const brews = state.recipes.filter(r => r.coffeeId === coffeeId && r.createdAt).sort((a, b) => tsOf(a) - tsOf(b));
  if (brews.length < 2 || brews.filter(r => parseFloat(r.rating) > 0).length < 2) {
    trendState = null;
    container.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:8px 0">${brews.length < 2 ? 'Log at least 2 brews to see trends.' : 'Log at least 2 brews with a taste score to see trends.'}</div>` + renderAgeChart(coffeeId);
    return;
  }
  trendState = { coffeeId, brews, sel: brews.length - 1, holding: false, drawn: false };
  drawTrend();
  wireTrendPointer(container);
}
function trendPalette() {
  const dark = document.body.classList.contains('dark-mode');
  return dark
    ? { txt:'#E8EFE9', mut:'#9DB5AA', grid:'rgba(232,239,233,.10)', line:'#9FCCBF', area:'rgba(159,204,191,.14)', card:'#15342A', ring:'#FAFAF7', good:'#5FA08F', under:'#5B8BE0', over:'#D0574B', none:'#8A938F', tip:'#FAFAF7', tipT:'#0F2A1C' }
    : { txt:'#123C27', mut:'#52796F', grid:'rgba(18,60,39,.10)', line:'#52796F', area:'rgba(82,121,111,.12)', card:'#FFFFFF', ring:'#FFFFFF', good:'#52796F', under:'#3D6FD0', over:'#A32A1F', none:'#A6ADA9', tip:'#123C27', tipT:'#FAFAF7' };
}
const TREND_W = 340, TREND_PL = 26, TREND_PR = 12;
const trendX = (i, n) => TREND_PL + (n === 1 ? 0 : i * (TREND_W - TREND_PL - TREND_PR) / (n - 1));
function drawTrend() {
  const t = trendState, container = document.getElementById('trend-charts-wrap'); if (!t || !container) return;
  const C = trendPalette(), B = t.brews, N = B.length, sel = t.sel, X = i => trendX(i, N);
  const col = e => e === 'good' ? C.good : e === 'under' ? C.under : e === 'over' ? C.over : C.none;
  const anim = !t.drawn;   // the line draws itself in once, not on every tap
  const day = r => fmtDate(r.createdAt, { day: 'numeric', month: 'short' });
  const scoreOf = r => { const v = parseFloat(r.rating); return v > 0 ? v : null; };
  const timeOf = r => { const v = parseFloat(r.time); return v > 0 ? v : null; };
  // Taste score, zoomed to the range used (5–10, lower if any score is below 5)
  const H1 = 150, T1 = 14, B1 = 120;
  const sp = B.map((r, i) => ({ i, v: scoreOf(r), e: r.extraction || '' })).filter(p => p.v != null);
  const lo = Math.min(5, Math.floor(Math.min(...sp.map(p => p.v))));
  const Y = v => B1 - (v - lo) / (10 - lo) * (B1 - T1);
  const path = sp.map((p, k) => (k ? 'L' : 'M') + X(p.i).toFixed(1) + ',' + Y(p.v).toFixed(1)).join(' ');
  const area = path + ` L${X(sp[sp.length - 1].i).toFixed(1)},${B1} L${X(sp[0].i).toFixed(1)},${B1} Z`;
  const grid = [lo, (lo + 10) / 2, 10].map((v, k) => `<line x1="${TREND_PL}" x2="${TREND_W - TREND_PR}" y1="${Y(v)}" y2="${Y(v)}" stroke="${C.grid}"/>${k === 1 ? '' : `<text x="${TREND_PL - 6}" y="${Y(v) + 4}" font-size="11" fill="${C.mut}" text-anchor="end">${v}</text>`}`).join('');
  const s = B[sel], sv = scoreOf(s);
  const dots = sp.map(p => p.i === sel ? '' : `<circle cx="${X(p.i)}" cy="${Y(p.v)}" r="5" fill="${col(p.e)}" stroke="${C.ring}" stroke-width="1.5"/>`).join('')
    + (sv != null ? `<circle cx="${X(sel)}" cy="${Y(sv)}" r="11" fill="${col(s.extraction)}" opacity=".25"/><circle cx="${X(sel)}" cy="${Y(sv)}" r="7" fill="${col(s.extraction)}" stroke="${C.ring}" stroke-width="2.5"/>`
                  : `<circle cx="${X(sel)}" cy="${B1 - 4}" r="5" fill="none" stroke="${C.mut}" stroke-dasharray="2 2"/>`);
  let tip = '';
  if (t.holding) {
    const tw = 168, tx = Math.min(TREND_W - TREND_PR - tw, Math.max(TREND_PL, X(sel) - tw / 2)), ty = Math.max(-22, (sv != null ? Y(sv) : B1) - 52);
    const bits = [s.grind && 'Grind ' + s.grind, s.temp && s.temp + '°C', timeOf(s) && formatBrewTime(timeOf(s), s.method)].filter(Boolean).join(' · ');
    tip = `<g class="tr-tip"><rect x="${tx}" y="${ty}" width="${tw}" height="36" rx="9" fill="${C.tip}"/><text x="${tx + tw / 2}" y="${ty + 15}" font-size="12" fill="${C.tipT}" text-anchor="middle" font-weight="700">${escHtml(day(s))} · ${sv != null ? sv + '/10' : 'not scored'}</text>
      <text x="${tx + tw / 2}" y="${ty + 29}" font-size="10.5" fill="${C.tipT}" text-anchor="middle" opacity=".85">${escHtml(bits || s.method || '')}</text></g>`;
  }
  // Dates: first, last and up to three between, each under its own brew
  const di = [...new Set([0, Math.round((N - 1) / 4), Math.round((N - 1) / 2), Math.round(3 * (N - 1) / 4), N - 1])].filter((i, k, a) => k === 0 || X(i) - X(a[k - 1]) > 44 || i === N - 1);
  const dates = di.filter((i, k, a) => !(k === a.length - 2 && X(a[a.length - 1]) - X(i) < 44)).map(i => `<text x="${X(i)}" y="${H1 - 8}" font-size="11" fill="${C.mut}" text-anchor="${i === 0 ? 'start' : i === N - 1 ? 'end' : 'middle'}">${escHtml(day(B[i]))}</text>`).join('');
  const svg1 = `<svg class="tr-plot" viewBox="0 0 ${TREND_W} ${H1}" width="100%" role="img" aria-label="Taste score for each brew">${grid}<path ${anim ? 'class="chart-fade"' : ''} d="${area}" fill="${C.area}"/>
    <path ${anim ? 'class="chart-draw" pathLength="1"' : ''} d="${path}" fill="none" stroke="${C.line}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="${X(sel)}" x2="${X(sel)}" y1="${T1 - 6}" y2="${B1}" stroke="${C.line}" stroke-width="1.5" stroke-dasharray="3 3"/>${dots}${dates}${tip}</svg>`;
  // Brew time: only the longest, shortest and selected brews are labelled
  const tp = B.map((r, i) => ({ i, v: timeOf(r), m: r.method })).filter(p => p.v != null);
  let svg2 = '';
  if (tp.length >= 2) {
    const H2 = 84, T2 = 18, B2 = 66, tlo = Math.min(...tp.map(p => p.v)), thi = Math.max(...tp.map(p => p.v));
    const Y2 = v => B2 - (v - tlo) / (thi - tlo || 1) * (B2 - T2);
    const p2 = tp.map((p, k) => (k ? 'L' : 'M') + X(p.i).toFixed(1) + ',' + Y2(p.v).toFixed(1)).join(' ');
    const pMax = tp.find(p => p.v === thi), pMin = tp.find(p => p.v === tlo), pSel = tp.find(p => p.i === sel);
    const lab = (p, txt, up, bold) => `<text x="${Math.min(TREND_W - 30, Math.max(TREND_PL + 20, X(p.i)))}" y="${Y2(p.v) + (up ? -10 : 19)}" font-size="${bold ? 12 : 11}" ${bold ? 'font-weight="700"' : ''} fill="${bold ? C.txt : C.mut}" text-anchor="middle">${txt}</text>`;
    const fmtT = p => formatBrewTime(p.v, p.m);
    svg2 = `<div class="tr-label">Brew time</div><svg class="tr-plot" viewBox="0 0 ${TREND_W} ${H2}" width="100%" role="img" aria-label="Brew time for each brew">
      <line x1="${X(sel)}" x2="${X(sel)}" y1="${T2 - 10}" y2="${B2 + 4}" stroke="${C.line}" stroke-width="1.5" stroke-dasharray="3 3"/>
      <path d="${p2}" fill="none" stroke="${C.line}" stroke-width="1.6" stroke-dasharray="4 3"/>
      ${tp.map(p => `<circle cx="${X(p.i)}" cy="${Y2(p.v)}" r="${p.i === sel ? 6 : 3.5}" fill="${p.i === sel ? C.line : C.card}" stroke="${C.line}" stroke-width="1.5"/>`).join('')}
      ${pSel !== pMax ? lab(pMax, 'longest ' + fmtT(pMax), true) : ''}${pSel !== pMin && pMin !== pMax ? lab(pMin, 'shortest ' + fmtT(pMin), false) : ''}${pSel ? lab(pSel, (pSel === pMax ? 'longest ' : pSel === pMin ? 'shortest ' : '') + fmtT(pSel), pSel === pMax, true) : ''}</svg>`;
  }
  const legend = `<div class="tr-legend">${[['Good', C.good], ['Under', C.under], ['Over', C.over], ['Not chosen', C.none]].map(([l, c]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}</div>`;
  container.innerHTML = legend + `<div class="trend-chart-wrap tr-box" tabindex="0" aria-label="Brew trends. Use the left and right arrow keys to move between brews.">
      <div class="tr-label">Taste score</div>${svg1}${svg2}
      <div class="tr-hint">${t.holding ? 'Slide along to see each brew' : 'Tap or hold a point to see that brew'}</div></div>` + trendCardHtml(B, sel) + renderAgeChart(t.coffeeId);
  t.drawn = true;
}
// The selected brew, in full, with what changed from the brew before
function trendCardHtml(B, sel) {
  const r = B[sel], prev = B[sel - 1], C = trendPalette();
  const isEsp = isEspressoMethod(r.method || 'Espresso'), sv = parseFloat(r.rating) > 0 ? parseFloat(r.rating) : null;
  const ex = { good: '✓ Good', under: 'Under', over: 'Over' }[r.extraction] || 'No result chosen';
  const exCol = { good: C.good, under: C.under, over: C.over }[r.extraction] || C.mut;
  const t = parseFloat(r.time) > 0 ? formatBrewTime(parseFloat(r.time), r.method) : '';
  const main = [r.grind && `Grind <b>${escHtml(r.grind)}</b>`, r.temp && `<b>${escHtml(r.temp)}°C</b>`, t && `<b>${t}</b>`].filter(Boolean).join(' · ');
  const sub = [r.dose && (escHtml(r.dose) + 'g' + (r.yield ? ' → ' + escHtml(r.yield) + (isEsp ? 'g' : 'ml') : '')), r.method, r.water && escHtml(r.water.name)].filter(Boolean).join(' · ');
  const ch = [];
  if (prev) {
    const d = (k, f) => { if ((prev[k] || '') !== (r[k] || '') && (prev[k] || r[k])) ch.push(f(prev[k] || '—', r[k] || '—')); };
    d('grind', (a, b) => `grind ${escHtml(a)} → ${escHtml(b)}`);
    d('temp', (a, b) => `${escHtml(a)} → ${escHtml(b)}°C`);
    d('dose', (a, b) => `dose ${escHtml(a)} → ${escHtml(b)}g`);
    if ((prev.method || '') !== (r.method || '')) ch.push(`${escHtml(prev.method || '—')} → ${escHtml(r.method || '—')}`);
  }
  return `<div class="tr-card">
    <div class="tr-card-top"><span>${escHtml(fmtDate(r.createdAt, { day: 'numeric', month: 'short' }))} · brew ${sel + 1} of ${B.length}${sel === B.length - 1 ? ' · latest' : ''}</span><b style="color:${exCol}">${ex}</b></div>
    <div class="tr-card-main"><div class="tr-score">${sv != null ? sv + '<span>/10</span>' : '—'}</div><div class="tr-specs">${main || '<span class="tr-mut">No numbers logged</span>'}${sub ? `<br><span class="tr-mut">${sub}</span>` : ''}</div></div>
    ${r.notes ? `<div class="tr-note">"${escHtml(r.notes)}"</div>` : ''}
    ${ch.length ? `<div class="tr-change">Changed from the brew before: <b>${ch.join(', ')}</b></div>` : ''}</div>`;
}
// Tap, hold and slide on either chart; arrow keys too. Listeners live on the container, which is never replaced.
function wireTrendPointer(container) {
  if (container.dataset.wired) return;
  container.dataset.wired = '1';
  const pick = e => {
    const t = trendState, svg = e.target.closest && e.target.closest('.tr-plot'); if (!t || !svg) return null;
    const r = svg.getBoundingClientRect(), vx = (e.clientX - r.left) / r.width * TREND_W, N = t.brews.length;
    let best = 0, bd = Infinity; for (let i = 0; i < N; i++) { const d = Math.abs(trendX(i, N) - vx); if (d < bd) { bd = d; best = i; } }
    return best;
  };
  let active = false;
  container.addEventListener('pointerdown', e => {
    const i = pick(e); if (i == null) return;
    active = true; trendState.holding = true; trendState.sel = i;
    try { container.setPointerCapture(e.pointerId); } catch(err) {}
    drawTrend();
  });
  container.addEventListener('pointermove', e => {
    if (!active || !trendState) return;
    const svg = container.querySelector('.tr-plot'); if (!svg) return;
    const r = svg.getBoundingClientRect(), vx = (e.clientX - r.left) / r.width * TREND_W, N = trendState.brews.length;
    let best = 0, bd = Infinity; for (let i = 0; i < N; i++) { const d = Math.abs(trendX(i, N) - vx); if (d < bd) { bd = d; best = i; } }
    if (best !== trendState.sel) { trendState.sel = best; if (navigator.vibrate) navigator.vibrate(5); drawTrend(); }
  });
  const end = () => { if (!active) return; active = false; if (trendState) { trendState.holding = false; drawTrend(); } };
  container.addEventListener('pointerup', end); container.addEventListener('pointercancel', end);
  container.addEventListener('keydown', e => {
    if (!trendState || !e.target.closest('.tr-box') || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault(); trendState.sel = Math.max(0, Math.min(trendState.brews.length - 1, trendState.sel + (e.key === 'ArrowRight' ? 1 : -1)));
    drawTrend(); container.querySelector('.tr-box')?.focus();
  });
}
