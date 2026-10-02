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
  // Fonts are set in the stylesheet (Space Grotesk headings, Space Mono body)
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
const SETTING_KEYS = ['darkMode', 'suggestedStart', 'showCosts', 'textSize', 'overviewCategories', 'coffeeLayout', 'brewHistoryOpen', 'lastCurrency', 'backupPhotos'];
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
  const bp = document.getElementById('settings-backupphotos-switch');
  if (bp) bp.setAttribute('aria-checked', appSettings.backupPhotos === false ? 'false' : 'true');
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
  suggestionSuppressed = true; renderBrewSuggestion();
  if (opts.editId) document.getElementById('r-edit-id').value = opts.editId;
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
}


// ==================== DIALLING-IN HELPERS ====================
const DAY_MS = 86400000;
function daysOffRoast(r, cf) {
  if (!cf || !cf.roastDate || !r || !r.createdAt) return null;
  const d = Math.floor((new Date(r.createdAt) - new Date(cf.roastDate + 'T00:00:00')) / DAY_MS);
  return d >= 0 ? d : null;
}
function roastAgeToday(cf) {
  if (!cf || !cf.roastDate) return null;
  const d = Math.floor((Date.now() - new Date(cf.roastDate + 'T00:00:00')) / DAY_MS);
  return d >= 0 ? d : null;
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
  if (age !== null) facts.push(`Roasted <b>${age}</b> day${age !== 1 ? 's' : ''} ago`);
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
      <span style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-muted)"><svg class="ico" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z"/></svg> Best brew so far</span>
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
  const open = appSettings.brewHistoryOpen !== false;
  const sumBits = [last.rating > 0 ? `${last.rating}/10` : '', last.extraction ? (last.extraction === 'good' ? 'Good' : last.extraction[0].toUpperCase() + last.extraction.slice(1)) : '', last.grind ? `Grind ${escHtml(last.grind)}` : '', last.temp ? `${escHtml(last.temp)}°C` : ''].filter(Boolean).join(' · ');
  el.innerHTML = `<div class="bh">
    <button type="button" class="bh-strip" aria-expanded="${open}" data-on-click="toggleBrewHistory()">
      <span class="bh-sk">${same ? (best ? 'Last & best' : 'Last') : 'Last'}</span><span class="bh-sum">${sumBits || brewRecipeLabel(last)}</span><span class="bh-chev">${open ? '▴' : '▾'}</span>
    </button>
    ${open ? `<div class="bh-cols${same ? ' one' : ''}">${brewHistCol(last, same && best ? 'Last & best' : 'Last', same && best ? 'best' : '')}${same ? '' : brewHistCol(best, 'Best', 'best')}</div>` : ''}
  </div>`;
}
function toggleBrewHistory() { appSettings.brewHistoryOpen = appSettings.brewHistoryOpen === false; saveSettings(); renderBrewHistory(); }
function useBrewSettings(id) {
  const r = state.recipes.find(x => x.id === id); if (!r) return;
  const notes = document.getElementById('r-notes').value;
  fillBrewModal({ coffeeId: r.coffeeId, grinderId: r.grinderId, method: r.method, recipeId: r.recipeId, grind: r.grind, dose: r.dose, yield: r.yield, temp: r.temp }, { title: 'Log Brew', keepTimer: true });
  document.getElementById('r-notes').value = notes;
  showToast('Settings filled in from that brew');
}

function repeatBrew(id) {
  const r = state.recipes.find(x => x.id === id); if (!r) return;
  fillBrewModal(r, { title: 'Log Brew · Repeat' });
}

// ---- Live ratio + cost in Log Brew ----
function updateBrewLive() {
  const el = document.getElementById('r-ratio-live'); if (!el) return;
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
  return rec.steps.map(s => { const m = s.match(/^~?\s*(\d{1,2}):(\d{2})\s*[—–-]\s*(.*)$/); return m ? { at: +m[1] * 60 + +m[2], text: m[3] } : null; }).filter(Boolean).sort((a, b) => a.at - b.at);
}
function renderStepGuide() {
  const el = document.getElementById('brew-step-guide'); if (!el) return;
  const steps = timedSteps();
  if (steps.length < 2) { el.style.display = 'none'; lastGuideIdx = -1; return; }
  const s = brewTimerSecs(), running = !!brewTimer.startedAt;
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
function updateGrindMicrons() {
  const el = document.getElementById('r-grind-um'); if (!el) return;
  const g = selectedGrinder(), val = document.getElementById('r-grind').value;
  if (!g) { el.innerHTML = val ? 'Pick a grinder to see the particle size' : ''; return; }
  if (val !== '' && !settingInRange(g, val)) { const sc = grinderScale(g); el.innerHTML = `<span style="color:#c0564b">${val} is outside the ${g.model}'s ${sc.s0}–${sc.s1} range</span>`; return; }
  const um = settingToMicrons(g, val);
  if (um == null) { el.innerHTML = ''; return; }
  const mr = methodRange(state.selectedMethod);
  let fit = '';
  if (mr) fit = um < mr.min ? ` · <span style="color:#c0564b">finer than usual for ${state.selectedMethod} (${mr.min}–${mr.max}µm)</span>`
               : um > mr.max ? ` · <span style="color:#c0564b">coarser than usual for ${state.selectedMethod} (${mr.min}–${mr.max}µm)</span>`
               : ` · in the usual ${state.selectedMethod} range`;
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
  const label = s.source === 'coffee' ? 'Your best for this coffee' : s.source === 'personal' ? 'Suggested start · learned from your brews' : 'Suggested start · general guidance';
  const parts = [grindText, temp && method !== 'Cold Brew' ? `<b>${temp}°C</b>` : ''].filter(Boolean);
  el.innerHTML = `<div class="suggest-card">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span class="suggest-label"><svg class="ico" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/></svg> ${label}</span>
      <button type="button" class="suggest-apply" data-on-click="applyBrewSuggestion()">Apply</button>
    </div>
    <div class="suggest-main">${parts.join(' · ')}${!rec && ratioText ? ` · <b>${ratioText}</b>` : ''}</div>
    ${rec ? `<div class="suggest-sub">${chosen ? 'Your recipe' : 'Recipe'}: ${escHtml(rec.name)}${recRatio ? ' · ' + recRatio : ''} — dose, water and steps as written</div>` : ''}
    <details class="suggest-why"><summary>Why?</summary><ul>${reasons.map(r => `<li>${r}</li>`).join('')}</ul>
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
  return rows.length ? `<div style="font-size:12px;color:var(--text);margin-top:12px"><div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Where to start on this grinder</div>${rows.join('')}</div>` : '';
}


function grinderRangeLabel(g) {
  if (g.stepless) return g.clickMin !== undefined ? `stepless dial ${g.clickMin}–${g.clickMax}` : 'stepless';
  return g.clickMin !== undefined ? `${g.clickMin}–${g.clickMax} clicks` : `${g.settings} settings`;
}
// One nudge in Plan next: a click on stepped grinders; ~20µm (filter) or ~6µm (espresso) on stepless ones
// Slider resolution: 0.1 on stepless grinders, the grinder's own click size on stepped ones
function planGrindStep(g, method, rawGrind) {
  const sc = grinderScale(g);
  if (!sc) return grindStep(rawGrind);
  if (sc.stepless) return 0.1;
  return sc.step || 1;
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
  return `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">${sc.stepless ? 'Stepless' : 'Stepped'} · slider moves in ${d.grindStepSize}${sc.stepless ? '' : d.grindStepSize === 1 ? ' click' : ' clicks'} (≈${um}µm)</div>`;
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
async function toggleBrewTimer() {
  if (brewTimer.startedAt) { stopBrewTimer(); return; }
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
function stopBrewFromMode() { stopBrewTimer(); closeBrewMode(); }
function confirmCancelBrew() {
  confirmAction({ title:'Cancel this brew?', text:"The timer will reset to 0:00. Everything else you've entered stays as it is.",
    button:'Yes, cancel brew', cancel:'Keep brewing', onYes() { resetBrewTimer(); showToast('Brew cancelled'); } });
}
function renderBrewMode() {
  if (!brewModeOpen()) return;
  const $ = id => document.getElementById(id), fmt = n => Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
  const set = (id, t) => { const e = $(id); if (e && e.textContent !== t) e.textContent = t; };
  const s = brewTimerSecs();
  set('bm-clock', fmt(s)); $('bm-clock').classList.toggle('long', s >= 600);
  const cf = state.coffees.find(c => c.id === state.selectedCoffeeId);
  const rec = state.selectedRecipeId ? getAllRecipesForMethod(state.selectedMethod).find(x => x.id === state.selectedRecipeId) : null;
  set('bm-coffee', cf ? cf.name : 'Brewing');
  set('bm-recipe', rec ? rec.name : (state.selectedMethod || ''));
  const v = id => ($(id)?.value || '').trim(), isEsp = isEspressoMethod(state.selectedMethod || 'Espresso');
  set('bm-meta', [v('r-dose') && v('r-dose') + 'g', v('r-yield') && v('r-yield') + (isEsp ? 'g out' : 'ml'), v('r-grind') && 'Grind ' + v('r-grind')].filter(Boolean).join(' · '));
  const steps = timedSteps(), guide = $('bm-guide'), list = $('bm-steps'), stop = $('bm-stop');
  if (steps.length < 2) {            // no timed recipe: just the clock
    guide.style.display = 'none'; list.innerHTML = ''; list.className = 'bm-spacer'; brewModeIdx = null;
    stop.classList.remove('final'); set('bm-stop', '■ Stop'); return;
  }
  guide.style.display = ''; list.className = 'bm-steps';
  let idx = -1; steps.forEach((st, i) => { if (s >= st.at) idx = i; });
  const cur = steps[idx], next = steps[idx + 1];
  if (idx !== brewModeIdx) {
    const first = brewModeIdx === null;
    brewModeIdx = idx;
    set('bm-now', cur ? cur.text : 'Get ready…');
    list.innerHTML = steps.map((st, i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : i === idx + 1 ? 'next' : ''}"><b>${fmt(st.at)}</b><span>${i < idx ? '✓ ' : i === idx ? '● ' : ''}${escHtml(st.text)}</span></li>`).join('');
    const li = list.children[Math.max(0, idx)]; if (li && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' });
    if (!first && !reduceMotion()) { guide.classList.remove('bm-pulse'); void guide.offsetWidth; guide.classList.add('bm-pulse'); }
  }
  set('bm-now-label', cur ? `Now · step ${idx + 1} of ${steps.length}` : 'Starting');
  const from = cur ? cur.at : 0;
  $('bm-bar').style.width = (next ? Math.min(100, Math.max(0, (s - from) / Math.max(1, next.at - from) * 100)) : 100) + '%';
  set('bm-next-at', next ? 'Next at ' + fmt(next.at) : 'Last step');
  set('bm-next-in', next ? 'in ' + fmt(Math.max(0, next.at - s)) : '+' + fmt(Math.max(0, s - from)));
  stop.classList.toggle('final', !next); set('bm-stop', next ? '■ Stop' : '■ Stop & save time');
}
document.addEventListener('visibilitychange', async () => {
  if (document.hidden) return;
  renderBrewTimer();
  // Wake locks are released when the app is hidden; re-acquire if still brewing
  if (brewTimer.startedAt && navigator.wakeLock && brewTimerSecs() < WAKE_LOCK_MAX_SECS) { try { brewTimer.wakeLock = await navigator.wakeLock.request('screen'); } catch(e) {} }
});

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
  planDraft = { from:r, grindBase:grind, tempBase:temp, grindStepSize:gs, grind, temp, grindDir:'same', tempDir:'same' };
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
    if (d.grindBase !== null) { const rg = planGrindRange(d); d.grind = roundTo(Math.min(rg.hi, Math.max(rg.lo, d.grindBase + (dir==='finer' ? -d.grindStepSize : dir==='coarser' ? d.grindStepSize : 0))), d.grindStepSize); }
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
    d.grind = roundTo(v, d.grindStepSize);
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
    dose: r.dose, yield: r.yield,
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
  fillBrewModal(p, { planId, title:'Log Brew · Up next' });
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
function renderTrendCharts(coffeeId) {
  const container = document.getElementById('trend-charts-wrap');
  if (!container) return;
  const brews = state.recipes
    .filter(r => r.coffeeId === coffeeId && r.createdAt)
    .sort((a, b) => tsOf(a) - tsOf(b));

  if (brews.length < 2) {
    container.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px 0">Log at least 2 brews to see trends.</div>';
    return;
  }

  // Build per-brew data points (only brews with a taste score)
  const pts = brews.map((r, i) => ({
    i,
    score:  parseFloat(r.rating) || null,
    temp:   parseFloat(r.temp)   || null,
    grind:  parseFloat(r.grind)  || null,
    date:   fmtDate(r.createdAt, {day:'numeric', month:'short'}),
    extr:   r.extraction || '',
  }));

  const scorePts  = pts.filter(p => p.score !== null);
  const tempPts   = pts.filter(p => p.temp  !== null);
  const grindPts  = pts.filter(p => p.grind !== null);

  if (scorePts.length < 2) {
    container.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px 0">Log at least 2 brews with a taste score to see trends.</div>';
    return;
  }

  // Canvas dimensions
  const W = 320, H = 155, PAD_L = 28, PAD_R = 10, PAD_T = 24, PAD_B = 55;
  const CW = W - PAD_L - PAD_R;
  const CH = H - PAD_T - PAD_B;

  // X scale: based on index across ALL brews
  const N = pts.length;
  const xs = i => PAD_L + (N === 1 ? CW / 2 : (i / (N - 1)) * CW);

  // Y scale for taste score (left axis, 0–10)
  const SCORE_MIN = 0, SCORE_MAX = 10;
  const ys = v => PAD_T + CH - ((v - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * CH;

  // Extraction colour per brew
  const extrColor = e => e === 'good' ? '#52796F' : e === 'under' ? '#4a7ad0' : e === 'over' ? '#8b1a1a' : '#aaa';

  // ── Taste score area + line ──────────────────────────────────────────
  const scorePointsWithX = scorePts.map(p => ({ x: xs(p.i), y: ys(p.score), ...p }));
  const linePath = scorePointsWithX.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  // Filled area under the line
  const areaPath = linePath
    + ` L${scorePointsWithX[scorePointsWithX.length-1].x.toFixed(1)},${(PAD_T+CH).toFixed(1)}`
    + ` L${scorePointsWithX[0].x.toFixed(1)},${(PAD_T+CH).toFixed(1)} Z`;

  // Score dots (coloured by extraction)
  const scoreDots = scorePointsWithX.map(p =>
    `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="${extrColor(p.extr)}" stroke="white" stroke-width="1.5"/>
     <text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" font-size="9" fill="#123C27" text-anchor="middle" font-weight="600">${p.score}</text>`
  ).join('');

  // ── Y-axis tick labels (0, 5, 10) ────────────────────────────────────
  const yTicks = [0, 5, 10].map(v =>
    `<line x1="${PAD_L}" y1="${ys(v).toFixed(1)}" x2="${W - PAD_R}" y2="${ys(v).toFixed(1)}" stroke="var(--border)" stroke-width="1"/>
     <text x="${(PAD_L - 4).toFixed(1)}" y="${(ys(v) + 3).toFixed(1)}" font-size="8" fill="var(--text-muted)" text-anchor="end">${v}</text>`
  ).join('');

  // ── Date labels — rendered as HTML below SVG, not inside it ───────────
  // Calculate positions as percentages of chart width for HTML alignment
  const dateLabels = ''; // removed from SVG
  const dateRow = (() => {
    const items = scorePointsWithX.map(p => {
      const pct = ((p.x - PAD_L) / CW * 100).toFixed(1);
      return `<span style="position:absolute;left:${pct}%;transform:translateX(-50%);font-size:11px;color:var(--text-muted);white-space:nowrap">${p.date}</span>`;
    }).join('');
    return `<div style="position:relative;height:16px;margin-top:4px;margin-left:${PAD_L}px;margin-right:${PAD_R}px">${items}</div>`;
  })();

  // ── Temp markers (small triangles at bottom of chart area) ───────────
  const MARKER_Y = PAD_T + CH + 6;
  const tempMarkers = tempPts.map(p => {
    const tx = xs(p.i);
    // Normalise temp to a colour (85–100°C → light to dark green)
    const tNorm = Math.min(Math.max((p.temp - 85) / 15, 0), 1);
    const alpha = (0.3 + tNorm * 0.7).toFixed(2);
    return `<text x="${tx.toFixed(1)}" y="${(MARKER_Y + 8).toFixed(1)}" font-size="8" fill="#6fa89d" text-anchor="middle" font-weight="500">${p.temp}°C</text>`;
  }).join('');

  // ── Grind markers (small diamonds at bottom, offset from temp) ────────
  const grindMin = Math.min(...grindPts.map(p => p.grind));
  const grindMax = Math.max(...grindPts.map(p => p.grind));
  const grindRange = grindMax - grindMin || 1;
  const GRIND_Y = PAD_T + CH + 20;
  const grindMarkers = grindPts.map(p => {
    const gx = xs(p.i);
    const gNorm = (p.grind - grindMin) / grindRange;
    const alpha = (0.3 + gNorm * 0.7).toFixed(2);
    const g = 0.5; // diamond half-size
    return `<text x="${gx.toFixed(1)}" y="${(GRIND_Y + 8).toFixed(1)}" font-size="8" fill="#52796F" text-anchor="middle" font-weight="500">${p.grind}</text>`;
  }).join('');

  // ── Legend ────────────────────────────────────────────────────────────
  const legend = `
    <div style="display:flex;gap:14px;margin-bottom:10px;flex-wrap:wrap">
      <span style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:4px">
        <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#52796F" stroke-width="2"/></svg>
        Taste Score
      </span>
      <span style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:4px">
        Temp (°C)
      </span>
      <span style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:4px">
        Grind
      </span>
      <span style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:4px">
        <svg width="8" height="8"><circle cx="4" cy="4" r="3" fill="#52796F"/></svg>
        Good &nbsp;
        <svg width="8" height="8"><circle cx="4" cy="4" r="3" fill="#4a7ad0"/></svg>
        Under &nbsp;
        <svg width="8" height="8"><circle cx="4" cy="4" r="3" fill="#8b1a1a"/></svg>
        Over
      </span>
    </div>`;

  // ── Brew Time as separate small chart below ────────────────────────────
  const timePts = pts.filter(p => {
    const t = parseFloat(p.i >= 0 ? brews[p.i]?.time : null);
    return t > 0;
  }).map(p => ({ ...p, timeVal: parseFloat(brews[p.i]?.time)||0 }));

  let timeChart = '';
  if (timePts.length >= 2) {
    const tmin = Math.min(...timePts.map(p=>p.timeVal));
    const tmax = Math.max(...timePts.map(p=>p.timeVal));
    const trange = tmax - tmin || 1;
    const TH = 50, TPT = 12, TPB = 18;
    const tys = v => TPT + (TH - TPT - TPB) - ((v - tmin) / trange) * (TH - TPT - TPB);
    const timeLine = timePts.map((p,i) => `${i===0?'M':'L'}${xs(p.i).toFixed(1)},${tys(p.timeVal).toFixed(1)}`).join(' ');
    const timeDots = timePts.map(p =>
      `<circle cx="${xs(p.i).toFixed(1)}" cy="${tys(p.timeVal).toFixed(1)}" r="3" fill="#8aab9e" stroke="white" stroke-width="1.5"/>
       <text x="${xs(p.i).toFixed(1)}" y="${(tys(p.timeVal)-5).toFixed(1)}" font-size="7.5" fill="#52796F" text-anchor="middle">${formatBrewTime(p.timeVal,'Pourover')}</text>`
    ).join('');
    timeChart = `
      <div style="margin-top:8px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;letter-spacing:.5px">BREW TIME</div>
        <svg viewBox="0 0 ${W} ${TH}" style="width:100%;overflow:visible">
          <path class="chart-fade" d="${timeLine}" stroke="#8aab9e" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4,3"/>
          ${timeDots}
        </svg>
      </div>`;
  }

  container.innerHTML = `
    ${legend}
    <div class="trend-chart-wrap" style="padding:14px 10px 8px">
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;overflow:visible">
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#52796F" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#52796F" stop-opacity="0.02"/>
          </linearGradient>
        </defs>
        ${yTicks}
        <path class="chart-fade" d="${areaPath}" fill="url(#scoreGrad)"/>
        <path class="chart-draw" pathLength="1" d="${linePath}" stroke="#52796F" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <g class="chart-fade">${scoreDots}
        ${tempMarkers}
        ${grindMarkers}</g>
        ${dateLabels}
      </svg>
      ${dateRow}
      ${timeChart}
    </div>` + renderAgeChart(coffeeId);
}
