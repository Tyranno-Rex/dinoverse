// DINOVERSE — site logic.
// No gate: the page lands directly on the hero ("OUR APPS, ONE PLACE.") + gallery.
// Per-app codes only: app list is public; each app's files are either open
// (plaintext) or locked (AES-encrypted with that app's own code).
// The gallery is two dice (apps, games) that roll face to face as the page scrolls; Lenis smooths it.
//
// DINO_DATA shape:
//   { config:{title,heroSub},
//     apps:[ { id,name,description,version,platforms,
//              lock:'open', files:[{label,url,size}] }            // open
//          | { id,name,description,version,platforms,
//              lock:'own',  enc:<encrypted {files,notes}> } ] }   // needs app code

const DATA = window.DINO_DATA || null;
let lenis = null;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const PLATFORM_LABEL = { win: 'WINDOWS', android: 'ANDROID', mac: 'MACOS', linux: 'LINUX', web: 'WEB', ios: 'IOS', steam: 'STEAM' };

// One drawn icon set (1.5px stroke, square caps) instead of emoji and unicode arrows.
const ICON_PATHS = {
  lock: '<rect x="3.5" y="7.5" width="9" height="6.5"/><path d="M5.5 7.5V5a2.5 2.5 0 0 1 5 0v2.5"/>',
  card: '<rect x="2" y="4" width="12" height="8.5"/><path d="M2 7h12M4.5 10.5h3"/>',
  down: '<path d="M8 2.5v10M3.5 8l4.5 4.5L12.5 8"/>',
};
const svgIcon = (name) =>
  `<svg class="ico" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
// A name may carry explicit line breaks ("Brachy\nCalendar"); flat() is for alt text.
const flatName = (s) => s.replace(/\n/g, ' ');
const REDUCED = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- kinetic text splitter ---------- */
function splitText(el) {
  if (el.dataset.done) {
    $$('.ch', el).forEach((c) => { c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; });
    return;
  }
  const text = el.textContent;
  el.textContent = '';
  let i = 0;
  for (const ch of text) {
    if (ch === ' ') { el.appendChild(document.createTextNode(' ')); continue; } // keep word spacing
    const span = document.createElement('span');
    span.className = 'ch';
    span.style.setProperty('--i', i++);
    span.textContent = ch;
    el.appendChild(span);
  }
  el.dataset.done = '1';
}

/* ---------- config ---------- */
function applyConfig() {
  const cfg = (DATA && DATA.config) || {};
  if (cfg.title) {
    document.title = cfg.title;
    $('#site-title').textContent = cfg.title;
  }
  if (cfg.heroSub) $('#hero-sub').textContent = cfg.heroSub;
}

/* ---------- Lenis smooth scroll ---------- */
function initLenis() {
  if (REDUCED() || typeof Lenis === 'undefined') return;
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
  function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
}

/* ---------- start (no gate) ---------- */
function startSite() {
  setupDice();
  mosaicNames();
  $$('#app [data-split]').forEach(splitText);
  let mosaicTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(mosaicTimer);
    // the type size follows the window, so the mosaic is redrawn at the new size
    mosaicTimer = setTimeout(mosaicNames, 160);
  });
}

/* ---------- names shown only as a mosaic (games.js `mosaic`) ---------- */
// The name is drawn small in the panel's own type and blown up block by block. What it is drawn
// from is a gibberish stand-in, so neither the source nor an un-blurred mosaic gives a real name.
function mosaicNames() {
  $$('[data-mosaic]').forEach((el) => {
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    const lineH = parseFloat(cs.lineHeight) || size * 0.86;
    const block = Math.max(6, Math.round(size / 3.5)); // coarse enough to read as censored
    const lines = el.dataset.mosaic.toUpperCase().split('\n');
    const font = `${cs.fontWeight} ${size / block}px ${cs.fontFamily}`;
    const cv = document.createElement('canvas');
    const g = cv.getContext('2d');
    g.font = font;
    cv.width = Math.ceil(Math.max(...lines.map((l) => g.measureText(l).width))) + 1;
    cv.height = Math.ceil((lines.length * lineH) / block);
    g.font = font; // resizing the canvas reset it
    g.fillStyle = cs.color;
    g.textBaseline = 'middle';
    lines.forEach((l, k) => g.fillText(l, 0, ((k + 0.5) * lineH) / block));
    cv.className = 'mosaic';
    cv.style.width = cv.width * block + 'px';
    cv.style.height = cv.height * block + 'px';
    el.replaceChildren(cv);
    el.setAttribute('aria-label', 'Name hidden');
  });
}

/* ---------- an app's card ---------- */
function buildPanel(app, i) {
  const node = $('#panel-tpl').content.cloneNode(true);
  $('.panel-index', node).textContent = String(i + 1).padStart(2, '0');
  const rawName = app.name || app.id;
  const nameEl = $('.panel-name', node);
  rawName.split('\n').forEach((part, k) => {
    if (k) nameEl.appendChild(document.createElement('br'));
    nameEl.appendChild(document.createTextNode(part));
  });
  $('.panel-desc', node).textContent = app.description || '';

  const sticker = $('.panel-sticker', node);
  if (app.image) {
    sticker.src = app.image;
    sticker.alt = flatName(rawName);
    sticker.classList.add('panel-sticker--p' + (i % 5)); // vary spot/angle per app
  } else { sticker.remove(); }

  const icon = $('.panel-icon', node);
  if (app.icon) {
    icon.src = app.icon;
    icon.alt = flatName(rawName) + ' icon';
  } else { icon.remove(); }

  // apps with a page of their own link out to it; the rest drop the link
  const site = $('.panel-site', node);
  if (app.site) site.href = app.site;
  else site.remove();

  const meta = $('.panel-meta', node);
  const bits = [];
  if (app.version) bits.push(`<span class="tag">v${escapeHtml(app.version)}</span>`);
  (app.platforms || []).forEach((p) => bits.push(`<span>${PLATFORM_LABEL[p] || escapeHtml(p)}</span>`));
  const access = app.lock === 'own' ? svgIcon('lock') + 'APP CODE' : (app.paid ? svgIcon('card') + 'PAID' : svgIcon('down') + 'FREE');
  bits.push(`<span class="access">${access}</span>`);
  meta.innerHTML = bits.join('');

  wirePanel(node, app);
  return node;
}

/* ---------- each game's card: icon and number, version, platforms, NOT YET, the name as a mosaic, one line ---------- */
function buildGamePanel(g, i) {
  const p = document.createElement('article');
  p.className = 'panel game-panel';
  p.innerHTML =
    '<div class="panel-badge">' +
      (g.icon ? `<img class="panel-icon" src="${escapeHtml(g.icon)}" alt="" />` : '') +
      `<span class="panel-index">${String(i + 1).padStart(2, '0')}</span></div>` +
    '<div class="panel-content">' +
      '<div class="panel-meta">' +
        (g.version ? `<span class="tag">v${escapeHtml(g.version)}</span>` : '') +
        (g.platforms || []).map((x) => `<span>${PLATFORM_LABEL[x] || escapeHtml(x)}</span>`).join('') +
        '<span>NOT YET</span></div>' +
      '<h2 class="panel-name display"></h2>' +
      `<p class="panel-desc">${escapeHtml(g.description || '')}</p>` +
    '</div>' +
    (g.image ? `<img class="panel-sticker panel-sticker--p${i % 5}" src="${escapeHtml(g.image)}" alt="" />` : '');
  const nameEl = $('.panel-name', p);
  const name = g.name || g.id;
  if (g.mosaic) nameEl.dataset.mosaic = name; // drawn over as blocks once laid out (mosaicNames)
  nameEl.textContent = flatName(name);
  return p;
}

/* ---------- coming-soon teaser panel (one consolidated card) ---------- */
function buildComingSoonPanel(n) {
  const p = document.createElement('article');
  p.className = 'panel soon-panel';
  p.innerHTML =
    '<div class="panel-badge"><span class="panel-index">' + String(n).padStart(2, '0') + '</span></div>' +
    '<div class="panel-content">' +
      '<h2 class="panel-name display">MORE<br>TO COME</h2>' +
      '<p class="panel-desc soon-sub">More is on the way.</p>' +
    '</div>';
  return p;
}

function wirePanel(node, app) {
  const unlockBtn = $('.unlock-btn', node);
  const pwForm = $('.app-pw', node);
  const filesBox = $('.files', node);
  const errEl = $('.app-error', node);
  const input = $('.app-pw-input', node);

  if (app.lock === 'own') {
    unlockBtn.textContent = '[ UNLOCK ]';
    unlockBtn.addEventListener('click', () => {
      unlockBtn.classList.add('hidden');
      pwForm.classList.remove('hidden');
      input.focus();
    });
    pwForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.textContent = '';
      try {
        const payload = await decryptJSON(app.enc, input.value); // throws on wrong code
        renderFiles(filesBox, payload);
        pwForm.classList.add('hidden');
        if (lenis) lenis.resize();
      } catch {
        errEl.textContent = 'WRONG CODE';
        input.select();
      }
    });
  } else {
    // open app — files are plaintext
    unlockBtn.textContent = '[ SHOW DOWNLOADS ]';
    unlockBtn.addEventListener('click', () => {
      renderFiles(filesBox, { files: app.files || [] });
      unlockBtn.classList.add('hidden');
      if (lenis) lenis.resize();
    });
  }
}

function renderFiles(box, payload) {
  box.classList.remove('hidden');
  box.innerHTML = '';
  const files = (payload && payload.files) || [];
  if (!files.length) { box.innerHTML = '<div class="empty">No download links.</div>'; return; }
  files.forEach((f) => {
    const a = document.createElement('a');
    a.className = 'file-link';
    a.href = f.url; a.setAttribute('download', ''); a.rel = 'noopener';
    a.innerHTML = `<span>${escapeHtml(f.label || 'DOWNLOAD')}</span>` +
      `<span>${f.size ? `<span class="meta">${escapeHtml(f.size)}</span> ` : ''}<span class="dl">${svgIcon('down')}</span></span>`;
    box.appendChild(a);
  });
}

/* ---------- the gallery: two dice, one for the apps and one for the games ---------- */
// Every card is a face of a die. Scrolling rolls the die over to its next face, a tumble that
// rests on each face for a while; the die hops a little and the faces turning away darken.
// Faces are laid out at a fixed design size (FACE px square) and scaled to the window.
const FACE = 560;
// The order a die shows its faces in: each is next to the one before, so every step is one tumble.
const ROLL = ['front', 'top', 'right', 'back', 'bottom', 'left'];
const PIPS = { front: 1, top: 2, right: 3, back: 6, bottom: 5, left: 4 }; // opposite faces add up to 7

// quaternions [w, x, y, z]
const qAxis = (x, y, z, deg) => { const h = (deg * Math.PI) / 360, s = Math.sin(h); return [Math.cos(h), x * s, y * s, z * s]; };
const qConj = (q) => [q[0], -q[1], -q[2], -q[3]];
const qMul = (a, b) => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];
function qSlerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (d < 0) { b = b.map((v) => -v); d = -d; }
  if (d > 0.9995) return a.map((v, i) => v + (b[i] - v) * t);
  const th = Math.acos(d), s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return a.map((v, i) => v * wa + b[i] * wb);
}
function qMat([w, x, y, z]) { // rows of the 3x3 rotation
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ];
}
const css3d = (R) => `matrix3d(${R[0][0]},${R[1][0]},${R[2][0]},0,${R[0][1]},${R[1][1]},${R[2][1]},0,${R[0][2]},${R[1][2]},${R[2][2]},0,0,0,0,1)`;
// how squarely face f looks at the viewer once the die is turned by C: the z of its turned normal
const facing = (C, F) => C[2][0] * F[0][2] + C[2][1] * F[1][2] + C[2][2] * F[2][2];

// where each face sits on the die (y points down the screen, z towards the viewer)
const SLOT_Q = {
  front: [1, 0, 0, 0],
  top: qAxis(1, 0, 0, 90),
  right: qAxis(0, 1, 0, 90),
  back: qAxis(0, 1, 0, 180),
  bottom: qAxis(1, 0, 0, -90),
  left: qAxis(0, 1, 0, -90),
};

const dice = [];

// cards: the elements for the faces the die shows, in order; the faces it never stops on show pips
function buildDie(zone, cards) {
  const die = $('.die', zone);
  die.replaceChildren();
  const faces = ROLL.map((slot, k) => {
    const face = document.createElement('div');
    face.className = 'face';
    const body = document.createElement('div');
    body.className = 'face-body';
    if (cards[k]) body.appendChild(cards[k]);
    else body.appendChild(pipFace(PIPS[slot]));
    face.appendChild(body);
    die.appendChild(face);
    return { el: face, slot, R: qMat(SLOT_Q[slot]) };
  });
  dice.push({ zone, faces, stops: Math.max(1, Math.min(cards.length, ROLL.length)) });
}

function pipFace(n) {
  const spots = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] }[n];
  const p = document.createElement('div');
  p.className = 'panel pip-face';
  p.setAttribute('aria-hidden', 'true');
  for (let i = 1; i <= 9; i++) {
    const s = document.createElement('span');
    if (spots.includes(i)) s.className = 'pip';
    p.appendChild(s);
  }
  return p;
}

function coverFace(word, range) {
  const p = document.createElement('article');
  p.className = 'panel cover-face';
  p.innerHTML = `<h2 class="cover-word display">${escapeHtml(word)}</h2><span class="cover-range">${escapeHtml(range)}</span>`;
  return p;
}

function sizeDice() {
  const S = Math.round(Math.min(window.innerWidth * 0.88, window.innerHeight * 0.72, 620));
  dice.forEach((d) => {
    d.zone.style.setProperty('--S', S + 'px');
    d.zone.style.setProperty('--k', S / FACE);
    d.faces.forEach((f) => { f.el.style.transform = `${css3d(f.R)} translateZ(${S / 2}px)`; });
    if (!d.zone.classList.contains('flat')) {
      // one screen to arrive, then most of a screen per tumble
      d.zone.style.height = `${window.innerHeight * (1 + (d.stops - 1) * 0.85)}px`;
    } else d.zone.style.height = '';
  });
  if (lenis) lenis.resize();
  rollDice();
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function rollDice() {
  dice.forEach((d) => {
    const { zone, faces, stops } = d;
    if (zone.classList.contains('flat')) return;
    const rect = zone.getBoundingClientRect();
    const total = zone.offsetHeight - window.innerHeight;
    const p = (total > 0 ? clamp(-rect.top / total, 0, 1) : 0) * (stops - 1);
    const k = Math.min(Math.floor(p), stops - 1);
    // rest on a face for the first and last fifth of each step, tumble in between
    const t = k >= stops - 1 ? 0 : ease(clamp((p - k - 0.2) / 0.6, 0, 1));
    const from = qConj(SLOT_Q[faces[k].slot]);
    const to = qConj(SLOT_Q[faces[Math.min(k + 1, stops - 1)].slot]);
    const C = qMat(qSlerp(from, to, t));
    const S = parseFloat(zone.style.getPropertyValue('--S')) || FACE;
    const hop = Math.sin(Math.PI * t);
    // The die rests a little turned so its sides show. Turning it about its centre would swing the
    // face in front sideways and towards the camera, so the face's centre is moved back to where
    // an unturned face would be: on screen centre, at its true size.
    const yaw = 12 - hop * 6, pitch = -9;
    const T = qMat(qMul(qAxis(1, 0, 0, pitch), qAxis(0, 1, 0, yaw)));
    const h = S / 2;
    const [vx, vy, vz] = [T[0][2] * h, T[1][2] * h, T[2][2] * h];
    $('.die-hop', zone).style.transform =
      `translate3d(${-vx}px, ${-vy - hop * S * 0.06}px, ${-vz - hop * S * 0.4}px) rotateX(${pitch}deg) rotateY(${yaw}deg)`;
    $('.die', zone).style.transform = css3d(C);
    faces.forEach((f) => {
      const z = facing(C, f.R);
      f.el.style.setProperty('--shade', ((1 - clamp(z, 0, 1)) * 0.7).toFixed(3));
      f.el.inert = z < 0.9; // only the face turned to the viewer takes clicks and focus
    });
  });
}

function setupDice() {
  const apps = (DATA && Array.isArray(DATA.apps)) ? DATA.apps : [];
  const games = Array.isArray(window.DINO_GAMES) ? window.DINO_GAMES : [];
  const n = (i) => String(i).padStart(2, '0');

  const appCards = [coverFace('APPS', `${n(1)}—${n(apps.length)}`)];
  apps.forEach((a, i) => appCards.push(buildPanel(a, i).firstElementChild));
  buildDie($('#apps'), appCards.slice(0, ROLL.length));

  const first = apps.length + 1;
  const gameCards = [coverFace('GAMES', `${n(first)}—${n(apps.length + games.length)}`)];
  games.forEach((g, k) => gameCards.push(buildGamePanel(g, apps.length + k)));
  gameCards.push(buildComingSoonPanel(apps.length + games.length + 1));
  buildDie($('#games'), gameCards.slice(0, ROLL.length));

  if (REDUCED()) dice.forEach((d) => d.zone.classList.add('flat'));
  sizeDice();
  window.addEventListener('resize', sizeDice);
  window.addEventListener('scroll', () => requestAnimationFrame(rollDice), { passive: true });
  if (lenis) lenis.on('scroll', rollDice);
}

/* ---------- draggable hero stickers (drag & drop toy) ---------- */
let stickerZ = 10;

function setupHeroStickers() {
  const hero = $('.hero');
  if (!hero) return;
  const apps = (DATA && Array.isArray(DATA.apps)) ? DATA.apps : [];

  const layer = document.createElement('div');
  layer.className = 'hero-stickers';
  const els = [];
  const imgEls = [];

  // company sticker — stacked ink badge (intentionally different from footer pill)
  const studio = document.createElement('div');
  studio.className = 'drag-sticker drag-sticker--studio';
  studio.innerHTML = 'SURVIVING<br>DINOS<br>STUDIO';
  els.push(studio);
  layer.appendChild(studio);

  // app stickers — the same PNGs that used to sit beside the panel numbers
  apps.filter((a) => a.image).forEach((a) => {
    const s = document.createElement('div');
    s.className = 'drag-sticker drag-sticker--app';
    const img = document.createElement('img');
    img.alt = a.name || a.id;
    img.draggable = false;
    img.src = a.image;
    s.appendChild(img);
    els.push(s);
    imgEls.push(img);
    layer.appendChild(s);
  });

  // app icons — added as extra draggable stickers (smaller than mascots)
  apps.filter((a) => a.icon).forEach((a) => {
    const s = document.createElement('div');
    s.className = 'drag-sticker drag-sticker--icon';
    const img = document.createElement('img');
    img.alt = (a.name || a.id) + ' icon';
    img.draggable = false;
    img.src = a.icon;
    s.appendChild(img);
    els.push(s);
    imgEls.push(img);
    layer.appendChild(s);
  });

  // game stickers — a couple of things from inside each game (games.js `stickers`)
  const games = Array.isArray(window.DINO_GAMES) ? window.DINO_GAMES : [];
  games.forEach((gm) => (gm.stickers || []).forEach((src) => {
    const s = document.createElement('div');
    s.className = 'drag-sticker drag-sticker--game';
    const img = document.createElement('img');
    img.alt = flatName(gm.name || gm.id);
    img.draggable = false;
    img.src = src;
    s.appendChild(img);
    els.push(s);
    imgEls.push(img);
    layer.appendChild(s);
  }));

  hero.appendChild(layer);

  // random tilt per sticker
  els.forEach((el) => {
    const deg = (Math.random() * 16 - 8).toFixed(1); // -8°..+8°
    el.style.transform = `rotate(${deg}deg)`;
  });

  // wait until images report their size, then lay out + enable drag
  const ready = imgEls.map((img) =>
    img.complete && img.naturalWidth
      ? Promise.resolve()
      : new Promise((res) => { img.onload = res; img.onerror = res; }));
  Promise.all(ready).then(() => requestAnimationFrame(() => {
    placeStickersRandomly(hero, els);
    els.forEach((el) => makeDraggable(el, hero));
  }));

  window.addEventListener('resize', () => clampStickers(hero, els));
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// random, non-overlapping placement that keeps clear of the hero text
function placeStickersRandomly(hero, els) {
  const hb = hero.getBoundingClientRect();
  const pad = 18, margin = 14;
  const forbidden = [];
  $$('.hero-title, .hero-sub, .scroll-cue', hero).forEach((el) => {
    const r = el.getBoundingClientRect();
    forbidden.push({ x: r.left - hb.left - pad, y: r.top - hb.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 });
  });
  forbidden.push({ x: 0, y: 0, w: hb.width, h: 70 }); // topbar / wordmark band

  const placed = [];
  els.forEach((el, idx) => {
    const sw = el.offsetWidth, sh = el.offsetHeight;
    const maxX = Math.max(margin, hb.width - sw - margin);
    const maxY = Math.max(margin, hb.height - sh - margin);
    let spot = null;
    for (let i = 0; i < 600; i++) {
      const x = margin + Math.random() * (maxX - margin);
      const y = margin + Math.random() * (maxY - margin);
      const r = { x, y, w: sw, h: sh };
      if (forbidden.some((f) => rectsOverlap(r, f))) continue;
      if (placed.some((p) => rectsOverlap(r, p))) continue;
      spot = r; break;
    }
    if (!spot) { // fallback to spread-out corners if sampling failed
      const corners = [
        { x: margin, y: 84 }, { x: maxX, y: 84 },
        { x: margin, y: maxY }, { x: maxX, y: maxY },
      ];
      const c = corners[idx % corners.length];
      spot = { x: c.x, y: c.y, w: sw, h: sh };
    }
    el.style.left = spot.x + 'px';
    el.style.top = spot.y + 'px';
    placed.push(spot);
  });
}

function clampStickers(hero, els) {
  const hb = hero.getBoundingClientRect();
  els.forEach((el) => {
    const x = Math.min(parseFloat(el.style.left) || 0, hb.width - el.offsetWidth - 6);
    const y = Math.min(parseFloat(el.style.top) || 0, hb.height - el.offsetHeight - 6);
    el.style.left = Math.max(6, x) + 'px';
    el.style.top = Math.max(6, y) + 'px';
  });
}

function makeDraggable(el, hero) {
  let sx, sy, ox, oy, dragging = false, pid = null;
  el.addEventListener('pointerdown', (e) => {
    dragging = true; pid = e.pointerId;
    try { el.setPointerCapture(pid); } catch (_) {}
    el.classList.add('grabbing');
    el.style.zIndex = String(++stickerZ);
    sx = e.clientX; sy = e.clientY;
    ox = parseFloat(el.style.left) || 0;
    oy = parseFloat(el.style.top) || 0;
    e.preventDefault();
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const hb = hero.getBoundingClientRect();
    let nx = ox + (e.clientX - sx);
    let ny = oy + (e.clientY - sy);
    nx = Math.max(0, Math.min(nx, hb.width - el.offsetWidth));
    ny = Math.max(0, Math.min(ny, hb.height - el.offsetHeight));
    el.style.left = nx + 'px';
    el.style.top = ny + 'px';
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    try { el.releasePointerCapture(pid); } catch (_) {}
    el.classList.remove('grabbing');
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

/* ---------- utils ---------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- boot ---------- */
applyConfig();
initLenis();
startSite();
setupHeroStickers();
