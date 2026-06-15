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
    $('#gate-word').textContent = cfg.title.toUpperCase();
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

/* ---------- gate gimmick (click the word to enter) ---------- */
function initGate() {
  const gate = $('#gate');
  const word = $('#gate-word');
  if (!DATA || !Array.isArray(DATA.apps)) {
    word.textContent = 'NO DATA';
    word.style.cursor = 'default';
    return;
  }
  let entering = false;
  const go = (x, y) => {
    if (entering) return;
    entering = true;
    spawnShockwave(gate, x, y);
    gate.classList.add('stomp');
    setTimeout(() => gate.classList.add('leaving'), 380);
    setTimeout(() => enterSite(DATA.apps), 780);
  };
  word.addEventListener('click', (e) => go(e.clientX, e.clientY));
  word.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const r = word.getBoundingClientRect();
      go(r.left + r.width / 2, r.top + r.height / 2);
    }
  });
}

function spawnShockwave(gate, x, y) {
  const r = document.createElement('span');
  r.className = 'shockwave';
  r.style.left = x + 'px';
  r.style.top = y + 'px';
  gate.appendChild(r);
  setTimeout(() => r.remove(), 800);
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
