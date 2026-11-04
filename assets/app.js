// DINOVERSE — site logic.
// No gate: the page lands directly on the hero ("OUR APPS, ONE PLACE.") + gallery.
// Per-app codes only: app list is public; each app's files are either open
// (plaintext) or locked (AES-encrypted with that app's own code).
// The gallery is a row of dioramas, one per app and game, carried past as the page scrolls; Lenis smooths it.
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
  setupStage();
  extrudeAll();
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

/* ---------- the gallery: each app and game a diorama, a small open box seen from above ---------- */
// The box has a floor, a back wall with the card's number on it, two side walls and a thick base.
// Things from the app or game stand on the floor at their own spots (mascot, icon, stickers), each
// with a shadow; the name floats above the box like a logo; the base's front is the info panel
// (version, platforms, the line, the buttons). Walls face inwards and vanish from outside, so the
// near walls never block the view in. Scrolling carries one box after another past the camera;
// the pointer turns the box in front.

// floor spots: x across (-0.5 left .. 0.5 right), z deep (-0.5 back .. 0.5 front), h height px
const SPOTS = {
  mascot: [0.27, 0.04, 300],
  icon: [0.46, -0.34, 150],
  extra: [[-0.04, 0.44, 118], [-0.3, 0.38, 125]],
  cover: [
    [-0.34, -0.22], [0.02, -0.3], [0.34, -0.2], [-0.16, 0.1], [0.2, 0.12],
    [-0.4, 0.22], [0.4, 0.24], [0.02, 0.28], [-0.1, -0.05], [0.12, -0.08],
  ],
};

const stage = { zone: null, scenes: [], px: 0, py: 0, tx: 0, ty: 0 };

function prop(src, [x, z, h], alt = '', cls = '') {
  return `<div class="prop${cls ? ` prop--${cls}` : ''}" style="--x:${x};--z:${z};--h:${h}"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" /></div>`;
}

// card: the article a card builder made (its parts are moved into the box, listeners and all)
function diorama(card, { num = '', props = '', logo = null, kind = '' } = {}) {
  const pick = (s) => card.querySelector(s);
  const d = document.createElement('article');
  d.className = 'dio' + (kind ? ` dio--${kind}` : '');
  d.innerHTML =
    '<div class="dio-floor"></div>' +
    `<div class="dio-wall dio-back"><span class="dio-num display">${escapeHtml(num)}</span></div>` +
    '<div class="dio-wall dio-left"></div><div class="dio-wall dio-right"></div>' +
    '<div class="dio-base dio-front"></div>' +
    '<div class="dio-base dio-base-left"></div><div class="dio-base dio-base-right"></div>' +
    props +
    '<div class="dio-float dio-text"><div class="dio-pane"></div></div>' +
    '<div class="dio-float dio-act"><div class="dio-pane"></div></div>';
  // the words hang in the air inside the box, nothing is written on its faces: the name first,
  // big, then the sticker, the tags and the line
  const text = $('.dio-text .dio-pane', d), act = $('.dio-act .dio-pane', d);
  const name = logo || pick('.panel-name');
  if (name) { name.classList.add('dio-title'); text.appendChild(name); }
  ['.beta-sticker', '.panel-meta', '.panel-desc'].forEach((s) => { const el = pick(s); if (el) text.appendChild(el); });
  const action = pick('.panel-action');
  if (action) act.appendChild(action);
  const desc = $('.panel-desc', text);
  if (desc) floatWords(desc);
  return d;
}

// each word of a line is a solid block (its face and darker copies stepping back) standing at its
// own small depth, so the line reads as heavy type hanging in 3D
function floatWords(el) {
  const words = el.textContent.split(/\s+/).filter(Boolean);
  const LAYERS = 5;
  el.setAttribute('aria-label', el.textContent);
  el.innerHTML = words.map((w, i) => {
    let sides = '';
    for (let k = LAYERS; k >= 1; k--) sides += `<span class="w-side" style="--k:${k};--fade:${(k / LAYERS).toFixed(2)}">${escapeHtml(w)}</span>`;
    return `<span class="w" aria-hidden="true" style="--wz:${((i * 7) % 5) * 6}px">${sides}<span class="w-face">${escapeHtml(w)}</span></span>`;
  }).join(' ');
}

function cardProps(card, extras = []) {
  const icon = card.querySelector('.panel-icon');
  const mascot = card.querySelector('.panel-sticker');
  let html = '';
  if (icon && icon.getAttribute('src')) html += prop(icon.getAttribute('src'), SPOTS.icon, icon.alt);
  extras.forEach((src, k) => { if (SPOTS.extra[k]) html += prop(src, SPOTS.extra[k]); });
  if (mascot && mascot.getAttribute('src')) html += prop(mascot.getAttribute('src'), SPOTS.mascot, mascot.alt, 'mascot');
  return html;
}

function coverDiorama(word, range, icons) {
  const logo = document.createElement('h2');
  logo.className = 'panel-name display';
  logo.textContent = word;
  const shell = document.createElement('div');
  shell.innerHTML = `<div class="panel-meta"><span class="tag">${escapeHtml(range)}</span></div>`;
  const props = icons.map((src, k) => prop(src, [...SPOTS.cover[k % SPOTS.cover.length], 130])).join('');
  return diorama(shell, { props, logo, kind: 'cover' });
}

function setupStage() {
  const apps = (DATA && Array.isArray(DATA.apps)) ? DATA.apps : [];
  const games = Array.isArray(window.DINO_GAMES) ? window.DINO_GAMES : [];
  const n = (i) => String(i).padStart(2, '0');

  const boxes = [coverDiorama('APPS', `${n(1)}—${n(apps.length)}`, apps.filter((a) => a.icon).map((a) => a.icon))];
  apps.forEach((a, i) => {
    const card = buildPanel(a, i).firstElementChild;
    boxes.push(diorama(card, { num: n(i + 1), props: cardProps(card) }));
  });
  if (games.length) {
    boxes.push(coverDiorama('GAMES', `${n(apps.length + 1)}—${n(apps.length + games.length)}`,
      games.map((g) => g.icon).filter(Boolean)));
    games.forEach((g, k) => {
      const card = buildGamePanel(g, apps.length + k);
      boxes.push(diorama(card, { num: n(apps.length + k + 1), props: cardProps(card, g.stickers || []) }));
    });
  }
  const soon = buildComingSoonPanel(apps.length + games.length + 1);
  boxes.push(diorama(soon, { num: n(apps.length + games.length + 1), kind: 'soon' }));

  stage.zone = $('#gallery');
  const room = $('.stage', stage.zone);
  room.replaceChildren();
  stage.scenes = boxes.map((box) => {
    const scene = document.createElement('div');
    scene.className = 'scene';
    scene.appendChild(box);
    room.appendChild(scene);
    return scene;
  });

  if (REDUCED()) stage.zone.classList.add('flat');
  sizeStage();
  window.addEventListener('resize', sizeStage);
  window.addEventListener('scroll', () => requestAnimationFrame(moveStage), { passive: true });
  if (lenis) lenis.on('scroll', moveStage);
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    stage.tx = (e.clientX / window.innerWidth) * 2 - 1;
    stage.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  requestAnimationFrame(function follow() {
    // the turn eases after the pointer instead of snapping to it
    stage.px += (stage.tx - stage.px) * 0.08;
    stage.py += (stage.ty - stage.py) * 0.08;
    moveStage();
    requestAnimationFrame(follow);
  });
}

function sizeStage() {
  const z = stage.zone;
  // One box fills the screen. It is laid out at a design width (--bw) and scaled (--k) to the
  // window's width; its walls are made as tall as the window then has room for.
  const vw = window.innerWidth, vh = window.innerHeight;
  const narrow = vw <= 760;
  const bw = narrow ? 520 : 1000, bd = narrow ? 300 : 380, bb = narrow ? 40 : 60;
  const yaw = (narrow ? 8 : 10) * Math.PI / 180, pitch = (narrow ? 10 : 14) * Math.PI / 180;
  const k = (vw * (narrow ? 0.96 : 0.9)) / (bw * Math.cos(yaw) + bd * Math.sin(yaw));
  const bh = Math.max(300, (vh * (narrow ? 0.84 : 0.9)) / k - bb - bd * Math.sin(pitch));
  z.style.setProperty('--bw', bw); z.style.setProperty('--bd', bd); z.style.setProperty('--bb', bb);
  z.style.setProperty('--bh', Math.round(bh));
  z.style.setProperty('--k', k.toFixed(4));
  // one screen to arrive, then most of a screen per box
  z.style.height = z.classList.contains('flat') ? '' : `${window.innerHeight * (1 + (stage.scenes.length - 1) * 0.8)}px`;
  if (lenis) lenis.resize();
  moveStage();
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function moveStage() {
  const z = stage.zone;
  if (!z || z.classList.contains('flat')) return;
  const count = stage.scenes.length;
  const rect = z.getBoundingClientRect();
  const total = z.offsetHeight - window.innerHeight;
  const p = (total > 0 ? clamp(-rect.top / total, 0, 1) : 0) * (count - 1);
  const k = Math.floor(p);
  // rest on a box for the first and last fifth of each step, move in between
  const at = k >= count - 1 ? count - 1 : k + ease(clamp((p - k - 0.2) / 0.6, 0, 1));
  const W = window.innerWidth;
  stage.scenes.forEach((scene, i) => {
    const d = i - at; // 0: in front, 1: next, -1: just gone
    const far = Math.abs(d);
    if (far > 1.6) { scene.style.visibility = 'hidden'; scene.inert = true; return; }
    scene.style.visibility = '';
    const near = 1 - Math.min(1, far);
    scene.style.transform =
      `translateX(${d * W * 0.7}px) translateZ(${-far * 600}px) rotateY(${-d * 30}deg)` +
      ` rotateX(${-stage.py * 5 * near}deg) rotateY(${stage.px * 14 * near}deg)`;
    scene.style.opacity = String(clamp(1.25 - far * 0.9, 0, 1));
    scene.inert = far > 0.15; // only the box in front takes clicks and focus
  });
}

/* ---------- 3D letters: every display letter a solid block floating at its own depth ---------- */
// Each letter is drawn once as its face and again a few times behind it, each copy a little
// further back and darker, so under the stage's perspective it reads as a letter with thickness.
// Each letter also stands at its own depth and drifts slowly forward and back.
function extrude(el, layers, step) {
  if (el.dataset.extruded) return;
  el.dataset.extruded = '1';
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  el.style.setProperty('--step', step + 'px');
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === Node.ELEMENT_NODE) { walk(n); return; }
      if (n.nodeType !== Node.TEXT_NODE) return;
      const frag = document.createDocumentFragment();
      for (const ch of n.textContent) {
        if (/\s/.test(ch)) { frag.appendChild(document.createTextNode(ch)); continue; }
        const l = document.createElement('span');
        l.className = 'l3';
        l.setAttribute('aria-hidden', 'true');
        l.style.setProperty('--lz', `${Math.round(((i * 37) % 11) * 4)}px`); // a steady scatter, 0-40px
        l.style.setProperty('--ld', `${-((i * 0.7) % 5).toFixed(2)}s`);
        // and is turned a little its own way, so its sides show
        l.style.setProperty('--rx', `${((i * 53) % 9) * 3.5 - 14}deg`);
        l.style.setProperty('--ry', `${((i * 29) % 9) * 4 - 16}deg`);
        i++;
        let html = '';
        for (let k = layers; k >= 1; k--) html += `<span class="l3-side" style="--k:${k};--fade:${(k / layers).toFixed(2)}">${escapeHtml(ch)}</span>`;
        l.innerHTML = html + `<span class="l3-face">${escapeHtml(ch)}</span>`;
        frag.appendChild(l);
      }
      n.replaceWith(frag);
    });
  };
  walk(el);
}

function extrudeAll() {
  $$('.gallery .dio-num').forEach((el) => extrude(el, 12, 3.6));
  $$('.gallery .panel-name:not([data-mosaic])').forEach((el) => extrude(el, 12, 3));
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
