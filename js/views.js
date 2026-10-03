// dialed — Overview, Coffee Library, brew cards, Insights, grinders and compare
// Plain scripts sharing one global scope, loaded in order: data, core, coffee, views, tools, app.

// ==================== DASHBOARD ====================

function showAllBrews() {
  showView('tracker');
  setTimeout(() => document.querySelector('#view-tracker .divider:nth-of-type(2)')?.scrollIntoView({behavior:'smooth'}), 50);
}

function renderDashboard() {
  document.getElementById('stat-coffees').textContent = state.coffees.length;
  document.getElementById('stat-recipes').textContent = state.recipes.length;
  const good = state.recipes.filter(r=>r.extraction==='good').length;
  document.getElementById('stat-good').textContent = state.recipes.length ? Math.round(good/state.recipes.length*100)+'%' : '—';
  // Show favourite grinder chip on dashboard
  const favG = state.favouriteGrinderId ? GRINDERS.find(g=>g.id===state.favouriteGrinderId) : null;
  const favEl = document.getElementById('dashboard-fav-grinder');
  if (favEl) favEl.innerHTML = favG
    ? `<div style="display:flex;align-items:center;gap:8px;background:rgba(82,121,111,0.1);border:1px solid rgba(82,121,111,0.3);border-radius:10px;padding:10px 14px;margin-bottom:20px;cursor:pointer;color:var(--text)" data-on-click="showView('grinders')">
        <span style="line-height:0;color:var(--crema)"><svg class="ico" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z"/></svg></span>
        <div><div style="font-family:var(--font-display);font-size:14px">${favG.brand} ${favG.model}</div><div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);letter-spacing:1px;margin-top:2px">${favG.type==='manual'?'Manual':'Electric'} · DEFAULT GRINDER</div></div>
      </div>`
    : `<div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);margin-bottom:16px;letter-spacing:.5px">No default grinder set — <span style="color:var(--crema);cursor:pointer" data-on-click="showView('grinders')">Browse grinders →</span></div>`;
  try { renderScorePending(); } catch(e) {}
  const el = document.getElementById('recent-brews');
  const recent = state.recipes.slice(0,5);
  const hasMore = state.recipes.length > 5;
  const divEl = el.previousElementSibling;
  if (divEl && divEl.classList.contains('divider')) {
    divEl.innerHTML = `<span>Recent brews</span>${hasMore?`<button data-on-click="showAllBrews()" style="background:none;border:none;font-family:var(--font-mono);font-size:11px;color:var(--crema);cursor:pointer;letter-spacing:1px;text-transform:uppercase;margin-left:8px">View all (${state.recipes.length}) →</button>`:''}`;
  }

  renderStatsDashboard();
  renderUpNext();
  renderBackupReminder();
  el.innerHTML = recent.length ? recent.map(r=>recipeCard(r,false)).join('') : `<div class="empty-state"><div class="empty-icon"><svg class="ico" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3c4 0 6 4 6 9s-2 9-6 9-6-4-6-9 2-9 6-9z"/><path d="M12 3c-2 4 2 6 0 9s2 5 0 9"/></svg></div><div class="empty-title">Nothing brewed yet</div><div class="empty-desc">Tap + to log your first coffee.</div></div>`;
}

// ==================== COFFEES ====================
// Library order: most recently brewed first; never-brewed coffees next (newest added first); finished bags last
function libraryOrder() {
  const last = {};
  state.recipes.forEach(r => { const t = r.createdAt ? Date.parse(r.createdAt) : 0; if (t && (!last[r.coffeeId] || t > last[r.coffeeId])) last[r.coffeeId] = t; });
  const added = c => c.createdAt ? Date.parse(c.createdAt) : 0;
  return state.coffees.map((c, i) => ({ c, i })).sort((a, b) =>
    (!!a.c.finishedBag - !!b.c.finishedBag) ||
    ((last[b.c.id] || 0) - (last[a.c.id] || 0)) ||
    (added(b.c) - added(a.c)) || (a.i - b.i)
  ).map(x => x.c);
}
// Grid tile (photo banner): label photo across the top, badges on the photo, then name, roaster, origin summary, brews
function coffeeTileGrid(c, rc) {
  const initial = (c.name || '?').trim().charAt(0).toUpperCase();
  const banner = c.labelPhoto
    ? `<img class="tile-photo" src="${photoUrl(c)}" alt="">`
    : `<div class="tile-photo tile-photo-empty" aria-hidden="true"><span>${escHtml(initial)}</span></div>`;
  const summary = [c.country, c.process, c.roastLevel].filter(Boolean).map(escHtml).join(' · ');
  return `<div class="coffee-card tile-b${c.finishedBag ? ' finished' : ''}" data-on-click="showCoffeeDetail('${c.id}')">
    <div class="tile-banner">${banner}
      ${c.finishedBag ? '<span class="tile-badge tile-fin">FINISHED</span>' : ''}
      ${c.decaf ? '<span class="tile-badge tile-decaf">DECAF</span>' : ''}
      ${c.rating > 0 ? `<span class="tile-badge tile-rating"><b>${c.rating}</b>/10</span>` : ''}
      <button class="card-more tile-more" aria-label="More options for ${escHtml(c.name)}" data-on-click="event.stopPropagation();showEditOverlay('coffee-${c.id}')">⋯</button>
    </div>
    <div class="tile-body">
      <div class="tile-name">${escHtml(c.name)}</div>
      <div class="tile-roaster">${escHtml(c.roaster || 'Unknown roaster')}</div>
      <div class="tile-summary">${summary || '—'}</div>
      <div class="tile-brews">${rc} brew${rc !== 1 ? 's' : ''}</div>
    </div>
  </div>`;
}
function setCoffeeLayout(v) {
  appSettings.coffeeLayout = v; saveSettings(); renderCoffeesView();
}
function renderCoffeesView() {
  const el = document.getElementById('coffees-list');
  if (!el) return;
  const layout = appSettings.coffeeLayout === 'grid' ? 'grid' : 'list';
  el.classList.toggle('grid', layout === 'grid' && state.coffees.length > 0);
  document.querySelectorAll('.layout-toggle button').forEach(b => { const on = b.dataset.layout === layout; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); });
  if (!state.coffees.length) { el.innerHTML=`<div class="empty-state"><div class="empty-icon"><svg class="ico" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg></div><div class="empty-title">No coffees yet</div><div class="empty-desc">Tap + to add your first coffee.</div></div>`; return; }
  el.innerHTML = libraryOrder().map(c => {
    const rc = state.recipes.filter(r=>r.coffeeId===c.id).length;
    const maslPill = (c.masl ? `<span class="meta-pill">${c.masl}m</span>` : '') + (per100g(c)!=null ? `<span class="meta-pill">£${per100g(c).toFixed(2)}/100g</span>` : '') + (gramsLeft(c)!=null && !c.finishedBag ? `<span class="meta-pill">${Math.round(gramsLeft(c))}g left</span>` : '') + (roastAgeToday(c)!=null && !c.finishedBag ? `<span class="meta-pill">${roastAgeToday(c)}d off roast</span>` : ''); const isGrid = appSettings.coffeeLayout === 'grid';
    // Grid: several varietals collapse to the first one plus a count, e.g. "Castillo +2"
    let varietal = c.varietal, varietalTitle = '';
    if (isGrid && varietal) { const parts = String(varietal).split(/\s*(?:,|\/|&|\+|;|\band\b)\s*/i).filter(Boolean); if (parts.length > 1) { varietalTitle = varietal; varietal = parts[0] + ' +' + (parts.length - 1); } }
    const corePills = [c.country,c.process,c.roastLevel,varietal].filter(Boolean).map(p=>`<span class="meta-pill"${p===varietal&&varietalTitle?` title="${escHtml(varietalTitle)}"`:''}>${escHtml(p)}</span>`);
    const extraCount = (maslPill.match(/class="meta-pill"/g) || []).length;
    // Grid tiles: country, process, roast and varietal first; anything else becomes "+N"
    const pills = appSettings.coffeeLayout === 'grid'
      ? corePills.join('') + (extraCount ? `<span class="meta-pill meta-more" title="${extraCount} more on the coffee's page">+${extraCount}</span>` : '')
      : corePills.join('') + maslPill;
    const headerImg = c.labelPhoto ? `<img src="${photoUrl(c)}" style="width:52px;height:52px;border-radius:8px;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,0.15);cursor:zoom-in" alt="Bag label" data-on-click="event.stopPropagation();openLightboxFor('${c.id}')">` : '';
    const cardRating = c.rating > 0 ? `<div class="coffee-card-rating">${c.rating}/10</div>` : '';
    const finishedStyle = '';
    const wrapOpen = `<div class="card-wrap" data-on-touchstart="startLongPress('${c.id}','coffee')" data-on-touchend="endLongPress()" data-on-touchcancel="endLongPress()" data-on-contextmenu="event.stopPropagation();showEditOverlay('coffee-${c.id}');return false"><div class="card-edit-overlay" data-overlay="coffee-${c.id}"><button class="edit-overlay-btn" data-on-click="event.stopPropagation();openEditCoffee('${c.id}');hideEditOverlay('coffee-${c.id}')"><svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg> Edit</button><button class="edit-overlay-btn" data-on-click="event.stopPropagation();showTrendModal('${c.id}');hideEditOverlay('coffee-${c.id}')"><svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg> Trends</button><button class="edit-overlay-btn" data-on-click="event.stopPropagation();hideEditOverlay('coffee-${c.id}');toggleFinishedBag('${c.id}')">${c.finishedBag ? '↺ Reopen' : '✓ Finish'}</button><button class="edit-overlay-btn" data-on-click="event.stopPropagation();confirmDeleteCoffee('${c.id}')">✕ Delete</button><button class="edit-overlay-btn" data-on-click="event.stopPropagation();hideEditOverlay('coffee-${c.id}')">Cancel</button></div>`;
    if (isGrid) return wrapOpen + coffeeTileGrid(c, rc) + `</div>`;
    return wrapOpen + `<div class="coffee-card${c.finishedBag ? ' finished' : ''}" data-on-click="showCoffeeDetail('${c.id}')" style="${finishedStyle}"><div class="coffee-card-header"><div><div class="coffee-card-name">${escHtml(c.name)}${c.finishedBag?'<span class="finished-badge">FINISHED</span>':''}</div><div class="coffee-card-roaster">${escHtml(c.roaster||'Unknown Roaster')}</div>${cardRating}</div><div style="display:flex;align-items:flex-start;gap:8px">${headerImg}<button class="card-more" aria-label="More options" data-on-click="event.stopPropagation();showEditOverlay('coffee-${c.id}')">⋯</button></div></div><div class="coffee-card-body">${pills?`<div class="coffee-meta">${pills}</div>`:''}  <div class="card-foot"><div class="recipe-count">${rc} brew${rc!==1?'s':''} logged</div>${c.decaf ? '<span class="decaf-label">Decaf</span>' : ''}</div></div></div>` + `</div>`;
  }).join('');
}

// Finishing a bag asks for final ratings; reopening is immediate
function toggleFinishedBag(id) {
  const coffee = state.coffees.find(x=>x.id===id);
  if (!coffee) return;
  if (!coffee.finishedBag) { openFinishBag(id); return; }
  coffee.finishedBag = false;
  save();
  showToast('Bag marked as active');
  refreshAfterFinish(id);
}
function finishSummaryHtml(c) {
  const parts = [];
  if (c.finishedAt) parts.push('Finished <b>' + new Date(c.finishedAt).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}) + '</b>');
  if (c.rating) parts.push('Final rating <b>' + c.rating + '/10</b>');
  if (c.buyAgain) parts.push('Buy again: <b>' + ({yes:'Yes', maybe:'Maybe', no:'No'}[c.buyAgain] || c.buyAgain) + '</b>');
  const note = c.finalNote ? `<div>“${escHtml(c.finalNote)}”</div>` : '';
  return parts.length || note ? `<div class="finish-line">${parts.join(' · ')}${note}</div>` : '';
}
function refreshAfterFinish(id) {
  renderDashboard();
  if (typeof detailShownId !== 'undefined' && detailShownId === id) showCoffeeDetail(id);
  else renderCoffeesView();
}
const RATING_WORDS = ['', 'Poor', 'Weak', 'Below average', 'OK', 'Decent', 'Good', 'Very good', 'Great', 'Excellent', 'Outstanding'];
let finishDraft = null;
function openFinishBag(id) {
  hideAllOverlays();
  const c = state.coffees.find(x=>x.id===id); if (!c) return;
  const brews = state.recipes.filter(r => r.coffeeId === id);
  const best = brews.filter(r => r.rating > 0).sort((a,b) => b.rating - a.rating)[0];
  const good = brews.filter(r => r.extraction === 'good').length;
  finishDraft = { id, rating: c.rating || 0, again: c.buyAgain || '' };
  document.getElementById('finish-subtitle').textContent = c.name + (c.roaster ? ' · ' + c.roaster : '');
  document.getElementById('finish-summary').innerHTML = brews.length
    ? `<strong>${brews.length}</strong> brew${brews.length!==1?'s':''} logged · <strong>${good}</strong> dialled in${best ? ` · best brew <strong>${best.rating}/10</strong>` : ''}`
    : 'No brews logged for this bag';
  document.getElementById('finish-rating').innerHTML = Array.from({length:10}, (_, i) => `<button type="button" data-v="${i+1}" aria-label="${i+1} out of 10" data-on-click="setFinishRating(${i+1})">${i+1}</button>`).join('');
  document.getElementById('finish-note').value = c.finalNote || '';
  setFinishRating(finishDraft.rating); setFinishAgain(finishDraft.again);
  openModal('modal-finish');
}
function setFinishRating(n) {
  if (!finishDraft) return; finishDraft.rating = n;
  document.querySelectorAll('#finish-rating button').forEach(b => { const on = +b.dataset.v <= n; b.classList.toggle('on', on); b.setAttribute('aria-pressed', +b.dataset.v === n); });
  document.getElementById('finish-rating-label').textContent = n ? `${n}/10 — ${RATING_WORDS[n]}` : 'Tap to rate the coffee overall';
}
function setFinishAgain(v) {
  if (!finishDraft) return; finishDraft.again = finishDraft.again === v ? '' : v;
  document.querySelectorAll('#finish-again .plan-chip').forEach(b => { const on = b.dataset.v === finishDraft.again; b.classList.toggle('selected', on); b.setAttribute('aria-pressed', on); });
}
function saveFinishBag() {
  const d = finishDraft; if (!d) return;
  if (!tapOnce('saveFinish')) return;
  const c = state.coffees.find(x=>x.id===d.id); if (!c) return;
  c.finishedBag = true;
  c.finishedAt = new Date().toISOString();
  if (d.rating) c.rating = d.rating;
  c.buyAgain = d.again || '';
  c.finalNote = document.getElementById('finish-note').value.trim();
  if (state.selectedCoffeeId === c.id) state.selectedCoffeeId = null;
  save(); closeModal('modal-finish'); finishDraft = null;
  showToast('Bag finished ✓');
  refreshAfterFinish(c.id);
}

function goBackToCoffees() {
  restoreCoffeeList();
  playEnter(document.getElementById('view-coffees'), 'slide-in-left');
  history.pushState({view:'coffees'}, '', '');
}
function restoreCoffeeList() {
  detailShownId = null;
  document.getElementById('view-coffees').innerHTML = `
    <div style="height:20px"></div>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
      <div class="section-title">Coffee Library</div>
      <button class="btn-secondary" data-on-click="resetCoffeeModal();openModal('modal-coffee')" style="margin-top:4px">+ Add Coffee</button>
    </div>
    <div class="lib-sub-row"><div class="section-subtitle" style="margin:0">Your beans &amp; roasters</div>
      <div class="layout-toggle" role="group" aria-label="Library layout">
        <button type="button" data-layout="list" aria-label="Full-width tiles" data-on-click="setCoffeeLayout('list')"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><rect x="2" y="2.5" width="12" height="4.5" rx="1.2"/><rect x="2" y="9" width="12" height="4.5" rx="1.2"/></svg></button>
        <button type="button" data-layout="grid" aria-label="Two per row" data-on-click="setCoffeeLayout('grid')"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><rect x="2" y="2.5" width="5" height="4.5" rx="1.2"/><rect x="9" y="2.5" width="5" height="4.5" rx="1.2"/><rect x="2" y="9" width="5" height="4.5" rx="1.2"/><rect x="9" y="9" width="5" height="4.5" rx="1.2"/></svg></button>
      </div></div>
    <div id="coffees-list"></div>`;
  renderCoffeesView();
}

function showCoffeeDetail(id) {
  const c = state.coffees.find(x=>x.id===id); if(!c) return;
  const locationStr = [c.roasterCity,c.roasterCountry].filter(Boolean).join(', ');
  const producerStr = [c.producer?'Producer: '+c.producer:'', c.farm?'Farm: '+c.farm:''].filter(Boolean).join(' · ');
  const recs = state.recipes.filter(r=>r.coffeeId===id);
  const maslPill2 = (c.masl ? `<span class="meta-pill"><svg class="ico" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 19l6-11 4 7 2-3 6 7H3z"/></svg> ${c.masl} masl</span>` : '') + (priceLabel(c) ? `<span class="meta-pill">${priceLabel(c)}</span>` : ''); const pills = [c.country,c.region,c.varietal,c.process,c.roastLevel].filter(Boolean).map(p=>`<span class="meta-pill">${escHtml(p)}</span>`).join('') + maslPill2;
  document.getElementById('view-coffees').innerHTML = `
    <div style="height:20px"></div>
    <button class="detail-back" data-on-click="goBackToCoffees()">← Back</button>
    <div class="detail-hero">
      <div style="display:flex;gap:14px;align-items:flex-start">
        ${c.labelPhoto?`<img src="${photoUrl(c)}" alt="Bag label" data-on-click="openLightboxFor('${c.id}')" style="width:72px;height:90px;object-fit:cover;border-radius:10px;flex-shrink:0;border:1px solid rgba(255,255,255,0.15);cursor:zoom-in" alt="bag label">`:''}
        <div style="flex:1">
          <div style="font-family:var(--font-display);font-size:24px;color:var(--crema-light)">${escHtml(c.name)}</div>
          <div style="font-family:var(--font-mono);font-size:11px;color:rgba(245,237,227,.75);letter-spacing:1px;margin-bottom:14px">${c.roaster ? `<span class="roaster-link" data-roaster="${escHtml(c.roaster)}" data-on-click="showRoasterFrom(this)">${escHtml(c.roaster)} ›</span>` : 'Unknown Roaster'}</div>
          <div class="coffee-meta">${pills||'<span style="opacity:.5;font-size:12px">No details added</span>'}</div>
          ${c.roastDate?`<div style="font-family:var(--font-mono);font-size:11px;color:rgba(245,237,227,.7);margin-top:10px">${formatDate(c.roastDate)}</div>`:''}
          ${c.rating>0?`<div class="detail-rating">Rating <b>${c.rating}/10</b></div>`:''}
          ${locationStr?`<div style="font-family:var(--font-mono);font-size:11px;color:rgba(245,237,227,.6);margin-top:8px"><svg class="ico" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10z"/><circle cx="12" cy="11" r="2"/></svg> ${escHtml(locationStr)}</div>`:''}
          ${producerStr?`<div style="font-family:var(--font-mono);font-size:11px;color:rgba(245,237,227,.6);margin-top:4px">${escHtml(producerStr)}</div>`:''}
          ${c.notes?`<div style="font-size:13px;color:rgba(245,237,227,.9);margin-top:12px;font-style:italic">"${escHtml(c.notes)}"</div>`:''}
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:20px">
      <button class="btn-secondary" style="flex:1" data-on-click="openEditCoffee('${c.id}')"><svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg> Edit</button>
      <button class="btn-secondary" style="flex:1" data-on-click="showTrendModal('${c.id}')"><svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg> Trends</button>
      <button class="btn-secondary" style="flex:1" data-on-click="toggleFinishedBag('${c.id}')">${c.finishedBag?'↺ Reopen':'Finish bag'}</button>
    </div>
    ${c.finishedBag ? finishSummaryHtml(c) : ''}
    ${bagPanelHtml(c)}${bestBrewHtml(c)}
    <div class="section-title" style="margin-bottom:4px">Brew Log</div>
    <div class="section-subtitle">${recs.length} attempt${recs.length!==1?'s':''}</div>
    ${recs.length?pagedBrewCards(recs, 'coffee-'+c.id):`<div class="empty-state"><div class="empty-icon"><svg class="ico" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-3"/><path d="M9 3.5h6v3H9z"/><path d="M9 12h6M9 16h6"/></svg></div><div class="empty-title">No brews yet</div></div>`}
    <button type="button" class="btn-delete-coffee" data-on-click="confirmDeleteCoffee('${c.id}')">Delete coffee</button>
    <div style="height:80px"></div>`;
  renderTrendCharts(id);
  if (detailShownId !== id) { window.scrollTo(0, 0); playEnter(document.getElementById('view-coffees'), 'slide-in-right'); }
  detailShownId = id;
}

// ==================== RECIPES ====================
// Brew card pieces: recipe numbers bright with units dimmed; taste as one segmented bubble
function brewSpecHtml(r, ratio, cupCost, yieldUnit, yieldLabel) {
  const parts = [];
  if (r.yield) parts.push(`${escHtml(r.yield)}<span class="u">${yieldUnit} ${yieldLabel.toLowerCase()}</span>`);
  if (ratio) parts.push(ratio);
  if (r.temp) parts.push(`${escHtml(r.temp)}<span class="u">°C</span>`);
  if (cupCost != null) parts.push(`<span class="u">£</span>${cupCost.toFixed(2)}`);
  return parts.length ? `<div class="brew-spec">${parts.map((p, i) => `<span class="sp">${i ? '<span class="sep">|</span>' : ''}${p}</span>`).join('')}</div>` : '';
}
const TASTE_SHORT = { sweetness:'Sweet', acidity:'Acid', body:'Body', bitterness:'Bitter' };
function brewTasteHtml(t) {
  if (!t) return '';
  const cells = TASTE_KEYS.filter(([k]) => t[k] !== undefined && t[k] !== null)
    .map(([k, l]) => `<span class="ts-cell" title="${l} ${t[k]} of 5"><b>${t[k]}</b>${TASTE_SHORT[k]}</span>`);
  return cells.length ? `<span class="taste-seg" aria-label="Taste: ${TASTE_KEYS.filter(([k]) => t[k] != null).map(([k,l]) => l + ' ' + t[k]).join(', ')}">${cells.join('')}</span>` : '';
}
function recipeCard(r, showDel=false) {
  const coffee = state.coffees.find(c=>c.id===r.coffeeId);
  const grinder = r.grinderId ? GRINDERS.find(g=>g.id===r.grinderId) : null;
  const date = fmtDate(r.createdAt);
  const exTag = r.extraction ? `<span class="extraction-tag tag-${r.extraction}">${r.extraction==='good'?'✓ Good':r.extraction}</span>` : '';
  
  const isEsp = isEspressoMethod(r.method||'Espresso');
  const ratio = ratioStr(r); const dayOff = daysOffRoast(r, coffee); const cupCost = costPerCup(r, coffee);
  const yieldLabel = isEsp ? 'Yield' : 'Water';
  const yieldUnit = isEsp ? 'g' : 'ml';
  const grinderBadge = grinder ? `<span style="display:inline-block;margin-top:4px;font-family:var(--font-mono);font-size:11px;background:rgba(82,121,111,0.1);border:1px solid rgba(82,121,111,0.25);color:var(--crema);border-radius:20px;padding:2px 8px;letter-spacing:.5px">${grinder.brand} ${grinder.model}</span>` : '';
  const recipeObj = r.recipeId ? [...Object.values(RECIPES).flat(), ...(state.customRecipes||[])].find(x=>x.id===r.recipeId) : null;
  const recipeBadge = recipeObj ? `<span style="display:inline-block;margin-top:4px;margin-left:4px;font-family:var(--font-mono);font-size:11px;background:rgba(18,60,39,0.08);border:1px solid rgba(18,60,39,0.15);color:var(--espresso);border-radius:20px;padding:2px 8px;letter-spacing:.5px"><svg class="ico" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-3"/><path d="M9 3.5h6v3H9z"/><path d="M9 12h6M9 16h6"/></svg> ${escHtml(recipeObj.name.split('—')[0].trim())}</span>` : '';
  const thumbHtml = coffee?.labelPhoto ? `<img src="${photoUrl(coffee)}" class="brew-label-thumb" alt="Bag label" loading="lazy" data-on-click="openLightboxFor('${coffee.id}')" style="cursor:zoom-in">` : '';
  return `<div class="card-wrap" data-on-touchstart="startLongPress('${r.id}','brew')" data-on-touchend="endLongPress()" data-on-touchcancel="endLongPress()" data-on-contextmenu="event.stopPropagation();showEditOverlay('brew-${r.id}');return false"><div class="card-edit-overlay" data-overlay="brew-${r.id}"><button class="edit-overlay-btn" data-on-click="event.stopPropagation();editBrew('${r.id}');hideEditOverlay('brew-${r.id}')"><svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg> Edit</button><button class="edit-overlay-btn" data-on-click="event.stopPropagation();hideEditOverlay('brew-${r.id}');openPlanNext('${r.id}')">↻ Plan next</button><button class="edit-overlay-btn" data-on-click="event.stopPropagation();confirmDeleteBrew('${r.id}')">✕ Delete</button><button class="edit-overlay-btn" data-on-click="event.stopPropagation();hideEditOverlay('brew-${r.id}')">Cancel</button></div><div class="recipe-entry">
    <div class="recipe-entry-header">
      <div style="display:flex;gap:10px;align-items:flex-start;flex:1">
        ${thumbHtml}
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--font-display);font-size:14px">${escHtml(coffee?.name||'Unknown Coffee')}</div>
          <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${escHtml(coffee?.roaster||'')}${coffee?.roaster&&r.method?' · ':''}${escHtml(r.method||'')}</div>
          ${grinderBadge}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">${coffee?.decaf ? '<span class="decaf-label">Decaf</span>' : ''}${r.awaitingScore ? `<button type="button" class="unscored-label" data-on-click="event.stopPropagation();scoreBrew('${r.id}')">Unscored</button>` : ''}${exTag}<button class="card-more" aria-label="More options" data-on-click="event.stopPropagation();showEditOverlay('brew-${r.id}')">⋯</button></div>
    </div>
    <div class="recipe-params">
      <div class="param-block"><div class="param-value">${r.grind||'—'}</div><div class="param-label">Grind${brewMicrons(r)?' · <span class="unit">'+brewMicrons(r)+'µm</span>':''}</div></div>
      <div class="param-block"><div class="param-value">${r.dose?r.dose+'g':'—'}</div><div class="param-label">Dose</div></div>
      <div class="param-block"><div class="param-value">${formatBrewTime(r.time,r.method)}</div><div class="param-label">Time</div></div>
    </div>
    <div class="brew-date">${date}${dayOff!==null?' · Day '+dayOff:''}</div>
    ${brewSpecHtml(r, ratio, cupCost, yieldUnit, yieldLabel)}
    ${(r.taste || r.rating>0) ? `<div class="brew-taste-row">${brewTasteHtml(r.taste)}${r.rating>0 ? `<span class="brew-rating"><b>${r.rating}</b>/10</span>` : ''}</div>` : ''}
    ${r.notes?`<div class="brew-note">${escHtml(r.notes)}</div>`:''}
  </div></div>`;
}

function deleteRecipe(id) {
  state.recipes = state.recipes.filter(r=>r.id!==id);
  state.plannedBrews = (state.plannedBrews || []).map(p => p.basedOn === id ? { ...p, basedOn: null } : p);
  save(); showToast('Brew deleted'); rerenderCurrentView();
}


// ==================== TREND MODAL ====================
function showTrendModal(coffeeId) {
  const coffee = state.coffees.find(x=>x.id===coffeeId);
  if (!coffee) return;
  const titleEl = document.getElementById('trend-modal-title');
  const subEl = document.getElementById('trend-modal-sub');
  if (titleEl) titleEl.textContent = coffee.name;
  if (subEl) subEl.textContent = (coffee.roaster||'') + (coffee.roaster&&coffee.country?' · ':'') + (coffee.country||'');
  renderTrendCharts(coffeeId);
  openModal('modal-trends');
}

// ==================== STATS DASHBOARD ====================
let statsPeriod = 'year';

function setStatsPeriod(period, btn) {
  statsPeriod = period;
  document.querySelectorAll('#stats-period-bar .type-btn').forEach(b => b.classList.toggle('active', b.dataset.period === period));
  if (appSettings.statsPeriod !== period) { appSettings.statsPeriod = period; saveSettings(); }
  renderStatsDashboard();
}

function getPeriodCoffees() {
  const now = new Date();
  let from;
  if (statsPeriod === 'year')  from = new Date(now.getTime() - 365*24*60*60*1000);   // rolling 12 months, so January isn't empty
  else if (statsPeriod === '6m') from = new Date(now.getTime() - 183*24*60*60*1000);
  else if (statsPeriod === '3m') from = new Date(now.getTime() - 91*24*60*60*1000);
  else if (statsPeriod === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
  else from = new Date(0);

  // Coffees added in period
  // Coffees without a createdAt (added in early versions) use their first brew date; always counted in All Time
  const coffeeDate = cf => cf.createdAt || state.recipes.filter(r=>r.coffeeId===cf.id&&r.createdAt).map(r=>r.createdAt).sort()[0] || null;
  const coffees = state.coffees.filter(cf => statsPeriod==='all' || (coffeeDate(cf) && new Date(coffeeDate(cf)) >= from));
  // Brews in period
  const brews = state.recipes.filter(r => statsPeriod==='all' || (r.createdAt && new Date(r.createdAt) >= from));
  return { coffees, brews, from };
}

function topN(arr, key, n=Infinity) {   // all values, most common first; the bar groups the tail into Other
  // "Colombia", "colombia " and "COLOMBIA" count as one; the most common spelling is shown
  const groups = {};
  arr.forEach(item => {
    const val = item[key] == null ? '' : String(item[key]).trim();
    if (!val) return;
    const k = val.toLowerCase().replace(/\s+/g, ' ');
    const g = groups[k] || (groups[k] = { n: 0, spell: {} });
    g.n++; g.spell[val] = (g.spell[val] || 0) + 1;
  });
  return Object.values(groups).map(g => [Object.entries(g.spell).sort((a, b) => b[1] - a[1])[0][0], g.n]).sort((a,b)=>b[1]-a[1]).slice(0,n);
}

// Stacked bar colours (up to 8 segments)
// "Roastery" palette: terracotta, slate blue, ochre, plum, sky, rose, violet (+ neutral grey for Other).
// Checked for colour-blind separation; dark mode has its own steps for the dark surface.
const STACK_COLORS_LIGHT = ['#C95A37','#3D73B6','#DB9E2E','#92417A','#49ABD6','#D77787','#6F57AB'];
const STACK_COLORS_DARK  = ['#D66643','#4E85CA','#BF881E','#9F4685','#34A1C6','#C05B6B','#7358B3'];
const STACK_OTHER = { light:'#9AA09C', dark:'#7D857F' };
function stackColor(i, label) {
  const dark = document.body.classList.contains('dark-mode');
  if (label === 'Other' || /^Other /.test(label)) return dark ? STACK_OTHER.dark : STACK_OTHER.light;
  const pal = dark ? STACK_COLORS_DARK : STACK_COLORS_LIGHT;
  return pal[i % pal.length];
}

function renderStackedBar(items, total, opts = {}) {
  if (!items.length) return '<div style="font-size:11px;color:var(--text-muted);padding:4px 0">No data</div>';
  // Up to 7 named segments; beyond that, the top 6 by name plus one grey "Other" for the rest
  const MAX_SEGMENTS = 7;
  const shown = items.length <= MAX_SEGMENTS ? items.slice() : items.slice(0, MAX_SEGMENTS - 1);
  const rest = items.slice(shown.length);
  const otherCount = rest.reduce((s,[,n]) => s+n, 0);
  if (otherCount > 0) shown.push(['Other', otherCount, rest.flatMap(r => r[2] && r[2].length ? r[2] : [[r[0], r[1]]])]);
  const grandTotal = shown.reduce((s,[,n]) => s+n, 0);
  // Colour follows the entry, not its rank in this period: use its all-time slot when it has one
  const PAL_SIZE = STACK_COLORS_LIGHT.length, rank = opts.colorRank || [];
  const slot = {}, used = new Set();
  shown.forEach(([label]) => { const r = rank.indexOf(label); if (r >= 0 && r < PAL_SIZE && !used.has(r)) { slot[label] = r; used.add(r); } });
  let free = 0;
  shown.forEach(([label]) => { if (slot[label] === undefined && label !== 'Other') { while (used.has(free)) free++; slot[label] = free % PAL_SIZE; used.add(free); } });
  const colorOf = (label, i) => stackColor(slot[label] !== undefined ? slot[label] : i, label);
  const segments = shown.map(([label, count], i) => {
    const pct = (count / grandTotal * 100).toFixed(1);
    return `<div title="${escHtml(label)}: ${count}" style="width:${pct}%;background:${colorOf(label, i)};height:100%;transition:width .4s"></div>`;
  }).join('');
  const unit = opts.unit || ['item', 'items'];
  const legend = shown.map(([label, count, members], i) => {
    const swatch = `<div style="width:10px;height:10px;border-radius:2px;background:${colorOf(label, i)};flex-shrink:0"></div>`;
    const hasMembers = Array.isArray(members) && members.length && !(members.length === 1 && members[0][0] === label);
    if (!hasMembers) return `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">${swatch}
      <span class="stack-legend-label" style="font-size:11px;flex:1">${escHtml(label)}</span>
      <span style="font-size:11px;color:var(--text-muted)">${count}</span>
    </div>`;
    const list = members.slice().sort((a,b)=>b[1]-a[1]).map(([m,n]) => `<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);padding:1px 0 1px 16px"><span>${escHtml(m)}</span><span>${n}</span></div>`).join('');
    return `
    <details class="stack-group" style="margin-bottom:3px">
      <summary style="display:flex;align-items:center;gap:6px;cursor:pointer;list-style:none">${swatch}
        <span class="stack-legend-label" style="font-size:11px;flex:1">${escHtml(label)} <span style="color:var(--text-muted)">· ${members.length} ${members.length === 1 ? unit[0] : unit[1]} ▾</span></span>
        <span style="font-size:11px;color:var(--text-muted)">${count}</span>
      </summary>
      <div style="margin:2px 0 6px">${list}</div>
    </details>`;
  }).join('');
  return `
    ${opts.note ? `<div style="font-size:11px;color:var(--text-muted);margin:-6px 0 8px">${opts.note}</div>` : ''}
    <div class="chart-sweep" style="height:12px;border-radius:5px;overflow:hidden;display:flex;gap:2px;margin-bottom:10px">${segments}</div>
    <div>${legend}</div>`;
}
function escHtml(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ---- Grouping for busy charts: kicks in automatically once a chart has more than 7 categories ----
const REGION_OF = (() => {
  const m = {}, add = (region, list) => list.split('|').forEach(c => m[c.trim().toLowerCase()] = region);
  add('Africa', "Ethiopia|Kenya|Rwanda|Burundi|Uganda|Tanzania|DRC|DR Congo|Congo|Democratic Republic of the Congo|Democratic Republic of Congo|Malawi|Zambia|Zimbabwe|Cameroon|Ivory Coast|Côte d'Ivoire|Cote d'Ivoire|Madagascar|South Sudan|Sudan|Mozambique|Angola|Ghana|Nigeria|Togo|Sierra Leone|Liberia|Guinea|Central African Republic|Gabon|South Africa|Morocco|Egypt|Tunisia|St Helena|Saint Helena|Reunion|Réunion");
  add('Middle East', "Yemen|Saudi Arabia|Oman|UAE|United Arab Emirates|Israel|Jordan|Lebanon|Turkey|Türkiye|Qatar|Kuwait|Bahrain|Iran|Iraq");
  add('Central America', "Mexico|Guatemala|Honduras|El Salvador|Nicaragua|Costa Rica|Panama|Belize");
  add('Caribbean', "Jamaica|Cuba|Dominican Republic|Haiti|Puerto Rico|Trinidad and Tobago|Barbados");
  add('South America', "Colombia|Brazil|Peru|Ecuador|Bolivia|Venezuela|Argentina|Chile|Paraguay|Uruguay|Guyana|Suriname");
  add('Asia', "India|Indonesia|Vietnam|Viet Nam|China|Yunnan|Thailand|Laos|Myanmar|Burma|Philippines|Nepal|Timor-Leste|East Timor|Timor|Taiwan|Japan|South Korea|Korea|Malaysia|Sri Lanka|Singapore|Hong Kong|Sumatra|Java|Sulawesi|Bali|Flores|Mongolia|Pakistan|Bangladesh|Cambodia");
  add('Oceania', "Papua New Guinea|PNG|Australia|New Zealand|Hawaii|Kona|Fiji|Vanuatu|Samoa|Tonga");
  add('North America', "USA|US|United States|United States of America|Canada");
  add('Europe', "UK|United Kingdom|England|Scotland|Wales|Northern Ireland|Ireland|France|Germany|Italy|Spain|Portugal|Netherlands|Belgium|Luxembourg|Denmark|Norway|Sweden|Finland|Iceland|Switzerland|Austria|Poland|Czechia|Czech Republic|Slovakia|Hungary|Greece|Romania|Bulgaria|Croatia|Slovenia|Serbia|Estonia|Latvia|Lithuania|Ukraine|Russia|Cyprus|Malta");
  return m;
})();
function processFamily(p) {
  const s = String(p).toLowerCase();
  if (/swiss water|mountain water|\bea\b|ethyl acetate|sugar ?cane|\bco2\b|decaf/.test(s)) return 'Decaf process';
  if (/anaerob|carbonic|thermal|co-?ferm|infus|lactic|yeast|koji|double ferm|extended ferm|macerat|experimental|cold ferm|fruit/.test(s)) return 'Experimental';
  if (/wet[- ]?hull|giling/.test(s)) return 'Wet-hulled';
  if (/honey|pulped natural|semi[- ]?washed|semi[- ]?dry/.test(s)) return 'Honey & pulped natural';
  if (/natural|dry|sun[- ]?dried/.test(s)) return 'Natural';
  if (/wash|wet/.test(s)) return 'Washed';
  return 'Other process';
}
function roastFamily(r) {
  const s = String(r).toLowerCase();
  if (/dark|espresso|french|italian/.test(s)) return 'Dark';
  if (/medium|omni|city/.test(s)) return 'Medium';
  if (/light|filter|nordic|cinnamon/.test(s)) return 'Light';
  return 'Other roast';
}
const GROUPERS = {
  country:        { by: v => REGION_OF[String(v).trim().toLowerCase()] || 'Other regions', note: n => `Grouped by region · ${n} countries` },
  roasterCountry: { by: v => REGION_OF[String(v).trim().toLowerCase()] || 'Other regions', note: n => `Grouped by region · ${n} countries` },
  process:        { by: processFamily, note: n => `Grouped by process family · ${n} processes` },
  roastLevel:     { by: roastFamily, note: n => `Grouped into light / medium / dark · ${n} roast levels` },
};
// items: [[label, count], ...] most common first. Returns chart items plus an optional note.
// All-time order of a category's values (or of its groups), used to give each entry a fixed colour
function colorRankFor(key, grouped) {
  const all = topN(state.coffees, key);
  if (!grouped || !GROUPERS[key]) return all.map(x => x[0]);
  const totals = {};
  all.forEach(([label, n]) => { const g = GROUPERS[key].by(label); totals[g] = (totals[g] || 0) + n; });
  return Object.entries(totals).sort((a, b) => b[1] - a[1]).map(x => x[0]);
}
const CHART_UNITS = { country:['country','countries'], roasterCountry:['country','countries'], process:['process','processes'], roastLevel:['roast level','roast levels'], roaster:['roaster','roasters'], varietal:['varietal','varietals'] };
function groupForChart(key, items) {
  const g = GROUPERS[key], unit = CHART_UNITS[key];
  if (!g || items.length <= 7) return { items, opts: { unit } };
  const groups = {};
  items.forEach(([label, n]) => { const k = g.by(label); (groups[k] = groups[k] || { n: 0, members: [] }); groups[k].n += n; groups[k].members.push([label, n]); });
  const isCatchAll = k => /^Other /.test(k);
  const grouped = Object.entries(groups).map(([k, v]) => [k, v.n, v.members]).sort((a, b) => (isCatchAll(a[0]) - isCatchAll(b[0])) || (b[1] - a[1]));
  if (grouped.length >= items.length) return { items, opts: { unit } };   // grouping wouldn't help
  return { items: grouped, opts: { note: g.note(items.length), unit } };
}

function renderBarChart(items, total, opts) { return renderStackedBar(items, total, opts); }

function renderStatsDashboard() {
  const el = document.getElementById('stats-dashboard');
  if (!el) return;
  const { coffees, brews } = getPeriodCoffees();

  if (!coffees.length && !brews.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px 0 16px">No data for this period.</div>';
    return;
  }

  // Key numbers
  const avgRating = coffees.filter(c=>c.rating>0).length
    ? (coffees.filter(c=>c.rating>0).reduce((s,c)=>s+c.rating,0)/coffees.filter(c=>c.rating>0).length).toFixed(1)
    : '—';
  const avgBrewRating = brews.filter(r=>r.rating>0).length
    ? (brews.filter(r=>r.rating>0).reduce((s,r)=>s+r.rating,0)/brews.filter(r=>r.rating>0).length).toFixed(1)
    : '—';
  const dialled = brews.filter(r=>r.extraction==='good').length;
  const dialledPct = brews.length ? Math.round(dialled/brews.length*100)+'%' : '—';

  // Top origins, processes, roasters
  const countries = topN(coffees, 'country');
  const processes = topN(coffees, 'process');
  const roasters = topN(coffees, 'roaster');
  const roasterCountries = topN(coffees, 'roasterCountry');

  el.innerHTML = `
    <div class="stats-grid">
      <div class="stats-card">
        <div class="stats-card-label">Coffees</div>
        <div class="stats-card-value">${coffees.length}</div>
        <div class="stats-card-sub">${coffees.filter(c=>c.finishedBag).length} finished</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-label">Brews</div>
        <div class="stats-card-value">${brews.length}</div>
        <div class="stats-card-sub">${dialledPct} dialled in</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-label">Avg Coffee Score</div>
        <div class="stats-card-value">${avgRating}</div>
        <div class="stats-card-sub">out of 10</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-label">Avg Brew Score</div>
        <div class="stats-card-value">${avgBrewRating}</div>
        <div class="stats-card-sub">out of 10</div>
      </div>
      ${(() => { const priced = coffees.filter(cf => per100g(cf) != null);
        if (!priced.length) return '';
        const avg = priced.reduce((s,cf) => s + per100g(cf), 0) / priced.length;
        const bought = coffees.filter(cf => cf.priceGBP > 0), spent = bought.reduce((s,cf) => s + cf.priceGBP, 0), approx = bought.some(cf => cf.fxApprox) ? '≈' : '';
        return `<div class="stats-card"><div class="stats-card-label">Avg Price</div><div class="stats-card-value">${approx}£${avg.toFixed(2)}</div><div class="stats-card-sub">per 100g</div></div>
                <div class="stats-card"><div class="stats-card-label">Spent</div><div class="stats-card-value">${approx}£${spent.toFixed(2)}</div><div class="stats-card-sub">on beans</div></div>`; })()}
    </div>

    ${(() => {
      const cats = appSettings.overviewCategories || ['country','process','roaster','roasterCountry'];
      const catMap = {
        country: { label:'Origin Country', data:countries },
        process: { label:'Process', data:processes },
        roaster: { label:'Roaster', data:roasters },
        roasterCountry: { label:'Roaster Country', data:roasterCountries },
        varietal: { label:'Varietal', data:topN(coffees,'varietal') },
        roastLevel: { label:'Roast Level', data:topN(coffees,'roastLevel') },
      };
      return cats.map(k => {
        const cat = catMap[k];
        if (!cat || !cat.data.length) return '';
        const gd = groupForChart(k, cat.data);
        gd.opts.colorRank = colorRankFor(k, !!gd.opts.note);
        return `<div style="margin-bottom:20px"><div class="divider" style="margin-top:0">${cat.label}</div><div class="stats-bar-chart">${renderBarChart(gd.items, coffees.length, gd.opts)}</div></div>`;
      }).join('');
    })()}
  `;
}



// ==================== BREW SUGGESTIONS ====================
function getBrewSuggestions(coffeeId) {
  const coffee = state.coffees.find(c=>c.id===coffeeId);
  if (!coffee) return null;

  // Find brews for coffees with matching attributes
  const allCoffees = state.coffees.filter(c => c.id !== coffeeId);
  const brews = state.recipes.filter(r => r.rating >= 7 && r.extraction === 'good');

  // Score each brew by similarity to target coffee
  const scored = brews.map(r => {
    const c2 = state.coffees.find(c=>c.id===r.coffeeId);
    if (!c2) return null;
    let score = 0;
    if (c2.process && c2.process === coffee.process) score += 3;
    if (c2.varietal && c2.varietal === coffee.varietal) score += 2;
    if (c2.country && c2.country === coffee.country) score += 2;
    if (c2.region && c2.region === coffee.region) score += 1;
    if (c2.roastLevel && c2.roastLevel === coffee.roastLevel) score += 1;
    return score > 0 ? { r, c2, score } : null;
  }).filter(Boolean).sort((a,b) => b.score - a.score);

  if (!scored.length) return null;

  // Group by method and average grind/temp for top matches
  const byMethod = {};
  scored.forEach(({ r, c2, score }) => {
    const m = r.method||'Espresso';
    if (!byMethod[m]) byMethod[m] = { grindVals:[], tempVals:[], count:0, maxScore:0, sources:[] };
    if (r.grind && !isNaN(parseFloat(r.grind))) byMethod[m].grindVals.push(parseFloat(r.grind));
    if (r.temp)  byMethod[m].tempVals.push(parseFloat(r.temp));
    byMethod[m].count++;
    byMethod[m].maxScore = Math.max(byMethod[m].maxScore, score);
    byMethod[m].sources.push({ coffee: c2.name, score });
  });

  return Object.entries(byMethod).sort((a,b) => b[1].maxScore - a[1].maxScore).map(([method, d]) => {
    const avgGrind = d.grindVals.length ? (d.grindVals.reduce((s,v)=>s+v,0)/d.grindVals.length).toFixed(1) : null;
    const avgTemp  = d.tempVals.length  ? Math.round(d.tempVals.reduce((s,v)=>s+v,0)/d.tempVals.length)   : null;
    const reasons = [];
    if (coffee.process) reasons.push('process: '+coffee.process);
    if (coffee.varietal) reasons.push('varietal: '+coffee.varietal);
    if (coffee.country) reasons.push('origin: '+coffee.country);
    return { method, avgGrind, avgTemp, count: d.count, reasons };
  });
}

function renderSuggestions(coffeeId) {
  const el = document.getElementById('brew-suggestions');
  if (!el) return;
  const suggestions = getBrewSuggestions(coffeeId);
  if (!suggestions || !suggestions.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px 0">No suggestions yet — log more brews across similar coffees to unlock recommendations.</div>';
    return;
  }
  el.innerHTML = suggestions.slice(0,3).map(s => `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:8px">
      <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px">${escHtml(s.method)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">
        ${s.avgGrind ? '<span class="meta-pill">Grind ~'+s.avgGrind+'</span>' : ''}
        ${s.avgTemp  ? '<span class="meta-pill">Temp ~'+s.avgTemp+'°C</span>'  : ''}
        <span class="meta-pill">Based on ${s.count} brew${s.count!==1?'s':''}</span>
      </div>
      <div style="font-size:11px;color:var(--text-muted)">Matched by ${escHtml(s.reasons.join(', '))}</div>
    </div>`).join('');
}

// ==================== BREW TRACKER ====================
let trackerSort = 'date';

function setTrackerSort(key, btn) {
  trackerSort = key;
  document.querySelectorAll('[id^="sort-btn-"]').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTracker();
}

function renderTracker() {
  renderStatsDashboard();
  const el = document.getElementById('tracker-list');
  const countEl = document.getElementById('tracker-count');
  if (!el) return;

  // Populate coffee filter
  const coffeeFilter = document.getElementById('tracker-filter-coffee');
  if (coffeeFilter) {
    const current = coffeeFilter.value;
    coffeeFilter.innerHTML = '<option value="">All Coffees</option>' +
      state.coffees.map(cf => `<option value="${cf.id}" ${cf.id===current?'selected':''}>${escHtml(cf.name)}${cf.roaster?' — '+escHtml(cf.roaster):''}</option>`).join('');
  }

  let brews = [...state.recipes];

  // Apply filters
  const coffeeId = document.getElementById('tracker-filter-coffee')?.value;
  const method = document.getElementById('tracker-filter-method')?.value;
  const extraction = document.getElementById('tracker-filter-extraction')?.value;
  if (coffeeId)    brews = brews.filter(r => r.coffeeId === coffeeId);
  if (method)      brews = brews.filter(r => r.method === method);
  if (extraction)  brews = brews.filter(r => r.extraction === extraction);

  // Apply sort
  if (trackerSort === 'date')   brews.sort((a,b) => tsOf(b) - tsOf(a));
  if (trackerSort === 'rating') brews.sort((a,b) => (b.rating||0) - (a.rating||0));
  if (trackerSort === 'coffee') brews.sort((a,b) => {
    const ca = state.coffees.find(c=>c.id===a.coffeeId)?.name||'';
    const cb = state.coffees.find(c=>c.id===b.coffeeId)?.name||'';
    return ca.localeCompare(cb);
  });
  if (trackerSort === 'method') brews.sort((a,b) => (a.method||'').localeCompare(b.method||''));

  if (countEl) countEl.textContent = `${brews.length} brew${brews.length!==1?'s':''} ${brews.length !== state.recipes.length ? '(filtered)' : ''}`;

  if (!brews.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg class="ico" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-3"/><path d="M9 3.5h6v3H9z"/><path d="M9 12h6M9 16h6"/></svg></div><div class="empty-title">No brews match</div><div class="empty-desc">Try adjusting your filters.</div></div>';
    return;
  }
  el.innerHTML = pagedBrewCards(brews, 'tracker');
}
// Long brew lists are drawn 30 at a time
const BREW_PAGE = 30, brewListShown = {};
function pagedBrewCards(brews, key) {
  const shown = Math.max(BREW_PAGE, brewListShown[key] || 0);
  const left = brews.length - shown;
  return brews.slice(0, shown).map(r => recipeCard(r, true)).join('')
    + (left > 0 ? `<button type="button" class="btn-secondary" style="width:100%;margin-top:6px" data-on-click="showMoreBrews('${key}')">Show ${Math.min(BREW_PAGE, left)} more (${left} left)</button>` : '');
}
function showMoreBrews(key) { brewListShown[key] = Math.max(BREW_PAGE, brewListShown[key] || 0) + BREW_PAGE; rerenderCurrentView(); }

// ==================== GRINDERS ====================
function renderGrinders() {
  const search = document.getElementById('grinder-search-input')?.value.toLowerCase()||'';
  const el = document.getElementById('grinders-list');
  const filtered = GRINDERS.filter(g => {
    const matchType = currentGrinderFilter==='all' || g.type===currentGrinderFilter;
    const matchSearch = !search || (g.brand+' '+g.model).toLowerCase().includes(search);
    return matchType && matchSearch;
  });
  if (!filtered.length) { el.innerHTML=`<div class="empty-state"><div class="empty-icon"><svg class="ico" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></div><div class="empty-title">No grinders found</div></div>`; return; }
  // Favourite grinder always first
  const favFirst = [...filtered].sort((a,b) => {
    if (a.id === state.favouriteGrinderId) return -1;
    if (b.id === state.favouriteGrinderId) return 1;
    return 0;
  });
  el.innerHTML = favFirst.map(g => {
    const inCmp = state.compareIds.includes(g.id);
    const isFav = state.favouriteGrinderId === g.id;
    return `<div class="grinder-card ${inCmp?'in-compare':''}" style="${isFav?'border-color:var(--crema);background:rgba(200,135,58,0.04);':''}" data-on-click="showGrinderDetail('${g.id}')">
      <div style="flex:1">
        <div class="grinder-brand">${g.brand}${isFav?' <span style="font-size:11px;color:var(--crema);font-family:var(--font-mono);letter-spacing:1px;text-transform:uppercase"><svg class="ico" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z"/></svg> Default</span>':''}</div>
        <div class="grinder-model">${g.model}</div>
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);margin-top:4px">${g.min}–${g.max}µm · ${grinderRangeLabel(g)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <span class="grinder-type-badge badge-${g.type}">${g.type==='manual'?'Manual':'Electric'}</span>
        <div style="display:flex;gap:2px">
          <button class="compare-toggle-btn" data-on-click="event.stopPropagation();toggleFavourite('${g.id}')" aria-label="${isFav?'Remove as default grinder':'Set as default grinder'}" aria-pressed="${isFav}" title="${isFav?'Remove favourite':'Set as favourite'}" style="line-height:0;color:var(--crema)">${isFav?`<svg class="ico" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z"/></svg>`:`<svg class="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z"/></svg>`}</button>
          <button class="compare-toggle-btn" data-on-click="event.stopPropagation();toggleCompare('${g.id}')" aria-label="${inCmp?'Remove from compare':'Add to compare'}" aria-pressed="${inCmp}" title="Add to compare" style="line-height:0">${inCmp?`<svg class="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>`:`<svg class="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>`}</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterGrinders(type, btn) {
  currentGrinderFilter = type;
  if (btn) { document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }
  renderGrinders();
}

function toggleCompare(gid) {
  if (state.compareIds.includes(gid)) {
    state.compareIds = state.compareIds.filter(id=>id!==gid);
  } else {
    if (state.compareIds.length>=5) { showToast('Max 5 grinders'); return; }
    state.compareIds.push(gid);
  }
  save(); updateCompareBar(); if(state.currentView==='grinders') renderGrinders();
}

function toggleFavourite(gid) {
  state.favouriteGrinderId = state.favouriteGrinderId === gid ? null : gid;
  // Also set as the recipe default
  if (state.favouriteGrinderId) state.selectedGrinderId = gid;
  save();
  if(state.currentView==='grinders') renderGrinders();
}

function showInlineCompare() {
  showView('grinders');
  const sec = document.getElementById('grinder-compare-section');
  if (!sec) return;
  sec.style.display = 'block';
  renderCompare('grinder-compare-inner');
  sec.scrollIntoView({behavior:'smooth'});
}

function updateCompareBar() {
  const n = state.compareIds.length;
  document.getElementById('compare-bar-text').textContent = `${n} grinder${n!==1?'s':''} — tap to compare`;
  document.getElementById('compare-bar').classList.toggle('visible', n>0);
  if(n===0 && document.getElementById('grinder-compare-section')) { document.getElementById('grinder-compare-section').style.display='none'; }
}

function showGrinderDetail(gid) {
  const g = GRINDERS.find(x=>x.id===gid); if(!g) return;
  const inCmp = state.compareIds.includes(gid);
  const isFav = state.favouriteGrinderId === gid;
  const pct = v => Math.max(0,Math.min(100,((v-CHART_MIN)/(CHART_MAX-CHART_MIN))*100));
  const covered = BREW_METHODS.filter(m=>g.min<=m.max && g.max>=m.min);

  // Build method compatibility chart
  const rowHeight = 16;
  const chartH = BREW_METHODS.length * (rowHeight+3) + 10;
  const methodRows = BREW_METHODS.map((m,i) => {
    const left=pct(m.min), width=pct(m.max)-left;
    const compat = g.min<=m.max && g.max>=m.min;
    return `<div style="position:absolute;top:${i*(rowHeight+3)}px;left:${left}%;width:${width}%;height:${rowHeight}px;background:${m.color};border-radius:3px;opacity:${compat?0.85:0.15};display:flex;align-items:center;padding:0 4px">
      <span style="font-family:var(--font-mono);font-size:11px;color:white;white-space:nowrap;overflow:hidden">${m.name}</span></div>`;
  }).join('');

  // Grinder range overlay
  const gLeft=pct(g.min), gWidth=pct(g.max)-gLeft;

  document.getElementById('grinder-detail-content').innerHTML = `
    <div class="grinder-detail-card">
      <div style="font-family:var(--font-display);font-size:22px;color:var(--crema-light)">${g.model}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <span style="font-family:var(--font-mono);font-size:11px;color:rgba(245,237,227,.5);letter-spacing:1px">${g.brand} · ${g.type==='manual'?'Manual':'Electric'}</span>
        ${isFav?'<span style="font-family:var(--font-mono);font-size:11px;background:rgba(200,135,58,0.25);color:var(--crema-light);border-radius:20px;padding:2px 8px;letter-spacing:1px"><svg class="ico" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z"/></svg> DEFAULT GRINDER</span>':''}
      </div>
      <div class="grinder-specs-grid">
        <div class="grinder-spec-block"><div class="grinder-spec-value">${g.clickMin!==undefined?g.clickMin+'–'+g.clickMax:g.settings}</div><div class="grinder-spec-label">${g.stepless?(g.clickMin!==undefined?'Dial · stepless':'Stepless'):(g.clickMin!==undefined?'Click Range':'Settings')}</div></div>
        ${!g.umPerClick && grinderScale(g) ? `<div class="grinder-spec-block"><div class="grinder-spec-value">~${Math.round(grinderScale(g).per)}</div><div class="grinder-spec-label"><span class="unit">µm</span> per ${g.stepless?'number':'click'}</div></div>` : ''}
        <div class="grinder-spec-block"><div class="grinder-spec-value" style="font-size:13px">${g.min}–${g.max}µm</div><div class="grinder-spec-label">Grind Range</div></div>
        ${g.umPerClick?`<div class="grinder-spec-block"><div class="grinder-spec-value">~${g.umPerClick}</div><div class="grinder-spec-label">µm/click</div></div>`:''}
      </div>
      ${g.notes?`<div style="font-size:13px;color:rgba(245,237,227,.65);margin-top:14px;line-height:1.5;font-style:italic">"${g.notes}"</div>`:''}
    </div>

    <div class="card" style="padding:14px 16px">
      <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">Setting → particle size</div>
      <input type="number" step="any" inputmode="decimal" class="form-input" id="conv-setting" placeholder="Enter a setting, e.g. ${micronsToSetting(g, 560) ?? ''}" data-on-input="updateGrinderConverter('${g.id}')">
      <div id="conv-out" class="brew-live" style="margin:8px 0 0"></div>
      ${methodSettingsGuide(g)}
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px">Approximate — based on published ranges; individual grinders vary.</div>
    </div>

    <div style="margin-bottom:6px;font-family:var(--font-display);font-size:16px">Compatible Brew Methods</div>
    <div style="display:flex;flex-wrap:wrap;margin-bottom:20px">
      ${covered.map(m=>`<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-family:var(--font-mono);font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:3px;background:${m.color}18;border:1px solid ${m.color}40;color:${m.color}">${m.name}</span>`).join('')}
      ${covered.length===0?'<span style="font-size:13px;color:var(--text-muted)">Highly specialised grinder</span>':''}
    </div>

    <div style="margin-bottom:8px;font-family:var(--font-display);font-size:16px">Grind Range vs Brew Methods</div>
    <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);margin-bottom:12px">Highlighted = compatible. Amber overlay = this grinder's range.</div>
    <div style="background:white;border-radius:var(--radius);padding:16px;border:1px solid var(--border);margin-bottom:20px">
      <div style="position:relative;height:${chartH}px;margin-bottom:8px">
        ${methodRows}
        <div style="position:absolute;top:0;bottom:0;left:${gLeft}%;width:${gWidth}%;background:rgba(200,135,58,0.22);border:2px solid var(--crema);border-radius:4px;z-index:10"></div>
      </div>
      <div class="grind-axis">
        <span class="grind-axis-label">0µm</span><span class="grind-axis-label">375</span>
        <span class="grind-axis-label">750</span><span class="grind-axis-label">1125</span><span class="grind-axis-label">1500µm</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:8px">
        <div style="width:16px;height:10px;background:rgba(200,135,58,0.22);border:1.5px solid var(--crema);border-radius:2px"></div>
        <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">This grinder's range</span>
      </div>
    </div>

    <button class="btn-primary" style="background:${isFav?'#8b1a1a':'var(--espresso)'}" data-on-click="toggleFavourite('${g.id}');showGrinderDetail('${g.id}');showToast('${isFav?'Removed as default':'Set as default grinder'}')">
      ${isFav?'✕ Remove as Default Grinder':'Set as Default Grinder'}
    </button>
    <div style="height:10px"></div>
    <button class="btn-primary" style="background:${inCmp?'#8b1a1a':'var(--crema)'};color:${inCmp?'white':'var(--espresso)'}" data-on-click="toggleCompare('${g.id}');renderGrinders();closeModal('modal-grinder-detail');showToast('${inCmp?'Removed from':'Added to'} compare')">
      ${inCmp?'✕ Remove from Compare':'⊕ Add to Compare'}
    </button>
    <div style="height:12px"></div>
    <button class="btn-secondary" style="width:100%" data-on-click="closeModal('modal-grinder-detail')">Close</button>
    <div style="height:20px"></div>`;
  openModal('modal-grinder-detail');
}

// ==================== COMPARE ====================
function renderCompare(containerId='view-compare') {
  const el = document.getElementById('compare-content');
  if (!state.compareIds.length) {
    el.innerHTML=`<div class="empty-state"><div class="empty-icon"><svg class="ico" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 4v16M7 20h10M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0L5 7zM19 7l-3 7a3 3 0 0 0 6 0l-3-7z"/></svg></div><div class="empty-title">No grinders selected</div><div class="empty-desc">Go to Grinders and tap ⊕ to add up to 5 grinders to compare.</div></div>`;
    return;
  }
  const grinders = state.compareIds.map(id=>GRINDERS.find(g=>g.id===id)).filter(Boolean);
  const pct = v => Math.max(0,Math.min(100,((v-CHART_MIN)/(CHART_MAX-CHART_MIN))*100));

  // Grinder range bars
  const rangeHTML = grinders.map((g,i)=>{
    const left=pct(g.min), width=pct(g.max)-left;
    const label = `${g.brand} ${g.model}`;
    return `<div class="grinder-bar-row">
      <div class="grinder-bar-name" style="color:${COMPARE_COLORS[i]}">${label}</div>
      <div class="grinder-bar-track">
        <div class="grinder-bar-fill" style="left:${left}%;width:${width}%;background:${COMPARE_COLORS[i]}">${g.min}–${g.max}µm</div>
      </div>
    </div>`;
  }).join('');

  // Brew method compatibility matrix
  const matrixHTML = BREW_METHODS.map(m=>{
    const dots = grinders.map((g,i)=>{
      const ok = g.min<=m.max && g.max>=m.min;
      return `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${ok?COMPARE_COLORS[i]:'rgba(0,0,0,0.07)'};border:1px solid ${ok?COMPARE_COLORS[i]:'rgba(0,0,0,0.1)'};margin-right:4px"></span>`;
    }).join('');
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-family:var(--font-mono);font-size:11px;letter-spacing:.5px">${m.name}</div>
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${m.min}–${m.max}µm</div>
      </div>
      <div style="display:flex;align-items:center">${dots}</div>
    </div>`;
  }).join('');

  // Specs cards
  const specsHTML = grinders.map((g,i)=>`
    <div style="padding:12px;border:1px solid ${COMPARE_COLORS[i]}30;border-left:3px solid ${COMPARE_COLORS[i]};border-radius:10px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>
          <div style="font-family:var(--font-display);font-size:15px">${g.model}</div>
          <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);letter-spacing:.5px">${g.brand}</div>
        </div>
        <span class="grinder-type-badge badge-${g.type}">${g.type==='manual'?'Manual':'Electric'}</span>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <div class="param-block" style="flex:1"><div class="param-value" style="font-size:16px">${g.settings}</div><div class="param-label">Settings</div></div>
        <div class="param-block" style="flex:2"><div class="param-value" style="font-size:12px">${g.min}–${g.max}µm</div><div class="param-label">Grind Range</div></div>
      </div>
      ${g.notes?`<div style="font-size:11px;color:var(--text-muted);font-style:italic;line-height:1.5">${g.notes}</div>`:''}
      <button style="margin-top:8px;background:none;border:1px solid rgba(139,26,26,0.2);color:var(--red);border-radius:8px;padding:4px 12px;font-family:var(--font-mono);font-size:11px;letter-spacing:1px;cursor:pointer" data-on-click="toggleCompare('${g.id}');renderCompare()">✕ Remove</button>
    </div>`).join('');

  el.innerHTML = `
    <div class="card" style="padding:16px 18px">
      <div class="divider" style="margin-top:4px">Grind Ranges</div>
      ${rangeHTML}
      <div class="grind-axis">
        <span class="grind-axis-label">0µm</span><span class="grind-axis-label">375</span>
        <span class="grind-axis-label">750</span><span class="grind-axis-label">1125</span><span class="grind-axis-label">1500µm</span>
      </div>
      <div style="margin-top:12px">
        ${grinders.map((g,i)=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="display:inline-block;width:12px;height:8px;border-radius:2px;background:${COMPARE_COLORS[i]}"></span><span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${g.brand} ${g.model}</span></div>`).join('')}
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:14px 16px 12px;background:var(--espresso)">
        <div style="font-family:var(--font-display);font-size:16px;color:var(--crema-light)">Brew Compatibility Matrix</div>
        <div style="font-family:var(--font-mono);font-size:11px;color:rgba(245,237,227,.4);letter-spacing:1px;margin-top:4px;text-transform:uppercase">Filled dot = grinder can reach this method</div>
      </div>
      <div style="background:white;padding:6px 0">
        <div style="display:flex;padding:8px 14px 6px">
          ${grinders.map((g,i)=>`<div style="display:flex;align-items:center;gap:4px;margin-right:12px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${COMPARE_COLORS[i]}"></span><span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${g.model}</span></div>`).join('')}
        </div>
        ${matrixHTML}
      </div>
    </div>

    <div class="card">
      <div class="divider" style="margin-top:4px">Specs</div>
      ${specsHTML}
    </div>

    <div style="text-align:center;padding-bottom:10px">
      <button class="btn-secondary" data-on-click="clearCompare()">Clear all</button>
    </div>`;
}
