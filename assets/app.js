// DINOVERSE — site logic.
// Typographic statements (#6): kinetic letter reveals.
// Mixed scroll (#8): the app gallery translates horizontally as you scroll down,
//   smoothed by Lenis (vendored). Crypto gate + per-app unlock unchanged.

const DATA = window.DINO_DATA || null;
let PAGE_PW = null;
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
    // re-trigger animation
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
    span.textContent = ch === ' ' ? ' ' : ch;
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
    const gw = $('.gate-word');
    if (gw) gw.textContent = cfg.title.toUpperCase();
  }
  if (cfg.heroSub) $('#hero-sub').textContent = cfg.heroSub;
}

/* ---------- marquee ---------- */
function fillMarquee() {
  const row = $('#gate-marquee');
  if (!row) return;
  const words = ['DOWNLOAD', 'UPDATE', 'DEPLOY', 'INSTALL', 'SHIP'];
  let html = '';
  for (let k = 0; k < 2; k++) words.forEach((w) => (html += `<span>${w} ✺</span>`));
  row.innerHTML = html;
}

/* ---------- Lenis smooth scroll ---------- */
function initLenis() {
  if (REDUCED() || typeof Lenis === 'undefined') return;
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
  function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  lenis.on('scroll', updateHScroll);
}

/* ---------- gate ---------- */
function initGate() {
  const form = $('#gate-form');
  const err = $('#gate-error');
  if (!DATA || !DATA.list) {
    err.textContent = 'NO DATA — admin.html에서 생성하세요.';
    $('#gate-pw').disabled = true;
    return;
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    try {
      const list = await decryptJSON(DATA.list, $('#gate-pw').value);
      PAGE_PW = $('#gate-pw').value;
      enterSite(list);
    } catch {
      err.textContent = 'WRONG CODE / 코드가 올바르지 않습니다';
      $('#gate-pw').select();
    }
  });
}

function enterSite(list) {
  $('#gate').classList.add('hidden');
  $('#app').classList.remove('hidden');
  renderPanels(list);
  // animate the hero + headings now that they're visible
  $$('#app [data-split]').forEach(splitText);
  if (lenis) lenis.resize();
  setupHScroll();
}

/* ---------- render app panels ---------- */
function renderPanels(list) {
  const track = $('#htrack');
  // remove any previously injected panels (keep intro)
  $$('.panel:not(.intro-panel)', track).forEach((n) => n.remove());

  if (!Array.isArray(list) || list.length === 0) {
    const p = document.createElement('article');
    p.className = 'panel';
    p.innerHTML = '<div class="panel-content"><div class="empty">아직 배포된 앱이 없습니다.</div></div>';
    track.appendChild(p);
  } else {
    const tpl = $('#panel-tpl');
    list.forEach((item, i) => {
      const node = tpl.content.cloneNode(true);
      $('.panel-index', node).textContent = String(i + 1).padStart(2, '0');
      $('.panel-name', node).textContent = item.name || item.id;
      $('.panel-desc', node).textContent = item.description || '';

      const meta = $('.panel-meta', node);
      const bits = [];
      if (item.version) bits.push(`<span class="tag">v${escapeHtml(item.version)}</span>`);
      (item.platforms || []).forEach((p) => bits.push(`<span>${PLATFORM_LABEL[p] || escapeHtml(p)}</span>`));
      bits.push(`<span>${item.lock === 'own' ? '🔒 APP CODE' : 'PAGE CODE'}</span>`);
      meta.innerHTML = bits.join('');

      wirePanel(node, item);
      track.appendChild(node);
    });
  }
  $('#counter').textContent = `01 / ${String(($$('.panel', track).length)).padStart(2, '0')}`;
}

function wirePanel(node, item) {
  const unlockBtn = $('.unlock-btn', node);
  const pwForm = $('.app-pw', node);
  const filesBox = $('.files', node);
  const errEl = $('.app-error', node);
  const input = $('.app-pw-input', node);

  const reveal = async (pw) => {
    const blob = DATA.downloads && DATA.downloads[item.id];
    if (!blob) {
      filesBox.classList.remove('hidden');
      filesBox.innerHTML = '<div class="empty">다운로드 링크가 아직 없습니다.</div>';
      return;
    }
    renderFiles(filesBox, await decryptJSON(blob, pw));
    if (lenis) lenis.resize();
  };

  if (item.lock === 'page') {
    unlockBtn.textContent = '[ 다운로드 보기 ]';
    unlockBtn.addEventListener('click', async () => {
      try { await reveal(PAGE_PW); unlockBtn.classList.add('hidden'); }
      catch { filesBox.classList.remove('hidden'); filesBox.innerHTML = '<div class="empty">복호화 실패</div>'; }
    });
  } else {
    unlockBtn.addEventListener('click', () => {
      unlockBtn.classList.add('hidden');
      pwForm.classList.remove('hidden');
      input.focus();
    });
    pwForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.textContent = '';
      try { await reveal(input.value); pwForm.classList.add('hidden'); }
      catch { errEl.textContent = 'WRONG CODE'; input.select(); }
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
  // counter
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
fillMarquee();
$$('.gate [data-split]').forEach(splitText);
initLenis();
initGate();
$('#lock-btn').addEventListener('click', () => location.reload());
