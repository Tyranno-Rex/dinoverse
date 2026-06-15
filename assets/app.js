// DINOVERSE — site logic.
// No gate: the page lands directly on the hero ("OUR APPS, ONE PLACE.") + gallery.
// Per-app codes only: app list is public; each app's files are either open
// (plaintext) or locked (AES-encrypted with that app's own code).
// Mixed scroll (#8): gallery translates horizontally, smoothed by Lenis.
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

const PLATFORM_LABEL = { win: 'WINDOWS', android: 'ANDROID', mac: 'MACOS', linux: 'LINUX', web: 'WEB', ios: 'IOS' };
const SMALL = () => window.matchMedia('(max-width: 760px)').matches;
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
  lenis.on('scroll', updateHScroll);
}

/* ---------- start (no gate) ---------- */
function startSite() {
  const apps = (DATA && Array.isArray(DATA.apps)) ? DATA.apps : [];
  renderPanels(apps);
  $$('#app [data-split]').forEach(splitText);
  if (lenis) lenis.resize();
  setupHScroll();
}

/* ---------- render app panels ---------- */
function renderPanels(apps) {
  const track = $('#htrack');
  $$('.panel:not(.intro-panel)', track).forEach((n) => n.remove());

  if (!apps.length) {
    const p = document.createElement('article');
    p.className = 'panel';
    p.innerHTML = '<div class="panel-content"><div class="empty">아직 배포된 앱이 없습니다.</div></div>';
    track.appendChild(p);
  } else {
    const tpl = $('#panel-tpl');
    apps.forEach((app, i) => {
      const node = tpl.content.cloneNode(true);
      $('.panel-index', node).textContent = String(i + 1).padStart(2, '0');
      $('.panel-name', node).textContent = app.name || app.id;
      $('.panel-desc', node).textContent = app.description || '';

      const meta = $('.panel-meta', node);
      const bits = [];
      if (app.version) bits.push(`<span class="tag">v${escapeHtml(app.version)}</span>`);
      (app.platforms || []).forEach((p) => bits.push(`<span>${PLATFORM_LABEL[p] || escapeHtml(p)}</span>`));
      bits.push(`<span>${app.lock === 'own' ? '🔒 APP CODE' : '↓ FREE'}</span>`);
      meta.innerHTML = bits.join('');

      wirePanel(node, app);
      track.appendChild(node);
    });
  }
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
    unlockBtn.textContent = '[ 다운로드 보기 ]';
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
  if (!files.length) { box.innerHTML = '<div class="empty">다운로드 링크가 없습니다.</div>'; return; }
  files.forEach((f) => {
    const a = document.createElement('a');
    a.className = 'file-link';
    a.href = f.url; a.setAttribute('download', ''); a.rel = 'noopener';
    a.innerHTML = `<span>${escapeHtml(f.label || 'DOWNLOAD')}</span>` +
      `<span>${f.size ? `<span class="meta">${escapeHtml(f.size)}</span> ` : ''}<span class="dl">↓</span></span>`;
    box.appendChild(a);
  });
}

/* ---------- horizontal scroll (#8) ---------- */
function setupHScroll() {
  const sec = $('#hscroll');
  if (SMALL() || REDUCED()) { sec.classList.add('native'); return; }
  sec.classList.remove('native');
  resizeHScroll();
  window.addEventListener('resize', resizeHScroll);
  if (!lenis) window.addEventListener('scroll', updateHScroll, { passive: true });
  updateHScroll();
}

function resizeHScroll() {
  const sec = $('#hscroll');
  const track = $('#htrack');
  if (sec.classList.contains('native')) return;
  const distance = Math.max(0, track.scrollWidth - window.innerWidth);
  sec.style.height = distance + window.innerHeight + 'px';
  if (lenis) lenis.resize();
  updateHScroll();
}

function updateHScroll() {
  const sec = $('#hscroll');
  const track = $('#htrack');
  if (!sec || sec.classList.contains('native')) return;
  const distance = Math.max(0, track.scrollWidth - window.innerWidth);
  const total = sec.offsetHeight - window.innerHeight;
  const rect = sec.getBoundingClientRect();
  const progress = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
  track.style.transform = `translateX(${-progress * distance}px)`;
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
  $$('.hero-title, .hero-sub', hero).forEach((el) => {
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
