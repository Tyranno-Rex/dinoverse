// BRACHY CALENDAR — page logic.
//
// The page runs on the visitor's real date, and the calendar it shows is the
// app's: the DOM below is Brachy's own markup (CalendarGrid.tsx, DayCell.tsx)
// and style.css carries Brachy's own stylesheet, in desktop mode. The loader
// draws this actual month and stops on today; the audit section quotes the
// computed style of the very element in the crop beside it.
//
// The month is also the manual: each of the app's features is dealt onto a
// random day, rendered the way the app renders it.
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

  // ---------- the feature tour ----------
  // Each entry is a real feature of the app (apps/brachy/docs/FEATURE_SPEC.md),
  // rendered the way the app renders it: a repeat is a repeat icon, a tag is a
  // tag dot, a colour is one of the ten Apple system colours the app ships.
  // They are dealt onto random days of this month, so the month IS the manual.
  const ICON = {
    repeat: '<svg class="day-event-repeat-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>',
    warn: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    sun: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.7"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/></svg>',
  };

  // apps/brachy/src/utils/colors.ts — Apple system colours, and its getColorLight
  const light = (hex) => `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, 0.15)`;

  const FEATURES = [
    { events: [{ t: 'Weekly standup', time: '09:30', repeat: true }],
      read: 'REPEATING EVENTS — DAILY, WEEKLY, MONTHLY, YEARLY. END ON A DATE OR AFTER N TIMES.' },
    { events: [{ t: 'Design review', time: '14:00', color: '#FF3B30' }],
      read: 'TEN APPLE SYSTEM COLOURS — AND A COLOURBLIND-SAFE PALETTE FOR ALL TEN.' },
    { events: [{ t: 'D-7 · Launch', color: '#FF2D55' }],
      read: 'D-DAY EVENTS. THE CELL AND THE SIDE PANEL BOTH COUNT DOWN.' },
    { events: [{ t: 'Client call', time: '11:00', tags: ['#34C759', '#AF52DE'] }],
      read: 'TAGS, WITH A FILTER BAR THAT DIMS THE REST OF THE MONTH.' },
    { events: [{ t: 'Renew domain', done: true }],
      read: 'TICK IT OFF. A REPEATING EVENT TRACKS COMPLETION PER OCCURRENCE.' },
    { sticker: '🎉', events: [{ t: 'Ship v1.2', time: '17:00', color: '#34C759' }],
      read: 'MOOD STICKERS — ONE PER DAY, RIGHT-CLICK ANY CELL. OR DECORATE FREELY.' },
    { overcommit: true, events: [{ t: 'All-hands', time: '10:00' }, { t: '+4 more', more: true }],
      read: 'OVERCOMMIT WARNING — THE DAY TELLS YOU IT IS TOO FULL BEFORE YOU FIND OUT.' },
    { events: [{ t: 'Dentist', time: '15:00', color: '#5856D6' }],
      read: 'REMINDERS FROM ON THE MINUTE TO A DAY AHEAD, AS A SYSTEM NOTIFICATION.' },
    { events: [{ t: 'Synced · Google', time: '08:00', color: '#8E8E93' }],
      read: 'GOOGLE CALENDAR, BOTH WAYS. OAUTH PKCE, TOKENS SEALED BY THE OS.' },
    { events: [{ t: 'Pomodoro ×4', color: '#FF9500' }],
      read: 'A POMODORO TIMER THAT LOGS ITS SESSIONS AGAINST THE DAY.' },
    { events: [{ t: 'Memo · passport', color: '#FFCC00' }],
      read: 'MEMO WINDOWS. PIN ONE AND IT STAYS ABOVE EVERYTHING ELSE.' },
    { events: [{ t: 'Deep work · 2h', time: '09:00', color: '#5AC8FA' }],
      read: 'TIME BLOCKING — DRAG A BLOCK ONTO A DAY AND THE HOURS ARE SPOKEN FOR.' },
    { weather: true, events: [{ t: 'Picnic', time: '12:00', color: '#34C759' }],
      read: 'WEATHER IN THE DAY HEADER, SO AN OUTDOOR PLAN KNOWS BEFORE YOU DO.' },
    { events: [{ t: 'Backup written', done: true }],
      read: 'AUTOMATIC BACKUP ON LAUNCH AND ON QUIT. EXPORT AND IMPORT ARE .ICS.' },
  ];
  const SPAN = { title: 'Sprint 12 · multi-day', read: 'MULTI-DAY EVENTS SPAN THE WEEK AS ONE BAR, NOT AS SEVEN COPIES.' };

  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Deal the features across this month's days. Today always draws one — it is
  // the cell the reader looks at first, and an empty one would waste it.
  function dealFeatures() {
    const pool = shuffle([...Array(M.days)].map((_, i) => i + 1).filter((d) => d !== M.today));
    const days = shuffle([M.today, ...pool.slice(0, FEATURES.length - 1)]);
    const byDay = new Map();
    FEATURES.forEach((f, i) => byDay.set(days[i], f));

    // The spanning bar needs a run of days inside one week row, so it is placed
    // on the grid rather than on a day.
    const weeks = Math.ceil((M.first + M.days) / 7);
    const len = 3 + Math.floor(Math.random() * 2);
    const span = {
      week: Math.floor(Math.random() * Math.max(1, weeks - 1)),
      col: Math.floor(Math.random() * (8 - len)),
      len,
    };
    return { byDay, span };
  }
  const DEAL = dealFeatures();

  // ---------- the calendar ----------
  // Not a drawing of the app: the app's own DOM and the app's own stylesheet,
  // in desktop mode (dark · blue · bg-only-opacity), filled with this month.
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const SPAN_H = 18, SPAN_GAP = 2, SPAN_TOP = 36;   // CalendarGrid.tsx

  function eventHTML(e) {
    // the app's overflow line is not an event; it does not get an event's pill
    if (e.more) return `<div class="day-event-more">${e.t}</div>`;
    const style = e.color ? ` style="--event-color:${e.color};--event-color-light:${light(e.color)}"` : '';
    return `<div class="day-event-row${e.done ? ' completed' : ''}">` +
      `<span class="day-event-title${e.done ? ' completed' : ''}${e.color ? ' has-color' : ''}"${style}>` +
        (e.repeat ? ICON.repeat : '') +
        (e.tags ? `<span class="day-event-tag-dots">${e.tags.map((c) => `<span class="day-event-tag-dot" style="background:${c}"></span>`).join('')}</span>` : '') +
        e.t +
      '</span>' +
      (e.time ? `<span class="day-event-time">${e.time}</span>` : '') +
      '</div>';
  }

  function buildCalendar(small) {
    const app = document.createElement('div');
    app.className = 'app dark blue bg-only-opacity' + (small ? ' calendar--sm' : '');

    const weeks = Math.ceil((M.first + M.days) / 7);
    let rows = '';
    for (let w = 0; w < weeks; w++) {
      let cells = '';
      for (let c = 0; c < 7; c++) {
        const d = w * 7 + c - M.first + 1;              // day number in this month
        const other = d < 1 || d > M.days;
        const shown = other ? new Date(M.y, M.m, d).getDate() : d;
        const f = other ? null : DEAL.byDay.get(d);
        const evs = f && !small ? f.events : (f ? f.events.slice(0, 1) : null);

        const cls = ['day-cell'];
        if (other) cls.push('other-month');
        if (c === 0) cls.push('sunday');
        if (c === 6) cls.push('saturday');
        if (!other && d === M.today) cls.push('today');

        const spanned = !small && w === DEAL.span.week &&
          c >= DEAL.span.col && c < DEAL.span.col + DEAL.span.len;

        cells += `<div class="${cls.join(' ')}"${f ? ` data-feat="1" data-read="${f.read}"` : ''}>` +
          '<div class="day-cell-content"><div class="day-cell-header">' +
            `<span class="day-number${!other && d === M.today ? ' today-badge' : ''}">${shown}</span>` +
            (f && f.overcommit ? `<span class="day-overcommit-badge">${ICON.warn}</span>` : '') +
            (f && f.weather ? ICON.sun : '') +
            (f && f.sticker ? `<span class="day-mood-sticker">${f.sticker}</span>` : '') +
          '</div>' +
          (spanned ? `<div class="day-spanning-spacer" style="height:${SPAN_H + SPAN_GAP}px"></div>` : '') +
          (evs ? `<div class="day-events-detail">${evs.map(eventHTML).join('')}</div>` : '') +
          '</div></div>';
      }

      // spanning bar — absolutely placed over the week's columns, app geometry:
      // SPANNING_TOP_OFFSET 36, height 18 (CalendarGrid.tsx)
      let bar = '';
      if (!small && w === DEAL.span.week) {
        const { col, len } = DEAL.span;
        bar = `<div class="spanning-bar start end" data-feat="1" data-read="${SPAN.read}" ` +
          `style="left:calc(${(col / 7) * 100}% + 4px);width:calc(${(len / 7) * 100}% - 8px);top:${SPAN_TOP}px;height:${SPAN_H}px">` +
          `<span class="spanning-bar-title">${SPAN.title}</span></div>`;
      }
      rows += `<div class="week-row">${bar}<div class="week-cells with-grid-lines">${cells}</div></div>`;
    }

    app.innerHTML =
      '<div class="calendar">' +
        '<div class="calendar-header">' +
          '<div class="nav-center">' +
            '<button class="nav-btn nav-arrow" tabindex="-1" aria-hidden="true">&lsaquo;</button>' +
            `<div class="month-year"><span class="month-text">${M.month}</span><span class="year-text">${M.y}</span></div>` +
            '<button class="nav-btn nav-arrow" tabindex="-1" aria-hidden="true">&rsaquo;</button>' +
          '</div>' +
          '<div class="header-right"><button class="today-btn" tabindex="-1" aria-hidden="true">Today</button></div>' +
        '</div>' +
        '<div class="calendar-grid">' +
          `<div class="weekday-row">${DOW.map((d, i) =>
            `<div class="weekday-cell${i === 0 ? ' sunday' : i === 6 ? ' saturday' : ''}">${d}</div>`).join('')}</div>` +
          `<div class="days-grid-container"><div class="days-grid with-grid-lines">${rows}</div></div>` +
        '</div>' +
      '</div>';
    return app;
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

  // ---------- 3. the audit — the page magnifies the app's own grid ----------
  // Every caption is written from the computed style of the element in the
  // crop beside it. A caption here cannot drift from what is on screen,
  // because it is read off the screen. Change the app's CSS and the sentence
  // changes with it.
  function buildAudit() {
    const box = $('#audit-steps');
    const STEPS = [
      { zoom: 6.0, find: (c) => c.querySelector('.day-cell.today .day-number'),
        cap: (el) => {
          // "rgb(10, 132, 255) 0px 0px 0px 1.5px inset" — the fourth length is the ring
          const w = (getComputedStyle(el).boxShadow.match(/-?[\d.]+px/g) || [])[3] || '—';
          return `TODAY'S RING — <b>${w}</b>, INSET. A SHADOW, NOT A BORDER: THE RING COSTS THE CELL NO LAYOUT.`;
        } },
      { zoom: 4.4, find: (c) => c.querySelectorAll('.day-cell:not(.other-month) .day-number')[9],
        cap: (el) => {
          const s = getComputedStyle(el);
          return `EVERY NUMERAL SITS IN THE SAME <b>${s.width} × ${s.height}</b> CIRCLE — SO NOTHING MOVES WHEN ONE OF THEM IS RINGED.`;
        } },
      { zoom: 4.8, find: (c) => c.querySelector('.day-event-title'),
        cap: (el) => {
          const s = getComputedStyle(el);
          return `THE EVENT PILL — RADIUS <b>${s.borderTopLeftRadius}</b>, PADDING <b>${s.paddingTop} ${s.paddingLeft}</b>, WEIGHT <b>${s.fontWeight}</b>.`;
        } },
      // A crop must show what its caption claims. This one is the multi-day
      // bar, because the reservation it forces on the cells below is a thing
      // you can see happening in the frame.
      { zoom: 2.4, find: (c) => c.querySelector('.spanning-bar'),
        cap: (el) => {
          const h = getComputedStyle(el).height;
          const cell = el.closest('.week-row').querySelector('.day-spanning-spacer');
          const gap = getComputedStyle(el.closest('.calendar').querySelector('.week-cells')).columnGap;
          return `THE MULTI-DAY BAR IS <b>${h}</b> TALL AND EVERY DAY IT CROSSES RESERVES <b>${cell ? getComputedStyle(cell).height : '—'}</b>. IT NEVER LANDS ON A WORD. GRID LINES ARE <b>${gap}</b> OF GAP, NOT BORDERS — SO NO TWO CAN DOUBLE UP.`;
        } },
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
        cap.innerHTML = s.cap(target);
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

  // ---------- the feature tour readout ----------
  // The days are the menu; this line is the label. Point at a day that carries
  // a feature and it says which one.
  function initFeatureTour() {
    const out = $('#feat-read');
    const cal = $('#plane-cal');
    const base = `POINT AT A DAY — <b>${FEATURES.length + 1}</b> FEATURES ARE LIVING IN THIS MONTH`;
    out.innerHTML = base;
    cal.addEventListener('pointerover', (e) => {
      const hit = e.target.closest('[data-read]');
      out.innerHTML = hit ? hit.dataset.read : base;
    });
    cal.addEventListener('pointerleave', () => { out.innerHTML = base; });
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
    $('#plane-cal').appendChild(buildCalendar(false));
    $('#life-cal').appendChild(buildCalendar(true));
    buildAudit();
    initFeatureTour();
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
