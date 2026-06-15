// DINOVERSE — site logic.
// Gate: no password — click the word to enter (fun gimmick).
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
    const span = document.createElement('span');
    span.className = 'ch';
    span.style.setProperty('--i', i++);
    span.textContent = ch === ' ' ? ' ' : ch;
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

/* ---------- gate: typographic wall + cursor lamp + click to enter ---------- */
function buildWall(wall) {
  const word = ((DATA.config && DATA.config.title) || 'DINOVERSE').toUpperCase();
  wall.innerHTML = '';
  const rowPx = Math.max(48, Math.min(96, Math.round(window.innerWidth * 0.07)));
  const rowCount = Math.ceil((window.innerHeight * 1.25) / (rowPx * 0.98)) + 2;
  const charW = rowPx * 0.62; // rough cap-letter advance
  const unitLen = (word.length + 2) * charW; // word + gap
  const reps = Math.ceil((window.innerWidth * 1.4) / unitLen) + 2;
  for (let i = 0; i < rowCount; i++) {
    const row = document.createElement('div');
    // strict alternation: even = solid black (raised), odd = engraved white (recessed)
    row.className = 'wall-row ' + (i % 2 ? 'rec' : 'blk');
    row.style.fontSize = rowPx + 'px';
    const track = document.createElement('div');
    track.className = 'wall-track';
    let unit = '';
    for (let k = 0; k < reps; k++) unit += word + '  '; // no dot, just a gap
    track.textContent = unit + unit; // duplicate → seamless -50% loop
    row.appendChild(track);
    wall.appendChild(row);
  }
}

function initGate() {
  const gate = $('#gate');
  if (!DATA || !Array.isArray(DATA.apps)) {
    gate.innerHTML = '<div class="wall"><div class="wall-row" style="font-size:48px">NO DATA — admin.html에서 생성하세요</div></div>';
    gate.style.cursor = 'default';
    return;
  }
  const wall = $('#wall');
  buildWall(wall);
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => buildWall(wall), 200); });

  let entering = false;

  // mouse parallax: black layer slides opposite the cursor, white layer with it
  // (horizontal full, vertical a little)
  window.addEventListener('mousemove', (e) => {
    if (entering) return;
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;  // -1 (left) .. 1 (right)
    const ny = (e.clientY / window.innerHeight - 0.5) * 2; // -1 (top) .. 1 (bottom)
    const ax = Math.min(140, window.innerWidth * 0.06);
    const ay = Math.min(60, window.innerHeight * 0.035);
    wall.style.setProperty('--bx', (-nx * ax).toFixed(1) + 'px'); // black: opposite
    wall.style.setProperty('--by', (-ny * ay).toFixed(1) + 'px');
    wall.style.setProperty('--wx', (nx * ax).toFixed(1) + 'px');  // white: same dir
    wall.style.setProperty('--wy', (ny * ay).toFixed(1) + 'px');
  });
  const enter = () => {
    if (entering) return;
    entering = true;
    gate.classList.add('leaving');
    setTimeout(() => enterSite(DATA.apps), 460);
  };
  gate.addEventListener('click', enter);
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !gate.classList.contains('hidden')) {
      e.preventDefault(); enter();
    }
  });
}

function enterSite(apps) {
  $('#gate').classList.add('hidden');
  $('#app').classList.remove('hidden');
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
  $('#counter').textContent = `01 / ${String($$('.panel', track).length).padStart(2, '0')}`;
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
  const panels = $$('.panel', track);
  const idx = clamp(Math.round(progress * (panels.length - 1)), 0, panels.length - 1);
  $('#counter').textContent = `${String(idx + 1).padStart(2, '0')} / ${String(panels.length).padStart(2, '0')}`;
}

/* ---------- utils ---------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- boot ---------- */
applyConfig();
initLenis();
initGate();
$('#lock-btn').addEventListener('click', () => location.reload());
