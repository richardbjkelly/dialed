// dialed — Water: two mineral concentrate bottles (A: hardness, B: buffer), water styles, a drops calculator,
// bottle recipes from the salts you have, drop calibration, water on each brew and Insights by water.
// Loaded after tools.js and before app.js. Optional: everything is hidden until switched on in Settings.

// ==================== CHEMISTRY ====================
// gh / kh: mg/L "as CaCO3" added per mg of salt dissolved in a litre. dry: the share of the salt's weight left as
// dissolved minerals (water of crystallisation doesn't count), used to estimate the TDS meter reading.
const SALTS = {
  mgcl2:  { name: 'Magnesium chloride', f: 'MgCl2·6H2O', role: 'gh', ion: 'Mg', gh: 100.09 / 203.30, dry: 95.21 / 203.30 },
  mgso4:  { name: 'Epsom salt (magnesium sulfate)', f: 'MgSO4·7H2O', role: 'gh', ion: 'Mg', gh: 100.09 / 246.47, dry: 120.37 / 246.47, sulfate: true },
  cacl2:  { name: 'Calcium chloride', f: 'CaCl2·2H2O', role: 'gh', ion: 'Ca', gh: 100.09 / 147.01, dry: 110.98 / 147.01 },
  cacl2a: { name: 'Calcium chloride, anhydrous', f: 'CaCl2', role: 'gh', ion: 'Ca', gh: 100.09 / 110.98, dry: 1 },
  nahco3: { name: 'Baking soda (sodium bicarbonate)', f: 'NaHCO3', role: 'kh', kh: 50.04 / 84.007, dry: 1 },
  khco3:  { name: 'Potassium bicarbonate', f: 'KHCO3', role: 'kh', kh: 50.04 / 100.115, dry: 1 },
};
const SALT_ORDER = ['mgcl2', 'mgso4', 'cacl2', 'cacl2a', 'nahco3', 'khco3'];
const TARGET_A_GH = 30, TARGET_B_KH = 15;      // bottle strength per g of concentrate in a litre: keeps the styles' g/L simple
const TDS_METER = 0.92;                         // typical meter reading ÷ dissolved minerals (checked against a 133 ppm reading)
// Built-in water styles (target GH / KH, as CaCO3)
const WATER_STYLES = [
  { id: 'w-bright',   name: 'Bright & juicy',   gh: 60, kh: 15,   note: 'Lifts acidity and fruit' },
  { id: 'w-balanced', name: 'Balanced',         gh: 45, kh: 22.5, note: 'An all-rounder' },
  { id: 'w-sweet',    name: 'Sweet & creamy',   gh: 45, kh: 30,   note: 'Rounder, softer acidity' },
  { id: 'w-delicate', name: 'Delicate & floral', gh: 30, kh: 15,  note: 'Light, clear and tea-like' },
];
// Well-known published waters (GH / KH as CaCO3). Most are made with Epsom salt alone, so their hardness is all
// magnesium; from your bottles the GH and KH match but the taste may be a little rounder.
const REFERENCE_WATERS = [
  { id: 'w-sca',      name: 'SCA standard',    gh: 68,  kh: 40, note: 'The Specialty Coffee Association target: a textbook all-rounder' },
  { id: 'w-bh',       name: 'Barista Hustle',  gh: 81,  kh: 40, note: "Barista Hustle's suggested starting point for most coffees" },
  { id: 'w-budapest', name: 'WOC Budapest',    gh: 51,  kh: 40, note: 'World Brewers Cup competition water: clean and balanced' },
  { id: 'w-rao',      name: 'Rao',             gh: 76,  kh: 50, note: "Close to Scott Rao's recipe: balanced, softer acidity" },
  { id: 'w-hendon',   name: 'Hendon',          gh: 100, kh: 31, note: 'From Water for Coffee: extracts strongly, punchy and sweet' },
  { id: 'w-melbourne',name: 'Melbourne',       gh: 24,  kh: 12, note: 'Very soft city water: long filter brews, cupping, very light roasts' },
  { id: 'w-espresso', name: 'Espresso',        gh: 25,  kh: 45, note: 'Low hardness, more buffer (like Lotus espresso): a rounder, less sharp shot' },
];
const formulaHtml = f => escHtml(f).replace(/([A-Za-z)])(\d+)/g, '$1<sub>$2</sub>');
function defaultWaterState() {
  return { enabled: false, dropsPerGram: 20, salts: ['mgcl2', 'cacl2', 'nahco3', 'khco3'],
    bottles: { A: { total: 20, salts: { mgcl2: 0.85, cacl2: 0.26 } }, B: { total: 20, salts: { nahco3: 0.25, khco3: 0.30 } } },
    custom: [], lastId: null, addTo: 'cup' };
}
function W() { if (!state.water) state.water = defaultWaterState(); return state.water; }
function waterOn() { return !!(state.water && state.water.enabled); }

// Imported or stored water settings: numbers in range, known salts only, short plain names
function cleanWaterState(raw) {
  const d = defaultWaterState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
  const n = (v, lo, hi, def) => { const x = Number(v); return isFinite(x) && x >= lo && x <= hi ? x : def; };
  const name = v => String(v == null ? '' : v).replace(/[\u0000-\u001f<>`"]/g, '').trim().slice(0, 30);
  const bottle = (b, role, def) => {
    if (!b || typeof b !== 'object') return def;
    const salts = {};
    Object.keys(b.salts || {}).forEach(k => { if (SALTS[k] && SALTS[k].role === role) { const g = n(b.salts[k], 0, 50, 0); if (g > 0) salts[k] = g; } });
    return Object.keys(salts).length ? { total: n(b.total, 1, 2000, def.total), salts } : def;
  };
  return {
    enabled: !!raw.enabled,
    dropsPerGram: n(raw.dropsPerGram, 5, 60, 20),
    salts: Array.isArray(raw.salts) ? raw.salts.filter(k => SALTS[k]) : d.salts,
    bottles: { A: bottle(raw.bottles && raw.bottles.A, 'gh', d.bottles.A), B: bottle(raw.bottles && raw.bottles.B, 'kh', d.bottles.B) },
    custom: (Array.isArray(raw.custom) ? raw.custom : []).filter(x => x && typeof x === 'object').slice(0, 30).map((x, i) => ({
      id: /^w-c[\w-]{1,30}$/.test(String(x.id)) ? String(x.id) : 'w-c' + Date.now().toString(36) + i,
      name: name(x.name) || 'My water', type: x.type === 'plain' ? 'plain' : 'mix',
      gh: n(x.gh, 0, 500, 0), kh: n(x.kh, 0, 500, 0) })),
    lastId: /^w-[\w-]{1,34}$/.test(String(raw.lastId)) ? String(raw.lastId) : null,
    addTo: raw.addTo === 'water' ? 'water' : 'cup',
  };
}
// The water recorded on a brew or a plan: a small snapshot, so renaming or deleting a style later doesn't change history
function cleanBrewWater(w) {
  if (!w || typeof w !== 'object') return undefined;
  const id = /^w-[\w-]{1,34}$/.test(String(w.id)) ? String(w.id) : null; if (!id) return undefined;
  const x = v => { const k = Number(v); return isFinite(k) && k >= 0 && k <= 500 ? Math.round(k * 10) / 10 : null; };
  return { id, name: String(w.name == null ? '' : w.name).replace(/[\u0000-\u001f<>`"]/g, '').slice(0, 30) || 'Water', gh: x(w.gh), kh: x(w.kh), type: w.type === 'plain' ? 'plain' : 'mix' };
}

// ==================== MATHS ====================
// mg/L of GH (or KH) that 1 g of a bottle adds to a litre; and the dissolved minerals (mg/L) it adds
function bottleStrength(b) {
  let gh = 0, kh = 0, dry = 0;
  Object.entries(b.salts).forEach(([k, g]) => { const s = SALTS[k], c = 1000 * g / b.total; if (s.gh) gh += c * s.gh; if (s.kh) kh += c * s.kh; dry += c * s.dry; });
  return { gh, kh, dry };
}
function allWaters() {
  const w = W();
  return [...WATER_STYLES.map(s => ({ ...s, type: 'mix', builtin: true })), ...REFERENCE_WATERS.map(s => ({ ...s, type: 'mix', builtin: true, ref: true })), ...w.custom];
}
function waterById(id) { return allWaters().find(x => x.id === id) || null; }
// What to add for a water at a volume (ml): grams and drops of each bottle, and the expected meter reading
function mixFor(water, ml) {
  const w = W(), A = bottleStrength(w.bottles.A), B = bottleStrength(w.bottles.B);
  const gA = A.gh > 0 ? water.gh / A.gh : 0, gB = B.kh > 0 ? water.kh / B.kh : 0;   // g per litre
  const L = ml / 1000;
  const mg = gA * A.dry + gB * B.dry;
  const ppm = mg * TDS_METER;
  return { gLA: gA, gLB: gB, gA: gA * L, gB: gB * L, dA: gA * L * w.dropsPerGram, dB: gB * L * w.dropsPerGram,
    ppmLo: Math.round(ppm * 0.95 / 5) * 5, ppmHi: Math.round(ppm * 1.05 / 5) * 5, ppm: Math.round(ppm) };
}
function fmtDrops(d) {
  if (d >= 30) return String(Math.round(d));
  const h = Math.round(d * 2) / 2, whole = Math.floor(h);
  return h % 1 ? (whole ? whole + '½' : '½') : String(h);
}
const fmtNum = v => (Math.round(v * 10) / 10).toString();
const fmtG = g => g < 0.1 ? g.toFixed(3) : g.toFixed(2);
function waterSummary(water, ml) {
  if (water.type === 'plain') return [water.gh ? 'GH ' + fmtNum(water.gh) : '', water.kh ? 'KH ' + fmtNum(water.kh) : ''].filter(Boolean).join(' · ') || 'No minerals added';
  const m = mixFor(water, ml || 250);
  return `GH ${fmtNum(water.gh)} · KH ${fmtNum(water.kh)} · ${ml || 250} ml: ${fmtDrops(m.dA)} + ${fmtDrops(m.dB)} drops`;
}

// Bottle recipes from the salts you have. Strength stays at 30 GH (A) and 15 KH (B) per g/L, so the styles don't change.
function suggestBottles(owned, opts) {
  const has = k => owned.includes(k);
  const notes = [];
  const mg = has('mgcl2') ? 'mgcl2' : has('mgso4') ? 'mgso4' : null;
  let ca = has('cacl2') ? 'cacl2' : has('cacl2a') ? 'cacl2a' : null;
  if (mg === 'mgso4' && ca) { notes.push('Calcium is left out: with Epsom salt in the same bottle it would slowly cloud out as gypsum. Magnesium chloride would let you include it.'); ca = null; }
  const mgShare = mg && ca ? ({ mg: 0.7, even: 0.5, ca: 0.3 }[opts.balance] ?? 0.7) : mg ? 1 : ca ? 0 : null;
  const total = opts.total;
  let A = null, B = null;
  if (mgShare != null) {
    const salts = {};
    if (mg && mgShare > 0) salts[mg] = TARGET_A_GH * mgShare / (1000 * SALTS[mg].gh) * total;
    if (ca && mgShare < 1) salts[ca] = TARGET_A_GH * (1 - mgShare) / (1000 * SALTS[ca].gh) * total;
    A = { total, salts };
  } else notes.push('Bottle A needs a magnesium or calcium salt.');
  const na = has('nahco3'), k = has('khco3');
  if (na || k) {
    const naShare = na && k ? ({ na: 1, k: 0 }[opts.buffer] ?? 0.5) : na ? 1 : 0;
    const salts = {};
    if (na && naShare > 0) salts.nahco3 = TARGET_B_KH * naShare / (1000 * SALTS.nahco3.kh) * total;
    if (k && naShare < 1) salts.khco3 = TARGET_B_KH * (1 - naShare) / (1000 * SALTS.khco3.kh) * total;
    B = { total, salts };
  } else notes.push('Bottle B needs baking soda or potassium bicarbonate.');
  return { A, B, notes, both: { mgca: !!(mg && ca), nak: na && k } };
}

// ==================== WATER PAGE ====================
function openWater() { showView('water'); }
function renderWaterView() {
  const el = document.getElementById('water-body'); if (!el) return;
  const w = W();
  const sw = document.getElementById('water-switch'); if (sw) sw.setAttribute('aria-checked', String(w.enabled));
  if (!w.enabled) {
    el.innerHTML = `<div class="water-off">Water tracking is off. Turn it on to pick a water when you log a brew, mix it with your mineral bottles, and compare results by water in Insights.</div>`;
    return;
  }
  const A = bottleStrength(w.bottles.A), B = bottleStrength(w.bottles.B);
  const comp = b => Object.entries(b.salts).map(([k, g]) => `${fmtG(g)} g ${formulaHtml(SALTS[k].f)}`).join(' + ') + ` in ${fmtNum(b.total)} g`;
  const last = w.lastId;
  const card = x => {
    const sum = x.type === 'plain' ? waterSummary(x) : `A ${fmtNum(x.gh / A.gh)} + B ${fmtNum(x.kh / B.kh)} g/L · ≈${mixFor(x, 1000).ppm} ppm`;
    return `<div class="water-card" role="button" tabindex="0" data-on-click="openWaterMix('${x.id}')">
      <div style="flex:1;min-width:0"><div class="wc-name">${escHtml(x.name)}${x.id === last ? ' <span class="wc-last">last used</span>' : ''}</div><div class="wc-sub">${sum}</div>${x.note ? `<div class="wc-note">${escHtml(x.note)}</div>` : ''}</div>
      <span class="wc-pill">${x.type === 'plain' ? 'Tap / bottled' : 'GH ' + fmtNum(x.gh) + ' · KH ' + fmtNum(x.kh)}</span></div>`;
  };
  el.innerHTML = `
    <div class="divider" style="margin-top:6px">Your bottles</div>
    <div class="water-bottles">
      <div class="wb wb-a"><div class="wb-k">Bottle A · hardness</div><div class="wb-v">${fmtNum(A.gh)} GH per g/L</div><div class="wb-s">${comp(w.bottles.A)}</div></div>
      <div class="wb wb-b"><div class="wb-k">Bottle B · buffer</div><div class="wb-v">${fmtNum(B.kh)} KH per g/L</div><div class="wb-s">${comp(w.bottles.B)}</div></div>
    </div>
    <div class="water-row"><div><div class="wr-k">Drops per gram</div><div class="wr-v">${fmtNum(w.dropsPerGram)}</div></div><button type="button" class="btn-secondary wr-btn" data-on-click="openWaterCal()">Calibrate</button></div>
    <div class="water-row"><div><div class="wr-k">I add the drops</div><div class="wr-s">${w.addTo === 'water' ? 'To the brew water, before brewing' : 'To the cup, after brewing: you get a reminder with the drops'}</div></div>
      <div class="seg" role="group" aria-label="When drops are added"><button type="button" class="${w.addTo !== 'water' ? 'on' : ''}" aria-pressed="${w.addTo !== 'water'}" data-on-click="setWaterAddTo('cup')">Cup</button><button type="button" class="${w.addTo === 'water' ? 'on' : ''}" aria-pressed="${w.addTo === 'water'}" data-on-click="setWaterAddTo('water')">Water</button></div></div>
    <div class="water-row"><div><div class="wr-k">Make new bottles</div><div class="wr-s">From the salts you have</div></div><button type="button" class="btn-secondary wr-btn" data-on-click="openWaterBottles()">Make</button></div>
    <div class="divider">Water styles</div>
    ${WATER_STYLES.map(s => card({ ...s, type: 'mix' })).join('')}
    <div class="divider">Reference waters</div>
    <div class="water-foot" style="margin:-6px 0 4px">Published recipes from the coffee world, made from your two bottles.</div>
    ${REFERENCE_WATERS.map(s => card({ ...s, type: 'mix' })).join('')}
    ${w.custom.length ? '<div class="divider">Yours</div>' + w.custom.map(card).join('') : ''}
    <div class="water-add">
      <button type="button" class="btn-secondary" data-on-click="openWaterMix('new')">+ Your own mix</button>
      <button type="button" class="btn-secondary" data-on-click="openWaterPlain()">+ Tap / bottled</button>
    </div>
    <div class="water-foot">Use distilled or RO water for mixes. Readings are estimates for a typical TDS meter.</div>`;
}
function toggleWater() {
  const w = W(); w.enabled = !w.enabled; save();
  const s = document.getElementById('settings-water-switch'); if (s) s.setAttribute('aria-checked', String(w.enabled));
  renderWaterView();
  showToast(w.enabled ? 'Water tracking on' : 'Water tracking off');
}

function setWaterAddTo(v) { W().addTo = v === 'water' ? 'water' : 'cup'; save(); renderWaterView(); }

// ---- Mix it ----
let waterMix = null;   // { id, name, gh, kh, type, ml, dirty }
function openWaterMix(id) {
  const x = id === 'new' ? { id: 'new', name: '', gh: 45, kh: 22.5, type: 'mix' } : waterById(id);
  if (!x) return;
  if (x.type === 'plain') { openWaterPlain(x.id); return; }
  waterMix = { ...x, ml: waterMix ? waterMix.ml : 250, dirty: id === 'new' };
  renderWaterMix(); openModal('modal-water-mix');
}
function renderWaterMix() {
  const m = waterMix; if (!m) return;
  const r = mixFor(m, m.ml);
  const custom = m.id === 'new' || !m.builtin;
  document.getElementById('wm-title').textContent = m.id === 'new' ? 'Your own mix' : m.name + (m.dirty && m.builtin ? ' (adjusted)' : '');
  const note = document.getElementById('wm-note'); if (note) { note.textContent = m.note || ''; note.hidden = !m.note; }
  document.getElementById('wm-sub').textContent = `GH ${fmtNum(m.gh)} · KH ${fmtNum(m.kh)} · A ${fmtNum(r.gLA)} + B ${fmtNum(r.gLB)} g/L`;
  document.querySelectorAll('#wm-vols .chip2').forEach(c => c.classList.toggle('on', Number(c.dataset.ml) === m.ml));
  const other = document.getElementById('wm-ml'); if (other && document.activeElement !== other) other.value = [100, 250, 500, 1000, 4000].includes(m.ml) ? '' : m.ml;
  document.getElementById('wm-da').textContent = fmtDrops(r.dA);
  document.getElementById('wm-db').textContent = fmtDrops(r.dB);
  document.getElementById('wm-ga').textContent = fmtG(r.gA) + ' g';
  document.getElementById('wm-gb').textContent = fmtG(r.gB) + ' g';
  const big = r.dA > 60 || r.dB > 60;
  document.getElementById('wm-res').innerHTML = `Gives <b>GH ${fmtNum(m.gh)} · KH ${fmtNum(m.kh)}</b>. A TDS meter should read about <b>${r.ppmLo}–${r.ppmHi} ppm</b>.` +
    `<div class="wm-hint">${big ? 'That many drops is easier to weigh: use the grams shown.' : 'Use distilled or RO water.'}</div>`;
  const gh = document.getElementById('wm-gh'), kh = document.getElementById('wm-kh');
  if (document.activeElement !== gh) gh.value = m.gh; if (document.activeElement !== kh) kh.value = m.kh;
  document.getElementById('wm-gh-n').value = fmtNum(m.gh); document.getElementById('wm-kh-n').value = fmtNum(m.kh);
  document.getElementById('wm-save-row').hidden = !(m.dirty || custom);
  const nm = document.getElementById('wm-name'); if (nm && document.activeElement !== nm) nm.value = custom && m.id !== 'new' ? m.name : '';
  document.getElementById('wm-save').textContent = custom && m.id !== 'new' ? 'Save changes' : 'Save as a new water';
  document.getElementById('wm-delete').hidden = !(custom && m.id !== 'new');
}
function setWaterMl(ml) { if (!waterMix) return; const v = Math.round(Number(ml)); if (v >= 10 && v <= 20000) { waterMix.ml = v; renderWaterMix(); } }
function slideWater(kind, v) {
  if (!waterMix) return; const x = Math.max(0, Math.min(kind === 'gh' ? 200 : 100, Number(v) || 0));
  waterMix[kind] = Math.round(x * 2) / 2; waterMix.dirty = true; renderWaterMix();
}
function saveWaterMix() {
  const m = waterMix; if (!m) return; const w = W();
  const name = (document.getElementById('wm-name').value || '').replace(/[\u0000-\u001f<>`"]/g, '').trim().slice(0, 30);
  if (!name) { showToast('Give it a name'); document.getElementById('wm-name').focus(); return; }
  const existing = w.custom.find(x => x.id === m.id);
  if (existing) Object.assign(existing, { name, gh: m.gh, kh: m.kh });
  else w.custom.push({ id: 'w-c' + Date.now().toString(36), name, type: 'mix', gh: m.gh, kh: m.kh });
  save(); closeModal('modal-water-mix'); renderWaterView(); showToast('Water saved');
}
function deleteWaterMix(id) {
  const x = W().custom.find(c => c.id === (id || (waterMix && waterMix.id))); if (!x) return;
  confirmAction({ title: 'Delete ' + x.name + '?', text: 'Brews already logged with it keep their record.', button: 'Delete', onYes: () => {
    W().custom = W().custom.filter(c => c !== x); if (W().lastId === x.id) W().lastId = null;
    save(); document.querySelectorAll('#modal-water-mix.open, #modal-water-plain.open').forEach(m => closeModal(m.id)); renderWaterView(); showToast('Deleted');
  } });
}

// ---- Tap / bottled water ----
let waterPlainId = null;
function openWaterPlain(id) {
  const x = id ? W().custom.find(c => c.id === id) : null;
  waterPlainId = x ? x.id : null;
  document.getElementById('wp-title').textContent = x ? x.name : 'Tap or bottled water';
  document.getElementById('wp-name').value = x ? x.name : '';
  document.getElementById('wp-gh').value = x && x.gh ? x.gh : '';
  document.getElementById('wp-kh').value = x && x.kh ? x.kh : '';
  document.getElementById('wp-delete').hidden = !x;
  openModal('modal-water-plain');
}
function saveWaterPlain() {
  const name = (document.getElementById('wp-name').value || '').replace(/[\u0000-\u001f<>`"]/g, '').trim().slice(0, 30);
  if (!name) { showToast('Give it a name'); return; }
  const n = id => { const v = parseFloat(document.getElementById(id).value); return isFinite(v) && v >= 0 && v <= 500 ? v : 0; };
  const w = W(), x = w.custom.find(c => c.id === waterPlainId);
  if (x) Object.assign(x, { name, gh: n('wp-gh'), kh: n('wp-kh') });
  else w.custom.push({ id: 'w-c' + Date.now().toString(36), name, type: 'plain', gh: n('wp-gh'), kh: n('wp-kh') });
  save(); closeModal('modal-water-plain'); renderWaterView(); showToast('Water saved');
}

function deleteWaterPlain() { deleteWaterMix(waterPlainId); }

// ---- Make new bottles ----
let bottleDraft = null;
function openWaterBottles() {
  const w = W();
  bottleDraft = { owned: [...w.salts], total: 100, balance: 'mg', buffer: 'even' };
  renderWaterBottles(); openModal('modal-water-bottles');
}
function renderWaterBottles() {
  const d = bottleDraft; if (!d) return;
  document.getElementById('wb-salts').innerHTML = SALT_ORDER.map(k => `<label class="salt-row"><input type="checkbox" ${d.owned.includes(k) ? 'checked' : ''} data-on-change="toggleSalt('${k}', this.checked)"><span><b>${formulaHtml(SALTS[k].f)}</b><span class="salt-n">${escHtml(SALTS[k].name)} · ${SALTS[k].role === 'gh' ? 'bottle A' : 'bottle B'}</span></span></label>`).join('');
  document.querySelectorAll('#wb-sizes .chip2').forEach(c => c.classList.toggle('on', Number(c.dataset.g) === d.total));
  const s = suggestBottles(d.owned, d);
  document.getElementById('wb-balance').hidden = !s.both.mgca;
  document.getElementById('wb-buffer').hidden = !s.both.nak;
  document.querySelectorAll('#wb-balance .chip2').forEach(c => c.classList.toggle('on', c.dataset.v === d.balance));
  document.querySelectorAll('#wb-buffer .chip2').forEach(c => c.classList.toggle('on', c.dataset.v === d.buffer));
  const dp = d.total < 50 ? 3 : 2;   // small batches are weighed on a 0.001 g scale
  const list = b => Object.entries(b.salts).map(([k, g]) => `<div class="wbr-line"><span>${formulaHtml(SALTS[k].f)}</span><b>${g.toFixed(dp)} g</b></div>`).join('') +
    `<div class="wbr-line wbr-fill"><span>Distilled water</span><b>to ${fmtNum(b.total)} g total</b></div>`;
  document.getElementById('wb-result').innerHTML =
    (s.A ? `<div class="wbr wb-a"><div class="wb-k">Bottle A · 30 GH per g/L</div>${list(s.A)}</div>` : '') +
    (s.B ? `<div class="wbr wb-b"><div class="wb-k">Bottle B · 15 KH per g/L</div>${list(s.B)}</div>` : '') +
    s.notes.map(n => `<div class="wb-note">${escHtml(n)}</div>`).join('') +
    `<div class="wb-note soft">${d.total < 50 ? 'Small batches need a 0.001 g scale. With a 0.01 g scale, make 100 g and split it between bottles.' : 'Weigh the salts, then add distilled water up to the total and shake until dissolved.'} Keep A and B in separate bottles: mixed as concentrates, calcium and magnesium would cloud out with the bicarbonate.</div>`;
  document.getElementById('wb-use').disabled = !(s.A && s.B);
}
function toggleSalt(k, on) { const d = bottleDraft; if (!d) return; d.owned = on ? [...new Set([...d.owned, k])] : d.owned.filter(x => x !== k); renderWaterBottles(); }
function setBottleOpt(key, v) { const d = bottleDraft; if (!d) return; d[key] = key === 'total' ? Number(v) : v; renderWaterBottles(); }
function useSuggestedBottles() {
  const d = bottleDraft; if (!d) return; const s = suggestBottles(d.owned, d); if (!s.A || !s.B) return;
  const w = W(); w.salts = [...d.owned];
  const r3 = o => { const salts = {}; Object.entries(o.salts).forEach(([k, g]) => salts[k] = Math.round(g * 1000) / 1000); return { total: o.total, salts }; };
  w.bottles = { A: r3(s.A), B: r3(s.B) };
  save(); closeModal('modal-water-bottles'); renderWaterView(); showToast('Bottles updated');
}

// ---- Calibrate ----
function openWaterCal() {
  const w = W();
  document.getElementById('wc-drops').value = ''; document.getElementById('wc-grams').value = '1.00';
  document.getElementById('wc-now').textContent = fmtNum(w.dropsPerGram);
  document.getElementById('wc-ta').value = '5'; document.getElementById('wc-tb').value = '5'; document.getElementById('wc-tml').value = '100'; document.getElementById('wc-tppm').value = '';
  waterCalPreview(); openModal('modal-water-cal');
}
function waterCalPreview() {
  const drops = parseFloat(document.getElementById('wc-drops').value), grams = parseFloat(document.getElementById('wc-grams').value);
  const out = document.getElementById('wc-out');
  if (drops > 0 && grams > 0) { const v = drops / grams; out.innerHTML = `= <b>${fmtNum(v)} drops per gram</b>${v < 10 || v > 40 ? ' · that looks unusual: most droppers give 15–30' : ''}`; }
  else out.textContent = '';
  // TDS check: drops of each in ml of water → expected reading
  const w = W(), a = parseFloat(document.getElementById('wc-ta').value) || 0, b = parseFloat(document.getElementById('wc-tb').value) || 0, ml = parseFloat(document.getElementById('wc-tml').value) || 0;
  const meas = parseFloat(document.getElementById('wc-tppm').value);
  const t = document.getElementById('wc-tout');
  if (ml > 0 && (a > 0 || b > 0)) {
    const A = bottleStrength(w.bottles.A), B = bottleStrength(w.bottles.B), dpg = drops > 0 && grams > 0 ? drops / grams : w.dropsPerGram;
    const gLA = a / dpg / (ml / 1000), gLB = b / dpg / (ml / 1000);
    const exp = Math.round((gLA * A.dry + gLB * B.dry) * TDS_METER);
    let msg = `Expected about <b>${exp} ppm</b> (GH ${fmtNum(gLA * A.gh)}, KH ${fmtNum(gLB * B.kh)}).`;
    if (meas > 0) { const off = (meas - exp) / exp; msg += Math.abs(off) <= 0.1 ? ' Your reading is within 10%: your bottles and drop count look right.' : ` Your reading is ${Math.round(Math.abs(off) * 100)}% ${off > 0 ? 'higher' : 'lower'}. Check your drop count first (bigger drops read ${off > 0 ? 'higher' : 'lower'}), then the bottle recipe.`; }
    t.innerHTML = msg;
  } else t.textContent = '';
}
function saveWaterCal() {
  const drops = parseFloat(document.getElementById('wc-drops').value), grams = parseFloat(document.getElementById('wc-grams').value);
  if (!(drops > 0 && grams > 0)) { showToast('Enter the drops and the weight'); return; }
  const v = Math.round(drops / grams * 10) / 10;
  if (v < 5 || v > 60) { showToast('That doesn’t look right: count again'); return; }
  W().dropsPerGram = v; save(); closeModal('modal-water-cal'); renderWaterView(); showToast(`Set to ${fmtNum(v)} drops per gram`);
}

// ==================== LOG BREW ====================
let selectedWaterId = null, brewWaterSnapshot = null, waterPickedByHand = false;   // snapshot: a brew's water that's no longer in the list (edit/repeat)
function defaultWaterFor(coffeeId) {
  const last = state.recipes.filter(r => r.coffeeId === coffeeId && r.water).sort((a, b) => tsOf(b) - tsOf(a))[0];
  if (last && waterById(last.water.id)) return last.water.id;
  if (W().lastId && waterById(W().lastId)) return W().lastId;
  return 'w-balanced';
}
function renderWaterPicker() {
  const grp = document.getElementById('r-water-group'); if (!grp) return;
  grp.hidden = !waterOn(); if (!waterOn()) return;
  const el = document.getElementById('water-selector');
  const ml = Math.round(parseFloat(document.getElementById('r-yield')?.value)) || 250;
  const isEsp = isEspressoMethod(state.selectedMethod || 'Espresso');
  const vol = isEsp ? 1000 : ml;
  const items = allWaters();
  if (brewWaterSnapshot && !waterById(brewWaterSnapshot.id)) items.push({ ...brewWaterSnapshot, gone: true });
  items.push({ id: 'w-none', name: 'Not recorded', type: 'none' });
  if (!selectedWaterId) selectedWaterId = defaultWaterFor(state.selectedCoffeeId);
  el.innerHTML = items.map(x => `<div class="coffee-selector-item${x.id === selectedWaterId ? ' selected' : ''}" data-on-click="pickWater('${x.id}')"><div class="cs-name">${escHtml(x.name)}</div><div class="cs-sub">${x.type === 'none' ? 'Leave water off this brew' : escHtml(waterSummary(x, vol))}${x.gone ? ' · no longer in your list' : ''}</div></div>`).join('');
  compactSelector(el);
}
// Tapping the current choice just opens/closes the list (compactSelector does that); tapping another one picks it
function pickWater(id) { if (id === selectedWaterId) return; selectedWaterId = id; waterPickedByHand = true; renderWaterPicker(); }
function brewWaterValue() {
  if (!waterOn() || !selectedWaterId || selectedWaterId === 'w-none') return null;
  const x = waterById(selectedWaterId) || (brewWaterSnapshot && brewWaterSnapshot.id === selectedWaterId ? brewWaterSnapshot : null);
  return x ? cleanBrewWater(x) : null;
}
// ---- Reminder after brewing: drops to add to the cup ----
// The coffee in the cup: espresso yield; for filter, the water less what the grounds hold back (about 2 g per g of coffee)
function cupVolumeMl() {
  const v = id => parseFloat(document.getElementById(id)?.value);
  const water = v('r-yield'), dose = v('r-dose');
  if (!(water > 0)) return null;
  if (isEspressoMethod(state.selectedMethod || 'Espresso')) return Math.round(water);
  return Math.round(Math.max(water * 0.5, dose > 0 ? water - 2 * dose : water));
}
// The panel can be tapped to switch to another water after brewing; the brew is then saved with it
let dropsOrigId = null, dropsOpen = false;
const currentBrewWater = () => selectedWaterId && selectedWaterId !== 'w-none' ? (waterById(selectedWaterId) || (brewWaterSnapshot && brewWaterSnapshot.id === selectedWaterId ? brewWaterSnapshot : null)) : null;
function dropsReminderHtml() {
  if (!waterOn() || W().addTo === 'water') return '';
  const x = currentBrewWater();
  if (dropsOrigId === null) dropsOrigId = x ? x.id : '';
  const orig = dropsOrigId ? waterById(dropsOrigId) || (brewWaterSnapshot && brewWaterSnapshot.id === dropsOrigId ? brewWaterSnapshot : null) : null;
  if (!x || (x.type === 'plain' && !(orig && orig.type !== 'plain'))) return '';    // chose tap water before brewing: nothing to add
  const ml = cupVolumeMl(), vol = ml || 250;
  const isEsp = isEspressoMethod(state.selectedMethod || 'Espresso');
  const dropsOf = w => { const m = mixFor(w, vol); return [fmtDrops(m.dA), fmtDrops(m.dB)]; };
  const [a, b] = x.type === 'plain' ? [] : dropsOf(x);
  const where = ml ? `for about ${ml} ml in the cup${isEsp ? '' : ' (your water less what the grounds hold)'}` : 'per 250 ml: enter your water amount for an exact count';
  const opt = w => `<button type="button" class="dn-opt${w.id === x.id ? ' on' : ''}" aria-pressed="${w.id === x.id}" data-on-click="event.stopPropagation();pickDropsWater('${w.id}')"><b>${escHtml(w.name)}</b><span>${w.type === 'plain' ? 'No drops' : dropsOf(w).join(' + ') + ' drops'}</span></button>`;
  const all = allWaters();
  const groups = [['Your styles', all.filter(w => w.builtin && !w.ref)], ['Reference waters', all.filter(w => w.ref)], ['Yours', all.filter(w => !w.builtin)]].filter(g => g[1].length);
  const list = dropsOpen ? `<div class="dn-list">${groups.map(([t, ws]) => `<div class="dn-g">${t}</div><div class="dn-opts">${ws.map(opt).join('')}</div>`).join('')}</div>` : '';
  const changed = orig && orig.id !== x.id ? `<div class="dn-was">Changed from ${escHtml(orig.name)}: this brew will be saved with ${escHtml(x.name)}</div>` : '';
  return `<div class="drops-note" role="note"><div class="dn-head" role="button" tabindex="0" aria-expanded="${dropsOpen}" data-on-click="toggleDropsList()">
      <div class="dn-top"><div class="dn-k">💧 ${x.type === 'plain' ? 'No drops needed' : 'Add to your cup now'}</div><span class="dn-change">${dropsOpen ? 'Done ▴' : 'Change ▾'}</span></div>
      ${x.type === 'plain' ? `<div class="dn-s" style="margin-top:6px">${escHtml(x.name)}: nothing to add</div>` : `<div class="dn-v"><span class="dn-a"><b>${a}</b> drops of A</span><span class="dn-b"><b>${b}</b> drops of B</span></div>
      <div class="dn-s">${escHtml(x.name)} · ${where}</div>`}${changed}</div>${list}</div>`;
}
function toggleDropsList() { dropsOpen = !dropsOpen; renderDropsReminder(); }
function pickDropsWater(id) {
  if (!waterById(id)) return;
  selectedWaterId = id; waterPickedByHand = true; dropsOpen = false;   // saved with the brew, and it becomes "last used"
  renderDropsReminder(); try { renderWaterPicker(); } catch(e) {}
}
function renderDropsReminder() {
  const show = !isScoreOnly() && !document.getElementById('r-edit-id')?.value;
  ['r-drops-note', 'bd-drops-note'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = show ? dropsReminderHtml() : ''; });
}

// After a brew is saved with a water, that becomes the default next time
function noteWaterUsed(w) { if (w && waterById(w.id)) { W().lastId = w.id; } }
function waterBadgeHtml(r) {
  if (!r.water) return '';
  return `<span class="water-badge" title="Water: ${escHtml(r.water.name)}${r.water.gh != null ? ' · GH ' + fmtNum(r.water.gh) : ''}${r.water.kh != null ? ' · KH ' + fmtNum(r.water.kh) : ''}">💧 ${escHtml(r.water.name)}</span>`;
}

// ==================== INSIGHTS ====================
function renderWaterInsights() {
  const el = document.getElementById('water-insights'); if (!el) return;
  if (!waterOn() || !state.recipes.some(r => r.water)) { el.innerHTML = ''; return; }
  const cSel = document.getElementById('wi-coffee')?.value || '', mSel = document.getElementById('wi-method')?.value || '';
  const brews = state.recipes.filter(r => r.water && r.rating > 0 && (!cSel || r.coffeeId === cSel) && (!mSel || r.method === mSel));
  const by = {};
  brews.forEach(r => { const k = r.water.id; (by[k] = by[k] || { name: r.water.name, plain: r.water.type === 'plain', n: 0, sum: 0, good: 0 }); by[k].n++; by[k].sum += r.rating; if (r.extraction === 'good') by[k].good++; });
  const rows = Object.values(by).map(x => ({ ...x, avg: x.sum / x.n })).sort((a, b) => b.avg - a.avg || b.n - a.n);
  const shown = rows.filter(x => x.n >= 2);
  const coffeesWithWater = state.coffees.filter(c => state.recipes.some(r => r.coffeeId === c.id && r.water));
  const methods = [...new Set(state.recipes.filter(r => r.water).map(r => r.method))];
  let body;
  if (!shown.length) body = `<div class="wi-empty">Log a few rated brews with different waters to compare them here (2 or more per water).</div>`;
  else {
    body = shown.map(x => `<div class="wi-row"><span class="wi-n">${escHtml(x.name)}</span><div class="wi-tr"><i style="width:${Math.round(x.avg * 10)}%"${x.plain ? ' class="plain"' : ''}></i></div><span class="wi-s">${x.avg.toFixed(1)} · ${x.n}</span></div>`).join('');
    if (shown.length > 1) { const a = shown[0], b = shown[1]; body += `<div class="wi-take"><b>${escHtml(a.name)}</b> rates highest${cSel || mSel ? ' here' : ''} so far (+${(a.avg - b.avg).toFixed(1)} over ${escHtml(b.name)}). ${a.good ? `${a.good} of ${a.n} of its brews came out "Good".` : ''}</div>`; }
    body += `<div class="wi-key">average rating · number of rated brews</div>`;
  }
  el.innerHTML = `<div class="divider">Water</div><div class="wi-card">
    <div class="wi-filters"><select class="form-select" id="wi-coffee" data-on-change="renderWaterInsights()" aria-label="Coffee"><option value="">All coffees</option>${coffeesWithWater.map(c => `<option value="${c.id}"${c.id === cSel ? ' selected' : ''}>${escHtml(c.name)}</option>`).join('')}</select>
    <select class="form-select" id="wi-method" data-on-change="renderWaterInsights()" aria-label="Method"><option value="">All methods</option>${methods.map(m => `<option${m === mSel ? ' selected' : ''}>${escHtml(m)}</option>`).join('')}</select></div>
    ${body}</div>`;
}
