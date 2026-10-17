// Půdorysy Cvrčovice – interaktivní vrstvy nad půdorysy.
// Data vrstev jsou v data/*.json, souřadnice hotspotů v pixelech obrázků img/*.png.

const SVG_NS = 'http://www.w3.org/2000/svg';
const VERSION = '0.5.1'; // zvýšit při změně dat – obchází cache prohlížeče (stejné číslo v index.html)
const STAV = {
  ok: 'OK',
  overit: 'K ověření',
  resit: 'K dořešení',
  akutni: 'Akutní',
};
const PAD = 14; // zvětšení klikací plochy kolem hotspotu (px obrázku)
const STRANY = ['Sever', 'Východ', 'Jih', 'Západ']; // půdorysy mají sever nahoře
let MAT = {};       // materiály vrstvy povrchů (kód → název, barva, množství)
let ZARUKA = '';    // záruční podmínky nábytku Hanák
const CZK = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });
const STAV_NAB = { smlouva: 'Smlouva', nabidka: 'Nabídka' };

// Konfigurace vrstev: odkud se berou data, jak vypadá detail a seznam.
const LAYERS = {
  dvere: {
    file: 'data/dvere.json',
    key: 'dvere',
    title: 'Seznam dveří',
    statusFilter: true,    // na tuto vrstvu působí filtr „Stav dveří“
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
    title: 'Seznam oken, prosklených stěn a vrat',
    subtitle: it => it.mistnost,
    badge: it => `<span class="badge okno">${esc(it.profil)}</span>`,
    fields: it => [
      ['Typ', it.typ],
      ['Výrobní rozměr', it.rozmer],
      ['Parapet', it.parapet],
      ['Zasklení', it.zaskleni],
      ['Kování', it.kovani],
      ['Povrch', it.povrch],
      ['Zábradlí', it.zabradli],
      ['Pohon', it.pohon],
      ['Zabezpečení', it.zabezpeceni],
      ['Tepelný odpor', it.tepelny_odpor],
      ['Bezp. magnet', it.magnet == null ? null : it.magnet ? 'ano' : 'ne'],
      ['Rám', it.povrch ? null : 'RAL 9005 mat (černá)'],
      ['Dodavatel', it.dodavatel],
    ],
    columns: [
      ['Pozice', it => it.id],
      ['Místnost', it => it.mistnost],
      ['Typ', it => it.typ],
      ['Rozměr', it => it.rozmer],
      ['Parapet', it => it.parapet],
      ['Cena', it => ({ html: it.celkem ? `<span class="num">${CZK.format(it.celkem)}</span>` : '' })],
    ],
  },
  povrchy: {
    file: 'data/povrchy.json',
    key: 'povrchy',
    title: 'Povrchy místností',
    padding: 0,
    below: true,           // místnosti pod dveřmi a okny
    label: false,
    onLoad: data => { MAT = data.materialy; },
    color: it => MAT[it.podlaha.kod].barva,
    subtitle: it => it.nazev,
    badge: it => `<span class="badge plocha">${fmtNum(it.plocha)} m²</span>`,
    render: roomHtml,
    columns: [
      ['Místnost', it => `${it.id} ${it.nazev}`],
      ['Plocha', it => `${fmtNum(it.plocha)} m²`],
      ['Podlaha', it => ({ html: matChip(it.podlaha.kod, true) })],
      ['Stěny', it => ({ html: uniq(it.steny.map(s => s.kod)).map(k => matChip(k)).join(' ') })],
      ['Strop', it => ({ html: uniq(it.strop.map(s => s.kod)).map(k => matChip(k)).join(' ') })],
    ],
    extra: materialsTable,
  },
  nabytek: {
    file: 'data/nabytek.json',
    key: 'nabytek',
    title: 'Nábytek a kuchyně (Hanák)',
    label: false,
    onLoad: data => { ZARUKA = data.zaruka; },
    subtitle: it => `${it.mistnost} – ${it.nazev}`,
    render: furnitureHtml,
    columns: [
      ['Místnost', it => it.mistnost],
      ['Sestava', it => it.nazev],
      ['Provedení', it => it.cela],
      ['Cena s DPH', it => ({ html: `<span class="num">${CZK.format(it.celkem)}</span>` })],
      ['Stav', it => ({ html: `<span class="badge nab-${it.stav}">${STAV_NAB[it.stav]}</span>` })],
    ],
    extra: furnitureSummary,
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
const lightbox = document.getElementById('lightbox');
const plans = document.getElementById('plans');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

init();

async function init() {
  const meta = [];
  for (const [name, cfg] of Object.entries(LAYERS)) {
    const data = await (await fetch(`${cfg.file}?v=${VERSION}`)).json();
    cfg.onLoad?.(data);
    state.items.push(...data[cfg.key].map(d => ({ ...d, layer: name })));
    meta.push(`${cfg.title.replace('Seznam ', '')}: stav k ${formatDate(data.aktualizovano)}, zdroj ${data.zdroj}.`);
  }
  document.querySelectorAll('input[data-layer]:checked').forEach(cb => state.layers.add(cb.dataset.layer));

  renderHotspots();
  renderTables();
  renderLegend();
  document.getElementById('meta').innerHTML = meta.map(esc).join('<br>');

  bindControls();
  applyFilters();
  if (new URLSearchParams(location.search).has('edit')) enableEditor();
}

// ---------- vykreslení ----------

function renderHotspots() {
  for (const fig of document.querySelectorAll('.plan')) {
    const svg = fig.querySelector('svg');
    // pořadí vykreslení: místnosti dospod, pak okna, navrch dveře (zůstanou klikací tam, kde se překrývají)
    const order = it => LAYERS[it.layer].below ? 0 : it.layer === 'okna' ? 1 : 2;
    const items = state.items.filter(i => i.podlazi === fig.dataset.floor).sort((a, b) => order(a) - order(b));
    for (const it of items) {
      const cfg = LAYERS[it.layer];
      const pad = cfg.padding ?? PAD;
      const rects = [].concat(it.hotspot);
      const g = el('g', { class: 'hs', 'data-id': it.id, 'data-stav': cfg.statusFilter ? it.stav : '', 'data-layer': it.layer, tabindex: 0, role: 'button', 'aria-label': `${it.id}: ${cfg.subtitle(it)}` });
      if (cfg.color) g.style.setProperty('--c', cfg.color(it));
      for (const { x, y, w, h } of rects) {
        if (pad) g.append(el('rect', { class: 'hit', x: x - pad, y: y - pad, width: w + 2 * pad, height: h + 2 * pad }));
        g.append(el('rect', { class: 'mark', x, y, width: w, height: h }));
      }
      if (cfg.label !== false) {
        const { x, y, w } = rects[0];
        const label = el('text', { x: x + w / 2, y: y - 12, 'text-anchor': 'middle' });
        label.textContent = it.id;
        g.append(label);
      }

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
    cfg.extra?.(sec);
    host.append(sec);
  }
}

// ---------- tooltip ----------

function tipHtml(it) {
  const cfg = LAYERS[it.layer];
  if (cfg.render) return `<button class="close" aria-label="Zavřít">×</button>${cfg.render(it)}`;
  const rows = cfg.fields(it).filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  return `
    <button class="close" aria-label="Zavřít">×</button>
    <h3>${esc(it.id)} ${cfg.badge(it)}</h3>
    <p class="rooms">${esc(cfg.subtitle(it))}</p>
    ${it.nahled ? `<a href="${esc(it.nahled)}" target="_blank" rel="noopener" class="zoom"><img class="thumb" src="${esc(it.nahled)}" alt="Pohled na ${esc(it.id)} z exteriéru"></a><p class="thumb-cap">Pohled z exteriéru</p>` : ''}
    <dl>${rows}</dl>
    ${it.polozky ? itemsTable(it, `Položky (${it.cena_pozn})`, `Celkem ${it.cena_pozn.split(' (')[0]}`) : ''}
    ${it.poznamka ? `<p class="note">${esc(it.poznamka)}</p>` : ''}
    ${it.nabidka ? `<p class="src">Nabídka ${esc(it.nabidka)}</p>` : ''}`;
}

function itemsTable(it, heading, totalLabel, extraRows = '') {
  const items = it.polozky.map(p => `<tr><td>${esc(p.popis)}</td><td class="num">${CZK.format(p.cena)}</td></tr>`).join('');
  return `
    <h4>${esc(heading)}</h4>
    <table class="items"><tbody>${items}</tbody>
      <tfoot><tr><td>${esc(totalLabel)}</td><td class="num">${CZK.format(it.celkem)}</td></tr>${extraRows}</tfoot>
    </table>`;
}

function showTip(it, e, anchorEl) {
  tip.innerHTML = tipHtml(it);
  tip.classList.toggle('wide', !!it.polozky);
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
  if (LAYERS[it.layer].statusFilter) {
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
  document.addEventListener('click', e => { if (state.pinned && !tip.contains(e.target) && !lightbox.contains(e.target)) unpin(); });
  document.addEventListener('keydown', e => {
    if (!lightbox.hidden) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
      return;
    }
    if (e.key === 'Escape') unpin();
  });
  bindLightbox();
  addEventListener('scroll', () => { if (!state.pinned) hideTip(); }, { passive: true });
}

function applyFilters() {
  unpin();
  for (const fig of document.querySelectorAll('.plan')) {
    fig.hidden = state.floor !== 'all' && state.floor !== fig.dataset.floor;
  }
  plans.classList.toggle('single', state.floor !== 'all');
  document.getElementById('status-filter').hidden = !state.layers.has('dvere');
  document.getElementById('floor-legend').hidden = !state.layers.has('povrchy');
  updateFurnitureSum();

  const counts = {};
  for (const it of state.items) {
    const show = state.layers.has(it.layer) &&
      (!LAYERS[it.layer].statusFilter || state.statuses.has(it.stav)) &&
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

// ---------- vrstva povrchů ----------

function roomHtml(it) {
  const head = `
    <h3>${esc(it.id)} ${esc(it.nazev)} <span class="badge plocha">${fmtNum(it.plocha)} m²</span></h3>
    <p class="rooms">Podlaha, stěny a strop</p>`;
  const group = (title, list, withSide) => list.length ? `
    <h4>${title}</h4>
    <ul class="surf">${list.map(e => `
      <li>${matChip(e.kod)}
        <div><strong>${esc(withSide ? `${e.orientace}${e.typ !== 'Stěna' ? ' – ' + e.typ.toLowerCase() : ''}` : (e.cast ? `Strop ${e.cast}` : MAT[e.kod]?.nazev || e.kod))}</strong>
        ${withSide || e.cast ? `<span>${esc(MAT[e.kod]?.nazev || '')}</span>` : ''}
        ${e.plocha ? `<em>${fmtNum(e.plocha)} m²</em>` : ''}
        ${e.poznamka ? `<small>${esc(e.poznamka)}</small>` : ''}</div>
      </li>`).join('')}
    </ul>` : '';
  return head + wallDiagram(it) + group('Podlaha', [it.podlaha]) +
    group('Stěny', sortBySide(it.steny), true) + group('Strop', it.strop);
}

function sortBySide(list) {
  const idx = e => { const i = STRANY.findIndex(s => e.orientace.startsWith(s)); return i < 0 ? 9 : i; };
  return [...list].sort((a, b) => idx(a) - idx(b));
}

// Schéma místnosti: čtyři stěny obarvené převažujícím materiálem, uprostřed podlaha.
function wallDiagram(it) {
  const side = name => {
    const list = it.steny.filter(s => s.orientace.startsWith(name));
    if (!list.length) return null;
    const main = list.reduce((a, b) => ((b.plocha || 0) > (a.plocha || 0) ? b : a)).kod;
    const more = uniq(list.map(s => s.kod)).length - 1;
    return { kod: main, label: more ? `${main} +${more}` : main };
  };
  const W = 230, H = 146, T = 14, x0 = 55, y0 = 26, w = 120, h = 92;
  const fill = k => (k && MAT[k] ? MAT[k].barva : 'transparent');
  const wall = (sd, x, y, ww, hh, tx, ty) => `
    <rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="${fill(sd?.kod)}" stroke="var(--line)"/>
    <text x="${tx}" y="${ty}" text-anchor="middle">${esc(sd?.label || '–')}</text>`;
  const [n, e, s, z] = STRANY.map(side);
  return `
    <svg class="diagram" viewBox="0 0 ${W} ${H}" role="img" aria-label="Schéma stěn místnosti">
      <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${fill(it.podlaha.kod)}" opacity=".55"/>
      <text x="${x0 + w / 2}" y="${y0 + h / 2 + 4}" text-anchor="middle" class="floor">${esc(it.podlaha.kod)}</text>
      ${wall(n, x0, y0 - T / 2, w, T, x0 + w / 2, y0 - 10)}
      ${wall(s, x0, y0 + h - T / 2, w, T, x0 + w / 2, y0 + h + 18)}
      ${wall(z, x0 - T / 2, y0, T, h, x0 - 28, y0 + h / 2 + 4)}
      ${wall(e, x0 + w - T / 2, y0, T, h, x0 + w + 28, y0 + h / 2 + 4)}
      <text x="${W - 14}" y="14" text-anchor="middle" class="north">S ↑</text>
    </svg>`;
}

function matChip(kod, withName) {
  const m = MAT[kod];
  if (!m) return `<span class="mat">${esc(kod)}</span>`;
  return `<span class="mat" title="${esc(m.nazev)}"><i style="background:${m.barva}"></i>${esc(kod)}${withName ? ` <span>${esc(m.kratce || m.nazev)}</span>` : ''}</span>`;
}

function materialsTable(sec) {
  const used = {};
  for (const it of state.items.filter(i => i.layer === 'povrchy')) {
    for (const e of [it.podlaha, ...it.steny, ...it.strop]) (used[e.kod] ??= new Set()).add(it.id);
  }
  const rows = Object.entries(MAT).filter(([k]) => used[k]).map(([k, m]) => `
    <tr><td>${matChip(k)}</td><td>${esc(m.nazev)}${m.poznamka ? `<br><small>${esc(m.poznamka)}</small>` : ''}</td>
    <td>${esc([...used[k]].join(', '))}</td><td>${esc(m.celkem || '')}</td></tr>`).join('');
  sec.insertAdjacentHTML('beforeend', `
    <h3 class="sub-h">Materiály</h3>
    <div class="table-wrap"><table class="mats">
      <thead><tr><th>Kód</th><th>Materiál</th><th>Místnosti</th><th>Celkem (s rezervou)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`);
}

function renderLegend() {
  const floors = uniq(state.items.filter(i => i.layer === 'povrchy').map(i => i.podlaha.kod)).sort();
  document.getElementById('floor-legend').insertAdjacentHTML('beforeend',
    floors.map(k => `<span class="chip legend" title="${esc(MAT[k].nazev)}"><i style="background:${MAT[k].barva}"></i>${esc(k)} ${esc(MAT[k].kratce || MAT[k].nazev)}</span>`).join(''));
}

// ---------- vrstva nábytku ----------

function furnitureHtml(it) {
  const rows = [
    ['Model', it.model], ['Čela / dvířka', it.cela], ['Korpus', it.korpus],
    ['Zásuvky', it.zasuvky], ['Další', it.dalsi],
  ].filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  const imgs = it.nahledy.map((src, i) => `<a href="${esc(src)}" target="_blank" rel="noopener" class="zoom"><img class="thumb photo" src="${esc(src)}" alt="Vizualizace ${i + 1}: ${esc(it.nazev)}" loading="lazy"></a>`).join('');
  return `
    <h3>${esc(it.nazev)} <span class="badge nab-${it.stav}">${STAV_NAB[it.stav]}</span></h3>
    <p class="rooms">${esc(it.mistnost)}</p>
    <div class="gallery">${imgs}</div>
    <p class="thumb-cap zoom-hint"><span class="when-pinned">Klikněte na obrázek pro zvětšení</span><span class="when-hover">Klikněte na místo v plánu – pak lze obrázky zvětšit</span></p>
    <dl>${rows}</dl>
    ${itemsTable(it, `Položky (ceny s DPH ${it.dph})`, 'Celkem s DPH',
      `<tr class="sub"><td>bez DPH</td><td class="num">${CZK.format(it.bez_dph)}</td></tr>`)}
    ${it.poznamka ? `<p class="note">${esc(it.poznamka)}</p>` : ''}
    <p class="src">${esc(it.zdroj)}, ${formatDate(it.datum)}</p>`;
}

function furnitureSummary(sec) {
  sec.insertAdjacentHTML('beforeend', `
    <p class="sum">Celkem za zobrazené položky: <strong id="nab-sum"></strong> s DPH</p>
    <p class="meta">Záruka: ${esc(ZARUKA)}</p>`);
}

function updateFurnitureSum() {
  const out = document.getElementById('nab-sum');
  if (!out) return;
  const total = state.items.filter(i => i.layer === 'nabytek' &&
    (state.floor === 'all' || state.floor === i.podlazi)).reduce((a, i) => a + i.celkem, 0);
  out.textContent = CZK.format(total);
}

// ---------- galerie (zvětšení obrázků) ----------

const lb = { list: [], i: 0 };

function bindLightbox() {
  // kliknutí na náhled v připnutém detailu otevře galerii se všemi obrázky detailu
  tip.addEventListener('click', e => {
    const a = e.target.closest('a.zoom');
    if (!a) return;
    e.preventDefault();
    const links = [...tip.querySelectorAll('a.zoom')];
    lb.list = links.map(l => ({ src: l.getAttribute('href'), alt: l.querySelector('img').alt }));
    lb.title = tip.querySelector('h3')?.firstChild?.textContent.trim() || '';
    openLightbox(links.indexOf(a));
  });
  lightbox.querySelector('.lb-close').addEventListener('click', closeLightbox);
  lightbox.querySelector('.lb-prev').addEventListener('click', () => stepLightbox(-1));
  lightbox.querySelector('.lb-next').addEventListener('click', () => stepLightbox(1));
  lightbox.addEventListener('click', e => { if (e.target === lightbox || e.target.tagName === 'FIGURE') closeLightbox(); });
  // přejetí prstem na mobilu
  let x0 = null;
  lightbox.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) stepLightbox(dx < 0 ? 1 : -1);
    x0 = null;
  });
}

function openLightbox(i) {
  lb.i = i;
  lightbox.hidden = false;
  document.body.classList.add('no-scroll');
  renderLightbox();
  lightbox.querySelector('.lb-close').focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.classList.remove('no-scroll');
}

function stepLightbox(d) {
  if (lb.list.length < 2) return;
  lb.i = (lb.i + d + lb.list.length) % lb.list.length;
  renderLightbox();
}

function renderLightbox() {
  const { src, alt } = lb.list[lb.i];
  const img = lightbox.querySelector('img');
  img.src = src;
  img.alt = alt;
  const n = lb.list.length;
  lightbox.querySelector('figcaption').textContent = `${lb.title}${n > 1 ? ` – ${lb.i + 1} / ${n}` : ''}`;
  lightbox.querySelectorAll('.lb-nav').forEach(b => { b.hidden = n < 2; });
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
function fmtNum(n) { return n == null ? '–' : String(n).replace('.', ','); }
function uniq(a) { return [...new Set(a)]; }
function formatDate(iso) { const [y, m, d] = iso.split('-'); return `${+d}. ${+m}. ${y}`; }
