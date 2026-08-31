// BRACHY CALENDAR — page logic.
//
// The one idea that makes this a calendar page and not a generic one: it runs
// on the visitor's real date. The loader draws this actual month and stops on
// today; the hero calendar is rebuilt in the DOM (not a screenshot) so today's
// ring is genuinely today's; the audit section quotes the page's own live
// metrics, so every caption is verifiable on screen.
//
// Stage one is CSS only. The two WebGL moments (hero sheen, wallpaper
// displacement dissolve) wait on real app screenshots — see
// docs/superpowers/specs/2026-08-31-brachy-site-design.md §7. Their fallbacks
// are what you see now, and they stay when the shaders land.

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const REDUCED = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const pad2 = (n) => String(n).padStart(2, '0');

  // ---------- the date module — one place, read by everything ----------
  function thisMonth(now = new Date()) {
    const y = now.getFullYear();
    const m = now.getMonth();
    return {
      y, m,
      first: new Date(y, m, 1).getDay(),          // 0 = Sunday
      days: new Date(y, m + 1, 0).getDate(),      // handles February and leap years
      today: now.getDate(),
      month: now.toLocaleString('en-US', { month: 'long' }),
    };
  }
  const M = thisMonth();

  const ORDINAL = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // ---------- the calendar, built in the document ----------
  // A screenshot cannot honestly carry today's ring. This can.
  const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  function buildCalendar(small) {
    const cal = document.createElement('div');
    cal.className = small ? 'cal cal--sm' : 'cal';

    const head = document.createElement('div');
    head.className = 'cal-head';
    head.innerHTML = `<span>${M.month}</span><span>${M.y}</span>`;
    cal.appendChild(head);

    const dows = document.createElement('div');
    dows.className = 'cal-dows';
    DOW.forEach((d) => {
      const el = document.createElement('span');
      el.className = 'cal-dow';
      el.textContent = d;
      dows.appendChild(el);
    });
    cal.appendChild(dows);

    const grid = document.createElement('div');
    grid.className = 'cal-grid';
    for (let i = 0; i < M.first; i++) {
      const b = document.createElement('span');
      b.className = 'cal-day is-blank';
      b.textContent = '0';
      grid.appendChild(b);
    }
    for (let d = 1; d <= M.days; d++) {
      const col = (M.first + d - 1) % 7;
      const el = document.createElement('span');
      el.className = 'cal-day' + (col === 0 || col === 6 ? ' is-weekend' : '') +
        (d === M.today ? ' is-today' : '');
      el.textContent = pad2(d);
      grid.appendChild(el);
    }
    cal.appendChild(grid);
    return cal;
  }

  // ---------- 0. loader — this month draws itself, day by day ----------
  function runLoader() {
    const wrap = $('#loader');
    const grid = $('#loader-grid');
    const nEl = $('#loader-n');
    $('#loader-month').textContent = `${M.month} ${M.y}`;

    const cells = [];
    for (let i = 0; i < M.first; i++) {
      const b = document.createElement('span');
      b.className = 'loader-cell is-blank';
      grid.appendChild(b);
    }
    for (let d = 1; d <= M.days; d++) {
      const el = document.createElement('span');
      el.className = 'loader-cell';
      grid.appendChild(el);
      cells.push(el);
    }

    const finish = () => wrap.classList.add('is-done');
    if (REDUCED()) { nEl.textContent = pad2(M.today); finish(); return; }

    // Pace it so the loader reads the same on the 1st as on the 31st: the
    // per-day step stretches for short counts, and a floor keeps the whole
    // thing on screen long enough to be seen.
    const FLOOR = 1500;
    const step = Math.min(110, Math.max(26, 1400 / M.today));
    const t0 = performance.now();

    let d = 0;
    const tick = () => {
      d++;
      const cell = cells[d - 1];
      if (cell) {
        cell.classList.add('is-on');
        if (d === M.today) cell.classList.add('is-today');
      }
      nEl.textContent = pad2(d);
      if (d < M.today) {
        setTimeout(tick, step);
      } else {
        const held = performance.now() - t0;
        setTimeout(finish, Math.max(260, FLOOR - held));
      }
    };
    setTimeout(tick, 320);
  }

  // ---------- 3. the audit — the page magnifies its own grid ----------
  // Captions are written from the live computed values, so a caption cannot
  // drift away from what is actually rendered. Change --cell in the CSS and
  // the sentence changes with it.
  function buildAudit() {
    const box = $('#audit-steps');
    const cs = getComputedStyle(document.documentElement);
    const v = (name) => cs.getPropertyValue(name).trim();
    const cell = v('--cell');
    const gap = v('--cell-gap');
    const ring = v('--ring-w');
    const tint = Math.round(parseFloat(v('--weekend-tint')) * 100);

    // Each step names the part of the calendar it wants to look at; where that
    // part actually sits is measured off the mounted clone below, not guessed.
    const STEPS = [
      { zoom: 5.2, find: (c) => c.querySelector('.is-today'),
        // asked for --ring-w; the browser rounds it. Quote the painted value:
        // a caption in this section may not say a thing the screen contradicts.
        cap: `TODAY'S RING — <b>${ring}</b>, ALIGNED TO THE PIXEL GRID`,
        measured: (el) => `TODAY'S RING — <b>${getComputedStyle(el, '::after').borderTopWidth}</b>, ALIGNED TO THE PIXEL GRID` },
      { zoom: 3.4, find: (c) => [...c.querySelectorAll('.is-weekend')].slice(-2)[0],
        cap: `WEEKEND COLUMNS — TINTED <b>${tint}%</b>. NOT FIVE.` },
      { zoom: 4.0, find: (c) => c.querySelectorAll('.cal-day')[Math.floor(M.first + 10)],
        cap: `EVERY NUMERAL ON ONE BASELINE. <b>TABULAR</b>, ALWAYS.` },
      { zoom: 2.6, find: (c) => c.querySelector('.cal-grid'),
        cap: `CELL <b>${cell}</b> · GAP <b>${gap}</b> · NOTHING OFF THE GRID` },
    ];

    const mounted = [];
    STEPS.forEach((s) => {
      const step = document.createElement('div');
      step.className = 'audit-step';
      const frame = document.createElement('div');
      frame.className = 'audit-frame';
      const cal = buildCalendar(false);
      frame.appendChild(cal);
      const cap = document.createElement('p');
      cap.className = 'audit-cap';
      cap.innerHTML = s.cap;
      step.append(frame, cap);
      box.appendChild(step);
      mounted.push({ s, cal, cap });
    });

    // Centre each crop on its target. Scaling about the element's centre keeps
    // the centre fixed, so the target is first translated there — in the
    // element's own pre-scale coordinates, which is what a percentage
    // translate on the inside of the scale gives us.
    const place = () => {
      mounted.forEach(({ s, cal, cap }) => {
        const target = s.find(cal);
        if (!target) return;
        if (s.measured) cap.innerHTML = s.measured(target);
        cal.style.transform = 'none';   // measure untransformed, or a re-run compounds
        const c = cal.getBoundingClientRect();
        const t = target.getBoundingClientRect();
        if (!c.width || !c.height) return;
        const dx = 50 - ((t.left + t.width / 2 - c.left) / c.width) * 100;
        const dy = 50 - ((t.top + t.height / 2 - c.top) / c.height) * 100;
        cal.style.transform = `scale(${s.zoom}) translate(${dx}%, ${dy}%)`;
      });
    };
    requestAnimationFrame(place);
    addEventListener('resize', place);
    // web fonts change the metrics under us; re-measure once they are in
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);

    // The last step turns the audit on the page itself.
    const self = document.createElement('div');
    self.className = 'audit-step audit-step--self';
    const cap = document.createElement('p');
    cap.className = 'audit-cap';
    cap.innerHTML = `This page knows today is the ${ORDINAL(M.today)}.<br />So does the calendar.`;
    self.appendChild(cap);
    box.appendChild(self);
  }

  // ---------- scroll scrub — one rAF-throttled pass drives every section ----------
  function initScrub() {
    const hero = $('#hero');
    const wall = $('#plane-wall');
    const cal = $('#plane-cal');
    const win = $('#plane-win');
    const type = $('#hero-type');
    const tag = $('#hero-tag');
    const claim = $('#claim');
    const claimLines = [...document.querySelectorAll('[data-claim]')];
    const frames = [...document.querySelectorAll('.audit-frame')];
    const life = $('#life');
    const lifeB = $('#life-b');

    // progress of a tall section behind its sticky pin, 0 → 1
    const prog = (el) => {
      const r = el.getBoundingClientRect();
      const span = r.height - innerHeight;
      return span <= 0 ? 0 : clamp01(-r.top / span);
    };

    let lastY = scrollY;
    let vel = 0;
    let queued = false;

    function run() {
      queued = false;
      const vh = innerHeight;

      // scroll velocity, smoothed — feeds the claim's chromatic split
      const dy = scrollY - lastY;
      lastY = scrollY;
      vel += (Math.min(Math.abs(dy), 90) - vel) * 0.2;

      // 1. hero — three planes at three depths, the name pulling away
      const p = prog(hero);
      wall.style.transform = `translate3d(0, ${p * -40}px, 0) scale(1.06)`;
      cal.style.transform = `translate3d(0, ${p * -140}px, 0)`;
      win.style.transform = `translate3d(0, ${p * -260}px, 0)`;
      const t = clamp01(p / 0.55);
      type.style.transform = `scale(${1 + t * 0.5})`;
      type.style.opacity = String(1 - t);
      tag.style.opacity = String(clamp01(1 - (p - 0.22) / 0.18));

      // 2. the claim — lines arrive on their own windows; the split only
      //    shows while the page is actually moving, and settles to nothing.
      const cp = prog(claim);
      const split = (vel / 90) * 1.2;
      claimLines.forEach((el) => {
        const [a, b] = el.dataset.claim.split(' ').map(Number);
        const k = clamp01((cp - a) / (b - a));
        el.style.opacity = String(k);
        el.style.transform = `translateY(${(1 - k) * 0.16}em)`;
        el.style.textShadow = split > 0.05
          ? `${-split}px 0 rgba(255,0,80,0.28), ${split}px 0 rgba(0,220,255,0.28)`
          : 'none';
      });

      // 3. the audit — focus pull: each crop snaps sharp at centre screen
      frames.forEach((f) => {
        const r = f.getBoundingClientRect();
        const off = Math.abs((r.top + r.height / 2) - vh / 2) / (vh / 2);
        f.style.filter = `blur(${Math.min(off * off * 14, 14)}px)`;
      });

      // 4. life on the desktop — crossfade between wallpapers.
      //    This is the shader's fallback, and it stays when the shader lands.
      const lp = prog(life);
      lifeB.style.opacity = String(clamp01((lp - 0.3) / 0.4));

      // keep ticking only while the split is still decaying, so the page is
      // not running a rAF loop while it sits still
      if (vel > 0.05) request();
    }

    const request = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', request);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(request);
    run();
  }

  // ---------- custom cursor ----------
  function initCursor() {
    if (matchMedia('(hover: none)').matches) return;
    const dot = $('#cursor');
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
    (function follow() {
      cx += (x - cx) * 0.18;
      cy += (y - cy) * 0.18;
      dot.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(follow);
    })();
    document.addEventListener('pointerover', (e) => {
      dot.classList.toggle('is-wide', !!e.target.closest('a, button, input'));
    });
  }

  // ---------- 5. get — page public, files behind the app code ----------
  function initGet() {
    const app = ((window.DINO_DATA && window.DINO_DATA.apps) || [])
      .find((a) => a.id === 'brachy');
    const meta = $('#get-meta');
    const btn = $('#unlock-btn');
    const form = $('#pw-form');
    const input = $('#pw-input');
    const err = $('#pw-err');
    const files = $('#files');

    if (!app) { meta.textContent = 'UNAVAILABLE'; btn.classList.add('hidden'); return; }
    meta.textContent = `VERSION ${app.version || '—'} · ${(app.platforms || []).join(' · ').toUpperCase()}`;

    const render = (payload) => {
      const list = (payload && payload.files) || [];
      files.classList.remove('hidden');
      if (!list.length) { files.textContent = 'No download links.'; return; }
      list.forEach((f) => {
        const a = document.createElement('a');
        a.className = 'file-row';
        a.href = f.url;
        a.rel = 'noopener';
        a.innerHTML = `<span>↓ ${f.label}</span><span>${f.size || ''}</span>`;
        files.appendChild(a);
      });
    };

    if (app.lock !== 'own') {
      btn.textContent = '[ SHOW DOWNLOADS ]';
      btn.addEventListener('click', () => { btn.classList.add('hidden'); render({ files: app.files }); });
      return;
    }

    btn.addEventListener('click', () => {
      btn.classList.add('hidden');
      form.classList.remove('hidden');
      input.focus();
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      try {
        const payload = await decryptJSON(app.enc, input.value); // throws on a wrong code
        form.classList.add('hidden');
        render(payload);
      } catch {
        err.textContent = 'THAT CODE DOES NOT OPEN THIS.';
      }
    });
  }

  // ---------- start ----------
  function init() {
    $('#hero-cal').appendChild(buildCalendar(false));
    $('#life-cal').appendChild(buildCalendar(true));
    buildAudit();
    runLoader();
    initScrub();
    initCursor();
    initGet();

    if (!REDUCED() && typeof Lenis !== 'undefined') {
      // slower than the main site on purpose: this page is meant to be
      // walked through, not skimmed
      const lenis = new Lenis({ lerp: 0.075, smoothWheel: true });
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })();
    }
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init);
  else init();
})();
