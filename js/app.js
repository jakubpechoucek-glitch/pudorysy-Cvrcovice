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

// Konfigurace vrstev: odkud se berou data, jak vypadá detail a seznam.
const LAYERS = {
  dvere: {
    file: 'data/dvere.json',
    key: 'dvere',
    title: 'Seznam dveří',
    subtitle: it => it.mezi.join(' ↔ '),
    badge: it => `<span class="badge ${it.stav}">${STAV[it.stav]}</span>`,
    fields: it => [
      ['Typ', it.typ],
      ['Rozměr', it.rozmer],
      ['Stav. otvor', it.otvor],
      ['Zárubeň', it.zarubne],
      ...Object.entries(it.povrch).map(([room, p]) => [`Povrch ${room.split(' ')[0]}`, p]),
      ['Dodavatel', it.dodavatel],
    ],
    columns: [
      ['Pozice', it => it.id],
      ['Mezi místnostmi', it => it.mezi.join(' ↔ ')],
      ['Typ', it => it.typ],
      ['Rozměr', it => it.rozmer],
      ['Stav', it => ({ html: `<span class="badge ${it.stav}">${STAV[it.stav]}</span>` })],
    ],
  },
  okna: {
    file: 'data/okna.json',
    key: 'okna',
    title: 'Seznam oken a prosklených stěn',
    subtitle: it => it.mistnost,
    badge: it => `<span class="badge okno">${esc(it.profil)}</span>`,
    fields: it => [
      ['Typ', it.typ],
      ['Výrobní rozměr', it.rozmer],
      ['Parapet', it.parapet],
      ['Zasklení', it.zaskleni],
      ['Kování', it.kovani],
      ['Zábradlí', it.zabradli],
      ['Bezp. magnet', it.magnet == null ? null : it.magnet ? 'ano' : 'ne'],
      ['Rám', 'RAL 9005 mat (černá)'],
    ],
    columns: [
      ['Pozice', it => it.id],
      ['Místnost', it => it.mistnost],
      ['Typ', it => it.typ],
      ['Rozměr', it => it.rozmer],
      ['Parapet', it => it.parapet],
    ],
  },
};

const state = {
  items: [],            // všechny prvky všech vrstev
  layers: new Set(),
  statuses: new Set(Object.keys(STAV)),
  floor: 'all',
  pinned: null,
};

const tip = document.getElementById('tip');
const plans = document.getElementById('plans');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

init();

async function init() {
  const meta = [];
  for (const [name, cfg] of Object.entries(LAYERS)) {
    const data = await (await fetch(cfg.file)).json();
    state.items.push(...data[cfg.key].map(d => ({ ...d, layer: name })));
    meta.push(`${cfg.title.replace('Seznam ', '')}: stav k ${formatDate(data.aktualizovano)}, zdroj ${data.zdroj}.`);
  }
  document.querySelectorAll('input[data-layer]:checked').forEach(cb => state.layers.add(cb.dataset.layer));

  renderHotspots();
  renderTables();
  document.getElementById('meta').innerHTML = meta.map(esc).join('<br>');

  bindControls();
  applyFilters();
  if (new URLSearchParams(location.search).has('edit')) enableEditor();
}

// ---------- vykreslení ----------

function renderHotspots() {
  for (const fig of document.querySelectorAll('.plan')) {
    const svg = fig.querySelector('svg');
    // okna pod dveře, aby dveře zůstaly klikací tam, kde se překrývají
    const items = state.items.filter(i => i.podlazi === fig.dataset.floor)
      .sort((a, b) => (b.layer === 'okna') - (a.layer === 'okna'));
    for (const it of items) {
      const rects = [].concat(it.hotspot);
      const g = el('g', { class: 'hs', 'data-id': it.id, 'data-stav': it.stav || '', 'data-layer': it.layer, tabindex: 0, role: 'button', 'aria-label': `${it.id}: ${LAYERS[it.layer].subtitle(it)}` });
      for (const { x, y, w, h } of rects) {
        g.append(
          el('rect', { class: 'hit', x: x - PAD, y: y - PAD, width: w + 2 * PAD, height: h + 2 * PAD }),
          el('rect', { class: 'mark', x, y, width: w, height: h }),
        );
      }
      const { x, y, w } = rects[0];
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

function renderTables() {
  const host = document.getElementById('lists');
  host.innerHTML = '';
  for (const [name, cfg] of Object.entries(LAYERS)) {
    const sec = document.createElement('section');
    sec.className = 'list';
    sec.dataset.layer = name;
    sec.innerHTML = `
      <h2>${esc(cfg.title)} <span class="count"></span></h2>
      <div class="table-wrap"><table>
        <thead><tr>${cfg.columns.map(([h]) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody></tbody>
      </table></div>`;
    const tbody = sec.querySelector('tbody');
    for (const it of state.items.filter(i => i.layer === name)) {
      const tr = document.createElement('tr');
      tr.dataset.id = it.id;
      tr.innerHTML = cfg.columns.map(([, f]) => {
        const v = f(it);
        return `<td>${v && v.html ? v.html : esc(v)}</td>`;
      }).join('');
      tr.addEventListener('click', () => focusItem(it));
      tbody.append(tr);
    }
    host.append(sec);
  }
}

// ---------- tooltip ----------

function tipHtml(it) {
  const cfg = LAYERS[it.layer];
  const rows = cfg.fields(it).filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  return `
    <button class="close" aria-label="Zavřít">×</button>
    <h3>${esc(it.id)} ${cfg.badge(it)}</h3>
    <p class="rooms">${esc(cfg.subtitle(it))}</p>
    ${it.nahled ? `<img class="thumb" src="${esc(it.nahled)}" alt="Pohled na ${esc(it.id)} z exteriéru"><p class="thumb-cap">Pohled z exteriéru</p>` : ''}
    <dl>${rows}</dl>
    ${it.poznamka ? `<p class="note">${esc(it.poznamka)}</p>` : ''}`;
}

function showTip(it, e, anchorEl) {
  tip.innerHTML = tipHtml(it);
  tip.hidden = false;
  tip.querySelector('.close').addEventListener('click', unpin);
  setActive(it.id);
  const place = () => {
    if (e && e.clientX) positionTip(e.clientX, e.clientY);
    else {
      const r = (anchorEl || hotspotEl(it.id)).getBoundingClientRect();
      positionTip(r.right, r.top + r.height / 2);
    }
  };
  place();
  // po načtení náhledu se tooltip zvětší – přepočítat pozici
  tip.querySelector('img')?.addEventListener('load', place);
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
  if (it.stav) {
    const statusBox = document.querySelector(`input[data-status="${it.stav}"]`);
    if (!statusBox.checked) statusBox.click();
  }
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
  document.getElementById('status-filter').hidden = !state.layers.has('dvere');

  const counts = {};
  for (const it of state.items) {
    const show = state.layers.has(it.layer) &&
      (!it.stav || state.statuses.has(it.stav)) &&
      (state.floor === 'all' || state.floor === it.podlazi);
    hotspotEl(it.id).style.display = show ? '' : 'none';
    document.querySelector(`.list tr[data-id="${CSS.escape(it.id)}"]`).hidden = !show;
    counts[it.layer] ??= [0, 0];
    counts[it.layer][1]++;
    if (show) counts[it.layer][0]++;
  }
  for (const sec of document.querySelectorAll('.list')) {
    const [shown, total] = counts[sec.dataset.layer] || [0, 0];
    sec.hidden = !state.layers.has(sec.dataset.layer);
    sec.querySelector('.count').textContent = `(${shown} z ${total})`;
  }
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
