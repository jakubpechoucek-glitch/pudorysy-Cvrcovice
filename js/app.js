// Půdorysy Cvrčovice – interaktivní vrstvy nad půdorysy.
// Data vrstev jsou v data/*.json, souřadnice hotspotů v pixelech obrázků img/*.png.

const SVG_NS = 'http://www.w3.org/2000/svg';
const STAV = {
  ok: 'OK',
  overit: 'K ověření',
  resit: 'K dořešení',
  akutni: 'Akutní',
};
const PAD = 14; // zvětšení klikací plochy kolem hotspotu (px obrázku)

const state = {
  items: [],            // všechny prvky všech vrstev
  layers: new Set(['dvere']),
  statuses: new Set(Object.keys(STAV)),
  floor: 'all',
  pinned: null,
};

const tip = document.getElementById('tip');
const plans = document.getElementById('plans');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

init();

async function init() {
  const res = await fetch('data/dvere.json');
  const data = await res.json();
  state.items = data.dvere.map(d => ({ ...d, layer: 'dvere' }));

  renderHotspots();
  renderTable();
  document.getElementById('meta').textContent =
    `Stav k ${formatDate(data.aktualizovano)}. Zdroj: ${data.zdroj}.`;

  bindControls();
  applyFilters();
  if (new URLSearchParams(location.search).has('edit')) enableEditor();
}

// ---------- vykreslení ----------

function renderHotspots() {
  for (const fig of document.querySelectorAll('.plan')) {
    const svg = fig.querySelector('svg');
    for (const it of state.items.filter(i => i.podlazi === fig.dataset.floor)) {
      const { x, y, w, h } = it.hotspot;
      const g = el('g', { class: 'hs', 'data-id': it.id, 'data-stav': it.stav, 'data-layer': it.layer, tabindex: 0, role: 'button', 'aria-label': `${it.id}: ${it.mezi.join(' – ')}` });
      g.append(
        el('rect', { class: 'hit', x: x - PAD, y: y - PAD, width: w + 2 * PAD, height: h + 2 * PAD }),
        el('rect', { class: 'mark', x, y, width: w, height: h }),
      );
      const label = el('text', { x: x + w / 2, y: y - 12, 'text-anchor': 'middle' });
      label.textContent = it.id;
      g.append(label);

      g.addEventListener('mouseenter', e => { if (finePointer && !state.pinned) showTip(it, e); });
      g.addEventListener('mousemove', e => { if (finePointer && !state.pinned) positionTip(e.clientX, e.clientY); });
      g.addEventListener('mouseleave', () => { if (!state.pinned) hideTip(); });
      g.addEventListener('click', e => { e.stopPropagation(); togglePin(it, e); });
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePin(it, null, g); } });
      svg.append(g);
    }
  }
}

function renderTable() {
  const tbody = document.querySelector('#table tbody');
  tbody.innerHTML = '';
  for (const it of state.items) {
    const tr = document.createElement('tr');
    tr.dataset.id = it.id;
    tr.innerHTML = `
      <td>${esc(it.id)}</td>
      <td>${esc(it.mezi.join(' ↔ '))}</td>
      <td>${esc(it.typ)}</td>
      <td>${esc(it.rozmer)}</td>
      <td><span class="badge ${it.stav}">${STAV[it.stav]}</span></td>`;
    tr.addEventListener('click', () => focusItem(it));
    tbody.append(tr);
  }
}

// ---------- tooltip ----------

function tipHtml(it) {
  const povrch = Object.entries(it.povrch)
    .map(([room, p]) => `<dt>Povrch ${esc(room.split(' ')[0])}</dt><dd>${esc(p)}</dd>`).join('');
  return `
    <button class="close" aria-label="Zavřít">×</button>
    <h3>${esc(it.id)} <span class="badge ${it.stav}">${STAV[it.stav]}</span></h3>
    <p class="rooms">${esc(it.mezi.join(' ↔ '))}</p>
    <dl>
      <dt>Typ</dt><dd>${esc(it.typ)}</dd>
      <dt>Rozměr</dt><dd>${esc(it.rozmer)}</dd>
      <dt>Stav. otvor</dt><dd>${esc(it.otvor)}</dd>
      <dt>Zárubeň</dt><dd>${esc(it.zarubne)}</dd>
      ${povrch}
      <dt>Dodavatel</dt><dd>${esc(it.dodavatel)}</dd>
    </dl>
    ${it.poznamka ? `<p class="note">${esc(it.poznamka)}</p>` : ''}`;
}

function showTip(it, e, anchorEl) {
  tip.innerHTML = tipHtml(it);
  tip.hidden = false;
  tip.querySelector('.close').addEventListener('click', unpin);
  setActive(it.id);
  if (e && e.clientX) positionTip(e.clientX, e.clientY);
  else {
    const r = (anchorEl || hotspotEl(it.id)).getBoundingClientRect();
    positionTip(r.right, r.top + r.height / 2);
  }
}

function positionTip(cx, cy) {
  const m = 16, r = tip.getBoundingClientRect();
  let x = cx + m, y = cy + m;
  if (x + r.width > innerWidth - m) x = cx - r.width - m;
  if (y + r.height > innerHeight - m) y = innerHeight - r.height - m;
  tip.style.left = Math.max(m, x) + 'px';
  tip.style.top = Math.max(m, y) + 'px';
}

function hideTip() {
  tip.hidden = true;
  tip.classList.remove('pinned');
  setActive(null);
}

function togglePin(it, e, anchorEl) {
  if (state.pinned === it.id) return unpin();
  state.pinned = it.id;
  showTip(it, e, anchorEl);
  tip.classList.add('pinned');
}

function unpin() {
  state.pinned = null;
  hideTip();
}

function setActive(id) {
  document.querySelectorAll('.hs.active').forEach(g => g.classList.remove('active'));
  if (id) hotspotEl(id)?.classList.add('active');
}

function focusItem(it) {
  // zajistí, že je prvek viditelný (podlaží, vrstva, stav)
  if (state.floor !== 'all' && state.floor !== it.podlazi) {
    document.querySelector(`input[name="floor"][value="${it.podlazi}"]`).click();
  }
  const statusBox = document.querySelector(`input[data-status="${it.stav}"]`);
  if (!statusBox.checked) statusBox.click();
  const g = hotspotEl(it.id);
  g.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => { state.pinned = null; togglePin(it, null, g); }, 450);
}

// ---------- filtry ----------

function bindControls() {
  document.querySelectorAll('input[data-layer]').forEach(cb => cb.addEventListener('change', () => {
    cb.checked ? state.layers.add(cb.dataset.layer) : state.layers.delete(cb.dataset.layer);
    applyFilters();
  }));
  document.querySelectorAll('input[data-status]').forEach(cb => cb.addEventListener('change', () => {
    cb.checked ? state.statuses.add(cb.dataset.status) : state.statuses.delete(cb.dataset.status);
    applyFilters();
  }));
  document.querySelectorAll('input[name="floor"]').forEach(r => r.addEventListener('change', () => {
    state.floor = r.value;
    applyFilters();
  }));
  document.addEventListener('click', e => { if (state.pinned && !tip.contains(e.target)) unpin(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') unpin(); });
  addEventListener('scroll', () => { if (!state.pinned) hideTip(); }, { passive: true });
}

function applyFilters() {
  unpin();
  for (const fig of document.querySelectorAll('.plan')) {
    fig.hidden = state.floor !== 'all' && state.floor !== fig.dataset.floor;
  }
  plans.classList.toggle('single', state.floor !== 'all');

  let visible = 0;
  for (const it of state.items) {
    const show = state.layers.has(it.layer) && state.statuses.has(it.stav) &&
      (state.floor === 'all' || state.floor === it.podlazi);
    hotspotEl(it.id).style.display = show ? '' : 'none';
    document.querySelector(`#table tr[data-id="${it.id}"]`).hidden = !show;
    if (show) visible++;
  }
  document.getElementById('count').textContent = `(${visible} z ${state.items.length})`;
}

// ---------- editor souřadnic (?edit) ----------
// Kliknutí do půdorysu vypíše souřadnice v pixelech obrázku – slouží k zakreslování nových hotspotů.

function enableEditor() {
  plans.classList.add('labels');
  for (const svg of document.querySelectorAll('.plan svg')) {
    svg.addEventListener('click', e => {
      const p = svg.createSVGPoint();
      p.x = e.clientX; p.y = e.clientY;
      const { x, y } = p.matrixTransform(svg.getScreenCTM().inverse());
      const msg = `${svg.closest('.plan').dataset.floor}: x=${Math.round(x)}, y=${Math.round(y)}`;
      console.log(msg);
      document.getElementById('meta').textContent = msg;
    });
  }
}

// ---------- pomocné ----------

function el(tag, attrs) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}
function hotspotEl(id) { return document.querySelector(`.hs[data-id="${CSS.escape(id)}"]`); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function formatDate(iso) { const [y, m, d] = iso.split('-'); return `${+d}. ${+m}. ${y}`; }
