// dialed — Recipe library, custom recipes, label photos, prices, saving coffees and brews
// Plain scripts sharing one global scope, loaded in order: data, core, coffee, views, tools, app.

// ==================== RECIPE LIBRARY ====================
let activeRecipeMethod = 'all';

function switchRecipeTab(tab, btn) {
  document.getElementById('recipe-panel-builtin').style.display = tab==='builtin' ? 'block' : 'none';
  document.getElementById('recipe-panel-custom').style.display  = tab==='custom'  ? 'block' : 'none';
  document.querySelectorAll('#recipe-tab-bar .type-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (tab==='builtin') renderBuiltinRecipes();
  if (tab==='custom')  renderMyRecipes();
}

function filterRecipeMethod(method, btn) {
  activeRecipeMethod = method;
  document.querySelectorAll('#recipe-method-filter .type-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderBuiltinRecipes();
}

function renderBuiltinRecipes() {
  const el = document.getElementById('builtin-recipes-list');
  if (!el) return;
  const methods = activeRecipeMethod === 'all'
    ? Object.keys(RECIPES)
    : [activeRecipeMethod];
  let html = '';
  methods.forEach(method => {
    const list = RECIPES[method] || [];
    if (!list.length) return;
    if (activeRecipeMethod === 'all') {
      html += `<div style="font-family:var(--font-mono);font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin:16px 0 8px;padding-bottom:6px;border-bottom:1px solid var(--border)">${method}</div>`;
    }
    list.forEach(r => {
      const pourMeta = r.pours ? `${r.pours} pour${r.pours>1?'s':''}${r.bloomRatio&&r.bloomRatio!=='N/A'?' · bloom '+r.bloomRatio:''}${r.totalTime?' · '+r.totalTime:''}` : '';
      html += `<div class="recipe-lib-card">
        <div class="recipe-lib-header">
          <div style="flex:1">
            <div class="recipe-lib-title">${escHtml(r.name)}</div>
            <div class="recipe-lib-author">${escHtml(r.author||'')}${r.grindHint?' · '+escHtml(r.grindHint):''}</div>
          </div>
          <span class="meta-pill" style="flex-shrink:0">${method}</span>
        </div>
        <div class="recipe-lib-body">
          <div class="recipe-lib-meta">
            ${r.dose?`<span class="meta-pill">${r.dose}g</span>`:''}
            ${r.water?`<span class="meta-pill">${r.water}ml</span>`:''}
            ${r.temp?`<span class="meta-pill">${r.temp}°C</span>`:''}
            ${r.ratio?`<span class="meta-pill">${escHtml(r.ratio)}</span>`:''}
            ${pourMeta?`<span class="meta-pill">${pourMeta}</span>`:''}
          </div>
          <ol class="recipe-lib-steps">
            ${r.steps.map(s=>`<li>${escHtml(s)}</li>`).join('')}
          </ol>
        </div>
        <div class="recipe-lib-actions">
          <button class="btn-secondary" style="flex:1;font-size:11px;padding:8px" data-on-click="duplicateRecipe('${r.id}','${method}')">⧉ Duplicate &amp; Edit</button>
        </div>
      </div>`;
    });
  });
  el.innerHTML = html || `<div class="empty-state"><div class="empty-icon"><svg class="ico" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-3"/><path d="M9 3.5h6v3H9z"/><path d="M9 12h6M9 16h6"/></svg></div><div class="empty-title">No recipes for this method</div></div>`;
}

function duplicateRecipe(recipeId, method) {
  const all = RECIPES[method] || [];
  const src = all.find(r => r.id === recipeId);
  if (!src) return;
  if (!state.customRecipes) state.customRecipes = [];
  const copy = {
    id: 'custom-' + Date.now(),
    name: src.name + ' (copy)',
    author: src.author || '',
    method: method,
    dose: src.dose || 0,
    water: src.water || 0,
    temp: src.temp || null,
    ratio: src.ratio || '',
    grindHint: src.grindHint || '',
    steps: [...src.steps],
    custom: true
  };
  state.customRecipes.unshift(copy);
  save();
  showToast('Duplicated — now editing copy');
  // Switch to My Recipes tab and open editor
  const customBtn = document.querySelector('#recipe-tab-bar .type-btn:last-child');
  switchRecipeTab('custom', customBtn);
  openEditCustomRecipe(copy.id);
}

function renderRecipes() {
  if (!document.getElementById('builtin-recipes-list')) return;
  renderBuiltinRecipes();
  if (document.getElementById('recipe-panel-custom')?.style.display !== 'none') {
    renderMyRecipes();
  }
}

// ==================== CUSTOM RECIPES ====================

function getAllRecipesForMethod(method) {
  const builtin = RECIPES[method] || [];
  const custom = (state.customRecipes || []).filter(r => r.method === method);
  return [...builtin, ...custom];
}

function addRecipeStep(text='') {
  const list = document.getElementById('cr-steps-list');
  const idx = list.children.length + 1;
  const row = document.createElement('div');
  row.className = 'step-row';
  row.innerHTML = `
    <span class="step-row-num">${idx}.</span>
    <textarea placeholder="Describe this step…">${text}</textarea>
    <button class="step-remove" data-on-click="removeStepRow(this)">✕</button>`;
  list.appendChild(row);
}

function renumberSteps() {
  document.querySelectorAll('.step-row-num').forEach((el,i) => el.textContent = (i+1)+'.');
}

function openEditCustomRecipe(id) {
  const r = (state.customRecipes||[]).find(x=>x.id===id);
  if (!r) return;
  document.getElementById('custom-recipe-modal-title').textContent = 'Edit Recipe';
  document.getElementById('cr-edit-id').value = id;
  document.getElementById('cr-name').value = r.name;
  document.getElementById('cr-author').value = r.author||'';
  document.getElementById('cr-method').value = r.method;
  document.getElementById('cr-dose').value = r.dose||'';
  document.getElementById('cr-water').value = r.water||'';
  document.getElementById('cr-temp').value = r.temp||'';
  document.getElementById('cr-grind').value = r.grindHint||'';
  const list = document.getElementById('cr-steps-list');
  list.innerHTML = '';
  (r.steps||[]).forEach(s => addRecipeStep(s));
  openModal('modal-custom-recipe');
}

function openNewCustomRecipe() {
  document.getElementById('custom-recipe-modal-title').textContent = 'New Recipe';
  document.getElementById('cr-edit-id').value = '';
  ['cr-name','cr-author','cr-dose','cr-water','cr-temp','cr-grind'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('cr-method').value = 'Pourover';
  document.getElementById('cr-steps-list').innerHTML = '';
  addRecipeStep();
  openModal('modal-custom-recipe');
}

function saveCustomRecipe() {
  const name = document.getElementById('cr-name').value.trim();
  if (!name) { showToast('Enter a recipe name'); return; }
  const stepEls = document.querySelectorAll('#cr-steps-list textarea');
  const steps = [...stepEls].map(t=>t.value.trim()).filter(Boolean);
  if (!steps.length) { showToast('Add at least one step'); return; }
  const dose = parseFloat(document.getElementById('cr-dose').value)||0;
  const water = parseFloat(document.getElementById('cr-water').value)||0;
  const ratio = (dose&&water) ? '1:'+((water/dose).toFixed(1)) : '';
  const editId = document.getElementById('cr-edit-id').value;
  const recipe = {
    id: editId || ('custom-'+Date.now()),
    name,
    author: document.getElementById('cr-author').value.trim(),
    method: document.getElementById('cr-method').value,
    dose, water,
    temp: parseFloat(document.getElementById('cr-temp').value)||null,
    ratio,
    grindHint: document.getElementById('cr-grind').value.trim(),
    steps,
    custom: true
  };
  if (!state.customRecipes) state.customRecipes = [];
  if (editId) {
    const idx = state.customRecipes.findIndex(r=>r.id===editId);
    if (idx>=0) state.customRecipes[idx] = recipe;
  } else {
    state.customRecipes.unshift(recipe);
  }
  save();
  closeModal('modal-custom-recipe');
  showToast(editId ? 'Recipe updated ✓' : 'Recipe saved ✓');
  if (state.currentView==='recipes') renderMyRecipes();
}

function deleteCustomRecipe(id) {
  state.customRecipes = (state.customRecipes||[]).filter(r=>r.id!==id);
  save(); showToast('Recipe deleted'); if(state.currentView==='recipes') renderMyRecipes();
}

function renderMyRecipes() {
  const el = document.getElementById('myrecipes-list');
  if (!el) return;
  if (!el) return;
  const recipes = state.customRecipes||[];
  if (!recipes.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg class="ico" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-3"/><path d="M9 3.5h6v3H9z"/><path d="M9 12h6M9 16h6"/></svg></div><div class="empty-title">No custom recipes yet</div><div class="empty-desc">Tap + New Recipe, or duplicate a built-in recipe from the Built-in tab to start customising.</div></div>`;
    return;
  }
  el.innerHTML = recipes.map(r => `
    <div class="custom-recipe-card">
      <div class="custom-recipe-card-header">
        <div>
          <div style="font-family:var(--font-display);font-size:16px;color:var(--crema-light)">${escHtml(r.name)}</div>
          <div style="font-family:var(--font-mono);font-size:11px;color:rgba(245,237,227,.6);letter-spacing:1px;margin-top:2px">${r.author?escHtml(r.author)+' · ':''}${escHtml(r.method)}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn-secondary" style="padding:5px 10px;font-size:11px" data-on-click="openEditCustomRecipe('${r.id}')">Edit</button>
          <button class="btn-delete" data-on-click="confirmDeleteCustomRecipe('${r.id}')">✕</button>
        </div>
      </div>
      <div style="padding:14px 18px">
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
          ${r.dose?`<span class="meta-pill">${r.dose}g dose</span>`:''}
          ${r.water?`<span class="meta-pill">${r.water}ml water</span>`:''}
          ${r.temp?`<span class="meta-pill">${r.temp}°C</span>`:''}
          ${r.ratio?`<span class="meta-pill">${escHtml(r.ratio)}</span>`:''}
          ${r.grindHint?`<span class="meta-pill">${escHtml(r.grindHint)}</span>`:''}
        </div>
        <ol style="padding-left:18px;margin:0">
          ${r.steps.map(s=>`<li style="font-size:13px;color:var(--text);line-height:1.6;margin-bottom:4px">${escHtml(s)}</li>`).join('')}
        </ol>
      </div>
    </div>`).join('');
}

function renderRecipeCard(method, recipeId) {
  const card = document.getElementById('r-recipe-card');
  if (!card) return;
  const options = getAllRecipesForMethod(method);
  const recipe = options.find(r => r.id === recipeId);
  if (!recipe) { card.innerHTML = ''; card.style.display = 'none'; return; }
  card.style.display = 'block';
  card.innerHTML = `
    <div style="background:var(--espresso);border-radius:var(--radius-sm);padding:14px;margin-top:10px">
      <div style="font-family:var(--font-display);font-size:15px;color:var(--crema-light);margin-bottom:2px">${escHtml(recipe.name)}</div>
      <div style="font-family:var(--font-mono);font-size:11px;color:rgba(245,237,227,.45);letter-spacing:1px;margin-bottom:12px">${recipe.dose}g · ${recipe.water}ml · ${recipe.temp}°C · ${escHtml(recipe.ratio)}${recipe.grindHint?' · '+escHtml(recipe.grindHint):''}${recipe.pours?' · '+recipe.pours+' pours':''}${recipe.totalTime?' · '+recipe.totalTime:''}</div>
      <ol style="padding-left:16px;margin:0">
        ${recipe.steps.map(s => `<li style="font-size:12px;color:rgba(245,237,227,.75);line-height:1.5;margin-bottom:5px">${escHtml(s)}</li>`).join('')}
      </ol>
    </div>`;
}

// ==================== LABEL PHOTO ====================
let pendingLabelDataUrl = null;

function handleLabelPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    pendingLabelDataUrl = await compressDataUrl(e.target.result);
    const wrap = document.getElementById('c-label-preview-wrap');
    wrap.innerHTML = `
      <div class="label-preview">
        <img src="${pendingLabelDataUrl}" alt="Bag label" data-on-click="openLightbox(this.src)" style="cursor:zoom-in">
        <button class="label-preview-remove" data-on-click="removeLabelPhoto()">✕</button>
      </div>`;
  };
  reader.readAsDataURL(file);
}

function removeLabelPhoto() {
  pendingLabelDataUrl = null;
  document.getElementById('c-label-input').value = '';
  document.getElementById('c-label-preview-wrap').innerHTML = `
    <div class="label-upload-btn" data-on-click="pickLabelPhoto()">
      <span style="line-height:0"><svg class="ico" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></svg></span>
      <span>Tap to take photo or upload</span>
    </div>`;
}

// ==================== COFFEE RATING ====================
let pendingCoffeeRating = 0;

function setCoffeeRating(n) {
  pendingCoffeeRating = n;
  document.getElementById('c-rating').value = n;
  document.querySelectorAll('.coffee-rating-btn').forEach((b,i) => b.classList.toggle('active', i < n));
  const labels = ['','Terrible','Poor','Below average','Average','OK','Decent','Good','Very good','Excellent','Outstanding'];
  document.getElementById('c-rating-label').textContent = n > 0 ? `${n}/10 — ${labels[n]}` : 'Not rated';
}


// ==================== PRICE & CURRENCY ====================
// Units of each currency per £1. Approximate fallback; refreshed from ECB rates (via Frankfurter) when online.
const FX_FALLBACK = { GBP:1, EUR:1.17, USD:1.33, AUD:2.02, CAD:1.83, NZD:2.22, JPY:195, CHF:1.10, SEK:13.9, NOK:14.3, DKK:8.7, HKD:10.4, SGD:1.72, KRW:1830, CNY:9.6 };
const CUR_SYMBOL = { GBP:'£', EUR:'€', USD:'$', AUD:'A$', CAD:'C$', NZD:'NZ$', JPY:'¥', CHF:'CHF ', SEK:'kr ', NOK:'kr ', DKK:'kr ', HKD:'HK$', SGD:'S$', KRW:'₩', CNY:'¥' };
let fxRates = { ...FX_FALLBACK }, fxLive = false, fxAt = null;
try { const cached = JSON.parse(localStorage.getItem('dialed_fx')||'null'); if (cached && cached.rates) { fxRates = { ...FX_FALLBACK, ...cached.rates, GBP:1 }; fxLive = true; fxAt = cached.at || null; } } catch(e) {}
async function refreshFx() {
  try {
    const cached = JSON.parse(localStorage.getItem('dialed_fx')||'null');
    if (cached && Date.now() - cached.at < 24*3600*1000) return;
    let r = await fetch('https://api.frankfurter.dev/v1/latest?base=GBP').catch(()=>null);
    if (!r || !r.ok) r = await fetch('https://api.frankfurter.app/latest?from=GBP');
    const d = await r.json();
    if (d && d.rates) { fxRates = { ...FX_FALLBACK, ...d.rates, GBP:1 }; fxLive = true; fxAt = Date.now(); localStorage.setItem('dialed_fx', JSON.stringify({ at: fxAt, rates: d.rates })); }
  } catch(e) { /* offline: keep cached or fallback rates */ }
}
function toGBP(amount, cur) { const r = fxRates[cur] || FX_FALLBACK[cur]; return r ? amount / r : null; }
// Exchange rates are only fetched when a price in another currency is actually in use
function needsFx() { return (state.coffees || []).some(c => c.price > 0 && c.currency && c.currency !== 'GBP' && !(c.priceGBP > 0)); }
function fxFor(cur) { if (cur && cur !== 'GBP') refreshFx().then(() => { try { updatePricePreview(); } catch(e) {} }); }
function buildPriceData(prev) {
  const price = parseFloat(document.getElementById('c-price').value);
  const weight = parseFloat(document.getElementById('c-weight').value);
  const currency = document.getElementById('c-currency').value || 'GBP';
  const w = weight > 0 ? weight : null;
  if (!(price > 0)) return { price:null, currency, weight:w, priceGBP:null, fxRate:null, fxDate:null, fxApprox:false };
  appSettings.lastCurrency = currency; saveSettings();
  // Price and currency untouched: keep the £ value from the day it was bought rather than re-converting at today's rate
  if (prev && prev.priceGBP > 0 && Number(prev.price) === price && (prev.currency || 'GBP') === currency)
    return { price, currency, weight:w, priceGBP: prev.priceGBP, fxRate: prev.fxRate ?? null, fxDate: prev.fxDate ?? null, fxApprox: !!prev.fxApprox };
  const g = toGBP(price, currency), foreign = currency !== 'GBP';
  return { price, currency, weight:w, priceGBP: g!=null ? Math.round(g*100)/100 : null,
    fxRate: foreign ? (fxRates[currency] || FX_FALLBACK[currency] || null) : null,
    fxDate: foreign ? new Date(fxLive && fxAt ? fxAt : Date.now()).toISOString().slice(0, 10) : null,
    fxApprox: foreign && !fxLive };
}
function showCosts() { return appSettings.showCosts !== false; }
function per100g(cf) { return (showCosts() && cf && cf.priceGBP > 0 && cf.weight > 0) ? cf.priceGBP / cf.weight * 100 : null; }
function priceLabel(cf) {
  if (!showCosts() || !cf || !(cf.price > 0)) return '';
  const whole = cf.currency==='JPY' || cf.currency==='KRW';
  const cur = cf.currency || 'GBP';
  const orig = (CUR_SYMBOL[cur] || cur+' ') + (whole ? Math.round(cf.price) : Number(cf.price).toFixed(2));
  const parts = [orig + (cf.weight ? ' · ' + cf.weight + 'g' : '')];
  if (per100g(cf) != null) parts.push((cf.fxApprox ? '≈£' : '£') + per100g(cf).toFixed(2) + '/100g');
  return parts.join(' · ');
}
function updatePricePreview() {
  const el = document.getElementById('c-price-preview'); if (!el) return;
  const price = parseFloat(document.getElementById('c-price')?.value);
  const weight = parseFloat(document.getElementById('c-weight')?.value);
  const cur = document.getElementById('c-currency')?.value || 'GBP';
  if (!(price > 0)) { el.textContent = ''; return; }
  const g = toGBP(price, cur);
  let t = (cur !== 'GBP' && g != null) ? '≈ £' + g.toFixed(2) + (fxLive ? '' : ' (approx. rate)') : '';
  if (weight > 0 && g != null) t += (t ? ' · ' : '') + '£' + (g / weight * 100).toFixed(2) + ' per 100g';
  el.textContent = t;
}

function renderBackupReminder() {
  const el = document.getElementById('backup-reminder'); if (!el) return;
  const last = appSettings.lastBackupAt || 0, snoozed = appSettings.backupSnoozeUntil || 0;
  const hasData = state.coffees.length + state.recipes.length >= 3;
  const due = Date.now() - last > 30*24*3600*1000 && Date.now() > snoozed;
  if (!hasData || !due) { el.innerHTML = ''; return; }
  const days = last ? Math.floor((Date.now()-last)/86400000) : null;
  el.innerHTML = `<div style="display:flex;align-items:center;gap:10px;background:rgba(82,121,111,0.1);border:1px solid rgba(82,121,111,0.3);border-radius:10px;padding:10px 12px;margin-bottom:14px">
    <div style="flex:1;font-size:12px;color:var(--text);line-height:1.4"><b>Back up your data</b><br><span style="color:var(--text-muted)">${days===null?'No backup yet':'Last backup '+days+' days ago'} — it only lives on this phone.</span></div>
    <button class="btn-secondary" style="padding:8px 10px;color:var(--text)" data-on-click="backupData()">Export</button>
    <button class="btn-secondary" style="padding:8px 10px" data-on-click="snoozeBackupReminder()" aria-label="Remind me later">✕</button>
  </div>`;
}

// ==================== SAVE COFFEE ====================
function toggleCustomProcess(sel) {
  const custom = document.getElementById('c-process-custom');
  custom.style.display = sel.value === 'Other…' ? 'block' : 'none';
}

function getProcessValue() {
  const sel = document.getElementById('c-process');
  if (sel.value === 'Other…') return document.getElementById('c-process-custom').value.trim() || 'Other';
  return sel.value;
}

const SUGGEST_FIELDS = ['roaster', 'roasterCity', 'roasterCountry', 'producer', 'farm', 'country', 'region', 'varietal'];
function canonicalSpelling(key, value, exceptId) {
  const k = String(value).trim().toLowerCase().replace(/\s+/g, ' ');
  const hit = topN(state.coffees.filter(c => c.id !== exceptId), key).find(([v]) => v.toLowerCase().replace(/\s+/g, ' ') === k);
  return hit ? hit[0] : String(value).trim();
}
// Existing values offered as you type
function fillCoffeeSuggestions() {
  SUGGEST_FIELDS.forEach(k => { const dl = document.getElementById('dl-' + k); if (dl) dl.innerHTML = topN(state.coffees, k).slice(0, 40).map(([v]) => `<option value="${escHtml(v)}"></option>`).join(''); });
  const dn = document.getElementById('dl-notes'); if (dn) dn.innerHTML = knownNotes().slice(0, 60).map(v => `<option value="${escHtml(v)}"></option>`).join('');
}
// ---- Tasting notes as chips. The hidden #c-notes field still holds them joined ("Blueberry, jasmine"),
// so they are stored and shown exactly as before. ----
const splitNotes = str => { const seen = new Set(); return String(str || '').split(/[,;\n]+/).map(x => x.trim().replace(/\s+/g, ' ')).filter(x => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase())); };
function knownNotes() {      // every note used so far, most common first
  const n = {}; state.coffees.forEach(c => splitNotes(c.notes).forEach(x => { const k = x.toLowerCase(); (n[k] = n[k] || { v: x, c: 0 }).c++; }));
  return Object.values(n).sort((a, b) => b.c - a.c || a.v.localeCompare(b.v)).map(x => x.v);
}
const noteList = () => splitNotes(document.getElementById('c-notes')?.value);
function setNoteList(arr) { const h = document.getElementById('c-notes'); if (h) h.value = arr.join(', '); renderNoteChips(); }
function renderNoteChips() {
  const el = document.getElementById('c-notes-chips'); if (!el) return;
  el.innerHTML = noteList().map((n, i) => `<span class="note-chip">${escHtml(n)}<button type="button" aria-label="Remove ${escHtml(n)}" data-on-click="removeNoteChip(${i})">×</button></span>`).join('');
}
function addNotes(text) {
  const list = noteList(), known = knownNotes();
  splitNotes(text).forEach(n => {
    n = n.slice(0, 40);
    const same = known.find(k => k.toLowerCase() === n.toLowerCase());     // reuse the spelling already in the library
    if (!list.some(x => x.toLowerCase() === n.toLowerCase())) list.push(same || n);
  });
  setNoteList(list);
}
function removeNoteChip(i) { const list = noteList(); list.splice(i, 1); setNoteList(list); }
function commitNoteEntry() { const el = document.getElementById('c-note-entry'); if (!el || !el.value.trim()) { if (el) el.value = ''; return; } addNotes(el.value); el.value = ''; }
function noteKey(e) {
  if (e.key === 'Enter') { e.preventDefault(); commitNoteEntry(); }
  else if (e.key === 'Backspace' && e.target.value === '' && noteList().length) { const list = noteList(); list.pop(); setNoteList(list); }
}
function noteInput(el) {      // typing or pasting a comma finishes the note(s) before it
  if (!/[,;\n]/.test(el.value)) return;
  const i = Math.max(el.value.lastIndexOf(','), el.value.lastIndexOf(';'), el.value.lastIndexOf('\n'));
  addNotes(el.value.slice(0, i)); el.value = el.value.slice(i + 1).replace(/^\s+/, '');
}

// ---- Roasters ----
function cleanUrl(v) {
  v = String(v || '').trim(); if (!v) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = 'https://' + v;
  try { const u = new URL(v); return (/^https?:$/.test(u.protocol) && u.hostname.includes('.') && !/[\s"'<>`]/.test(u.href)) ? u.href : ''; } catch(e) { return ''; }
}
const roasterKey = n => String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
function roasterInfo(name) {
  const k = roasterKey(name), cs = state.coffees.filter(c => k && roasterKey(c.roaster) === k);
  const pick = f => (cs.find(c => c[f]) || {})[f] || '';
  return { name: cs.length ? cs[0].roaster : String(name || ''), coffees: cs, city: pick('roasterCity'), country: pick('roasterCountry'), website: pick('roasterWebsite') };
}
// Picking a roaster you've used before fills in what's already known about it
function roasterPicked() {
  const info = roasterInfo(document.getElementById('c-roaster').value); if (!info.coffees.length) return;
  [['c-roaster-city', info.city], ['c-roaster-country', info.country], ['c-roaster-web', info.website]].forEach(([id, v]) => { const el = document.getElementById(id); if (el && !el.value && v) el.value = v; });
}
function mapsUrl(q) {
  const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return (apple ? 'https://maps.apple.com/?q=' : 'https://www.google.com/maps/search/?api=1&query=') + encodeURIComponent(q);
}
const extLink = (url, label, cls) => `<a class="${cls}" href="${escHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
function openRoasters() {
  const by = {}; state.coffees.forEach(c => { const k = roasterKey(c.roaster); if (k) (by[k] = by[k] || []).push(c); });
  const rows = Object.values(by).sort((a, b) => b.length - a.length || a[0].roaster.localeCompare(b[0].roaster)).map(cs => {
    const info = roasterInfo(cs[0].roaster);
    return `<button type="button" class="roaster-row" data-roaster="${escHtml(info.name)}" data-on-click="showRoasterFrom(this)"><div><div class="rr-name">${escHtml(info.name)}</div><div class="rr-sub">${escHtml([info.city, info.country].filter(Boolean).join(', ') || 'Location not set')}</div></div><div class="rr-right">${cs.length} coffee${cs.length === 1 ? '' : 's'} ›</div></button>`;
  }).join('');
  document.getElementById('roasters-content').innerHTML =
    extLink(mapsUrl('specialty coffee roasters near me'), 'Find roasters near me', 'btn-primary') +
    `<div style="height:8px"></div>` + extLink(mapsUrl('specialty coffee shop near me'), 'Coffee shops near me', 'btn-secondary') +
    `<div class="roaster-note">Opens your maps app, which uses its own location. dialed never sees where you are.</div>` +
    `<div class="divider" style="margin-top:18px">Your roasters</div>` +
    (rows || `<div class="roaster-note">No roasters yet — add a roaster name to a coffee and it will appear here.</div>`);
  openModal('modal-roasters');
}
function showRoasterFrom(el) { showRoaster(el.dataset.roaster); }
function showRoaster(name) {
  const info = roasterInfo(name); if (!info.coffees.length) return;
  const ids = new Set(info.coffees.map(c => c.id)), brews = state.recipes.filter(r => ids.has(r.coffeeId)).length;
  const rated = info.coffees.filter(c => c.rating > 0), avg = rated.length ? (rated.reduce((s, c) => s + Number(c.rating), 0) / rated.length).toFixed(1) : '—';
  const bought = info.coffees.filter(c => c.priceGBP > 0), spent = bought.reduce((s, c) => s + Number(c.priceGBP), 0);
  const where = [info.city, info.country].filter(Boolean).join(', ');
  const host = info.website ? (() => { try { return new URL(info.website).hostname.replace(/^www\./, ''); } catch(e) { return 'Website'; } })() : '';
  document.getElementById('roaster-content').innerHTML = `
    <div class="modal-title" id="roaster-title">${escHtml(info.name)}</div>
    <div class="modal-subtitle">${escHtml(where || 'Location not set')}</div>
    <div class="roaster-links">${info.website ? extLink(info.website, escHtml(host), 'btn-primary') : ''}${extLink(mapsUrl(info.name + (where ? ' ' + where : '')), 'Find on map', info.website ? 'btn-secondary' : 'btn-primary')}</div>
    ${info.website ? '' : '<div class="roaster-note">No website saved. Edit any coffee from this roaster to add one.</div>'}
    <div class="roaster-stats">
      <div><b>${info.coffees.length}</b><span>Coffee${info.coffees.length === 1 ? '' : 's'}</span></div>
      <div><b>${brews}</b><span>Brew${brews === 1 ? '' : 's'}</span></div>
      <div><b>${avg}</b><span>Avg rating</span></div>
      ${showCosts() && bought.length ? `<div><b>${bought.some(c => c.fxApprox) ? '≈' : ''}£${spent.toFixed(2)}</b><span>Spent</span></div>` : ''}
    </div>
    <div class="divider" style="margin-top:14px">Coffees</div>
    ${info.coffees.map(c => `<button type="button" class="roaster-row" data-on-click="openCoffeeFromRoaster('${c.id}')"><div><div class="rr-name">${escHtml(c.name)}</div><div class="rr-sub">${escHtml([c.country, c.process].filter(Boolean).join(' · ') || ' ')}</div></div><div class="rr-right">${c.rating > 0 ? c.rating + '/10' : ''}${c.finishedBag ? (c.rating > 0 ? ' · ' : '') + 'Finished' : ''} ›</div></button>`).join('')}`;
  openModal('modal-roaster');
}
function openCoffeeFromRoaster(id) {
  closeModal('modal-roaster'); closeModal('modal-roasters');
  showView('coffees'); showCoffeeDetail(id);
}

function resetCoffeeModal() {
  fillCoffeeSuggestions();
  document.getElementById('c-modal-title').textContent = 'Add Coffee';
  document.getElementById('c-edit-id').value = '';
  ['c-name','c-roaster','c-roaster-city','c-roaster-country','c-roaster-web','c-producer','c-farm',
   'c-country','c-region','c-varietal','c-notes','c-note-entry','c-roastdate','c-masl','c-process-custom','c-weight','c-price']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  renderNoteChips();
  document.getElementById('c-process').value='';
  document.getElementById('c-process-custom').style.display='none';
  document.getElementById('c-roast').value='';
  const cdecaf=document.getElementById('c-decaf'); if(cdecaf) cdecaf.checked=false;
  const ccur=document.getElementById('c-currency'); if(ccur) ccur.value=appSettings.lastCurrency||'GBP';
  updatePricePreview();
  pendingCoffeeRating=0;
  document.getElementById('c-rating').value=0;
  document.querySelectorAll('.coffee-rating-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('c-rating-label').textContent='Not rated';
  pendingLabelDataUrl=null;
  document.getElementById('c-label-input').value='';
  document.getElementById('c-label-preview-wrap').innerHTML='<div class="label-upload-btn" data-on-click="pickLabelPhoto()"><span style="line-height:0"><svg class="ico" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></svg></span><span>Tap to take photo or upload</span></div>';
}

function openEditCoffee(id) {
  fillCoffeeSuggestions();
  const coffee = state.coffees.find(x=>x.id===id);
  if (!coffee) return;
  // Always close any open modal first, then reset, to avoid stale state
  closeModal('modal-coffee');
  setTimeout(() => {
  resetCoffeeModal();
  document.getElementById('c-modal-title').textContent = 'Edit Coffee';
  document.getElementById('c-edit-id').value = id;
  document.getElementById('c-name').value = coffee.name || '';
  const cdecaf2=document.getElementById('c-decaf'); if(cdecaf2) cdecaf2.checked=!!coffee.decaf;
  document.getElementById('c-roaster').value = coffee.roaster || '';
  document.getElementById('c-roaster-city').value = coffee.roasterCity || '';
  document.getElementById('c-roaster-country').value = coffee.roasterCountry || '';
  document.getElementById('c-roaster-web').value = coffee.roasterWebsite || '';
  document.getElementById('c-producer').value = coffee.producer || '';
  document.getElementById('c-farm').value = coffee.farm || '';
  document.getElementById('c-country').value = coffee.country || '';
  document.getElementById('c-region').value = coffee.region || '';
  document.getElementById('c-varietal').value = coffee.varietal || '';
  document.getElementById('c-masl').value = coffee.masl || '';
  document.getElementById('c-roast').value = coffee.roastLevel || '';
  document.getElementById('c-roastdate').value = coffee.roastDate || '';
  document.getElementById('c-weight').value = coffee.weight || '';
  document.getElementById('c-price').value = coffee.price || '';
  document.getElementById('c-currency').value = coffee.currency || 'GBP';
  updatePricePreview();
  document.getElementById('c-notes').value = coffee.notes || ''; renderNoteChips();
  // Process
  const knownProcesses = ['Washed','Natural','Honey','Anaerobic','Wet Hulled','Carbonic Maceration','Extended Fermentation'];
  if (knownProcesses.includes(coffee.process)) {
    document.getElementById('c-process').value = coffee.process;
  } else if (coffee.process) {
    document.getElementById('c-process').value = 'Other…';
    document.getElementById('c-process-custom').value = coffee.process;
    document.getElementById('c-process-custom').style.display = 'block';
  }
  // Rating
  if (coffee.rating) { setCoffeeRating(coffee.rating); }
  // Photo
  if (coffee.labelPhoto) {
    pendingLabelDataUrl = coffee.labelPhoto;
    document.getElementById('c-label-preview-wrap').innerHTML = `<div class="label-preview"><img src="${coffee.labelPhoto}" alt="Bag label"><button class="label-preview-remove" data-on-click="removeLabelPhoto()">✕</button></div>`;
  }
  openModal('modal-coffee');
  }, 50);
}

function saveCoffee() {
  const name = document.getElementById('c-name').value.trim();
  if (!name) { showToast('Enter a coffee name'); return; }
  const cw = document.getElementById('c-weight').value, cp = document.getElementById('c-price').value, cm = document.getElementById('c-masl').value;
  if (cw !== '' && !(parseFloat(cw) > 0)) { showToast('Bag weight should be more than 0g'); return; }
  if (cp !== '' && !(parseFloat(cp) >= 0)) { showToast("Price can't be negative"); return; }
  if (cm !== '' && !(parseFloat(cm) >= 0 && parseFloat(cm) <= 4000)) { showToast('Altitude should be between 0 and 4000m'); return; }
  const webRaw = document.getElementById('c-roaster-web').value, web = cleanUrl(webRaw);
  if (webRaw.trim() && !web) { showToast("That website address doesn't look right"); return; }
  if (!tapOnce('saveCoffee')) return;
  commitNoteEntry();      // a note still being typed counts
  const editId = document.getElementById('c-edit-id').value;
  const coffeeData = {
    name,
    decaf: document.getElementById('c-decaf')?.checked||false,
    roaster: document.getElementById('c-roaster').value.trim(),
    roasterCity: document.getElementById('c-roaster-city').value.trim(),
    roasterCountry: document.getElementById('c-roaster-country').value.trim(),
    roasterWebsite: web || '',
    producer: document.getElementById('c-producer').value.trim(),
    farm: document.getElementById('c-farm').value.trim(),
    country: document.getElementById('c-country').value.trim(),
    region: document.getElementById('c-region').value.trim(),
    varietal: document.getElementById('c-varietal').value.trim(),
    masl: document.getElementById('c-masl').value || null,
    process: getProcessValue(),
    roastLevel: document.getElementById('c-roast').value,
    roastDate: document.getElementById('c-roastdate').value,
    ...buildPriceData(editId ? state.coffees.find(x => x.id === editId) : null),
    notes: document.getElementById('c-notes').value.trim(),
    labelPhoto: pendingLabelDataUrl || null,
    rating: pendingCoffeeRating || 0,
  };
  // Reuse the spelling already used for the same value (e.g. "colombia" -> "Colombia") so categories don't split
  SUGGEST_FIELDS.forEach(k => { if (coffeeData[k]) coffeeData[k] = canonicalSpelling(k, coffeeData[k], editId); });
  if (editId) {
    const idx = state.coffees.findIndex(x=>x.id===editId);
    if (idx >= 0) state.coffees[idx] = { ...state.coffees[idx], ...coffeeData };
    showToast('Coffee updated ✓');
  } else {
    state.coffees.unshift({ id: newId(), createdAt: new Date().toISOString(), ...coffeeData });
    showToast('Coffee added ✓');
  }
  save(); closeModal('modal-coffee');
  resetCoffeeModal();
  renderDashboard();
  if (state.currentView==='coffees') renderCoffeesView();
  if (editId) showCoffeeDetail(editId);
}

// ==================== SAVE RECIPE ====================
// Ignore a second tap that lands before the first save has finished closing the sheet
const busyUntil = {};
function tapOnce(key, ms = 700) { const now = Date.now(); if (busyUntil[key] && now < busyUntil[key]) return false; busyUntil[key] = now + ms; return true; }
function brewInputProblem() {
  const val = id => { const el = document.getElementById(id); return el && el.value !== '' ? parseFloat(el.value) : null; };
  const isEsp = isEspressoMethod(state.selectedMethod || 'Espresso');
  const dose = val('r-dose'), out = val('r-yield'), temp = val('r-temp'), grind = val('r-grind');
  if (dose !== null && !(dose > 0 && dose <= 500)) return 'Dose should be between 0 and 500g';
  if (out !== null && !(out > 0 && out <= 5000)) return (isEsp ? 'Yield' : 'Water') + ' should be more than 0';
  if (temp !== null && !(temp >= 0 && temp <= 100)) return 'Temperature should be between 0 and 100°C';
  if (grind !== null && grind < 0) return "Grind setting can't be negative";
  if (isEsp) { const t = val('r-time'); if (t !== null && !(t >= 0 && t <= 600)) return 'Time should be between 0 and 600 seconds'; }
  else { const m = val('r-time-mins'), sec = val('r-time-secs');
    if (m !== null && !(m >= 0 && m <= 1440)) return "Minutes can't be negative";
    if (sec !== null && !(sec >= 0 && sec <= 59)) return 'Seconds should be between 0 and 59'; }
  return '';
}
function saveRecipe(opts) {
  opts = opts || {};
  if (!state.selectedCoffeeId) { showToast('Select a coffee'); return; }
  const problem = brewInputProblem(); if (problem) { showToast(problem); return; }
  if (!tapOnce('saveRecipe')) return;
  if (brewTimer.startedAt) stopBrewTimer();
  const editBrewId = document.getElementById('r-edit-id')?.value||'';
  const brewData = {coffeeId:state.selectedCoffeeId, grinderId:state.selectedGrinderId||null, recipeId:state.selectedRecipeId||null, method:state.selectedMethod||'Espresso', grind:document.getElementById('r-grind').value, dose:document.getElementById('r-dose').value, yield:document.getElementById('r-yield').value, time:getBrewTimeSecs(), temp:document.getElementById('r-temp').value, extraction:state.selectedExtraction, rating:state.selectedRating, notes:document.getElementById('r-notes').value.trim(), taste:readTaste(), grindUm: settingToMicrons(selectedGrinder(), document.getElementById('r-grind').value)};
  const scoreMode = isScoreOnly();
  let wasAwaiting = false;
  if (opts.later && !editBrewId) { brewData.awaitingScore = true; brewData.scoreRemindAt = new Date(Date.now() + opts.later * 60000).toISOString(); }
  if (editBrewId) {
    const idx = state.recipes.findIndex(x=>x.id===editBrewId);
    if(idx>=0) {
      const merged = {...state.recipes[idx],...brewData};
      // A brew saved to score later is finished once a score has been given
      if (merged.awaitingScore && (scoreMode || brewData.rating > 0 || brewData.extraction)) { wasAwaiting = true; delete merged.awaitingScore; delete merged.scoreRemindAt; delete merged.scoreNotified; }
      state.recipes[idx] = merged;
    }
  }
  let newBrewId = null;
  if (!editBrewId) {
    newBrewId = newId();
    state.recipes.unshift({id:newBrewId, createdAt:new Date().toISOString(), ...brewData});
  }
  const planId = document.getElementById('r-plan-id')?.value || '';
  if (planId) { state.plannedBrews = (state.plannedBrews||[]).filter(p => p.id !== planId); document.getElementById('r-plan-id').value=''; }
  resetBrewTimer();
  save(); closeModal('modal-recipe');
  ['r-grind','r-dose','r-yield','r-time','r-time-mins','r-time-secs','r-temp','r-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const re2=document.getElementById('r-edit-id');if(re2)re2.value='';
  const rt2=document.getElementById('r-modal-title');if(rt2)rt2.textContent='Log Brew';
  state.selectedExtraction=''; state.selectedRating=0;
  document.querySelectorAll('.extraction-btn').forEach(b=>b.classList.remove('selected'));
  setRating(0);
  setScoreOnly(false); scheduleScoreReminders();
  showToast(opts.later ? `Brew saved — reminder in ${opts.later} min` : wasAwaiting ? 'Brew scored ✓' : editBrewId ? 'Brew updated ✓' : 'Brew logged ✓'); rerenderCurrentView();
  const bagCf = state.coffees.find(x => x.id === brewData.coffeeId);
  const finishTick = document.getElementById('r-finish-bag');
  const finishNow = !!(finishTick && finishTick.checked); if (finishTick) finishTick.checked = false;
  if (finishNow && bagCf && !bagCf.finishedBag) setTimeout(() => openFinishBag(bagCf.id), 350);   // last brew: rate the bag instead of planning the next one
  else {
    // Planning the next brew needs the taste result, so it waits until the brew has been scored
    const planFor = opts.later ? null : (newBrewId || (wasAwaiting ? editBrewId : null));
    if (planFor) setTimeout(() => openPlanNext(planFor), 350);
    if (newBrewId && bagCf && !bagCf.finishedBag && gramsLeft(bagCf) === 0) setTimeout(() => showToast('That bag looks empty — finish it from its ⋯ menu'), 2600);
  }
}
