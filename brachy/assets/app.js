// BRACHY CALENDAR — page logic.
//
// Two screens, and the second one is the argument.
//
//   1. HERO   — the desktop calendar this app was built on, rebuilt in DOM on
//               the visitor's real month. It writes three appointments the only
//               way it can, comes apart at its own seams, and ours rises in its
//               place, full screen, the way it sits on a desktop.
//   2. VERSUS — the same seven parts of each, held against each other. Typeface,
//               header, weekday row, date, appointment, run of days, the window
//               you write in.
//
// Nothing here is a drawing of either product. The right-hand side is Brachy's
// own markup (CalendarGrid.tsx, DayCell.tsx, EventPopup.tsx) under Brachy's own
// stylesheet, in desktop mode; the left is the reference rebuilt from its own
// measurements. Every spec line in section 2 is read off the screen with
// getComputedStyle, so no caption can drift from what is in the frame above it.
//
// The page runs on the visitor's real date throughout — the loader draws this
// actual month and stops on today, and section 2 closes by saying so.
//
// Stage one is CSS only. The two WebGL moments (hero sheen, wallpaper
// displacement dissolve) wait on real app screenshots — see
// docs/superpowers/specs/2026-08-31-brachy-site-design.md §7. Their fallbacks
// are what you see now, and they stay when the shaders land.

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const REDUCED = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // A reload has to start where the page starts. The first screen plays itself
  // and settles the moment the reader leaves it, so a browser restoring the
  // last scroll position drops you into a sequence that is already over.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
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

  // Every entry is a real feature of the app, and what it puts on the grid is
  // what the app would put there — a repeat icon, a tag dot, one of the ten
  // Apple system colours it ships. docs/spec/FEATURE_MATRIX.md (mesozoic) is
  // the code-checked reference; where it and this page disagreed, this page
  // was wrong.
  //
  // The month is dressed with these so that section 2 has a real month to take
  // apart. Which of them are paid is not asserted here — the composer in
  // section 2 shows the app's own icon row, and the product has already drawn
  // that line itself.
  const FEATURES = [
    { events: [{ t: 'Weekly standup', time: '09:30', repeat: true }],
      name: 'Repeating events' },

    { events: [{ t: 'Design review', time: '14:00', color: '#FF3B30' }],
      name: 'Ten event colours' },

    { events: [{ t: 'Launch', dday: 'D-7', color: '#FF2D55' }],
      name: 'D-day countdown' },

    { events: [{ t: 'Client call', time: '11:00', tags: ['#34C759', '#AF52DE'] }],
      name: 'Tags, and a filter that dims' },

    { events: [{ t: 'Renew domain', done: true }],
      name: 'Completion' },

    { sticker: '🎉',
      events: [{ t: 'Ship v1.2', time: '17:00', color: '#34C759' }],
      name: 'Mood stickers' },

    { overcommit: true,
      events: [{ t: 'All-hands', time: '10:00' }, { t: '+4 more', more: true }],
      name: 'Overcommit warning' },

    { events: [{ t: 'Dentist', time: '15:00', color: '#5856D6', remind: '15 min before' }],
      name: 'Reminders, and snooze' },

    { events: [{ t: 'Synced · Google', time: '08:00', color: '#8E8E93' }],
      name: 'Google Calendar, CalDAV, iCal feeds' },

    { events: [{ t: 'Pomodoro ×4', color: '#FF9500' }],
      name: 'Pomodoro timer' },

    { events: [{ t: 'Memo · passport', color: '#FFCC00' }],
      name: 'Memo windows' },

    { events: [{ t: 'Focus · 2h', time: '09:00', color: '#5AC8FA' }],
      name: 'Focus-time suggestions' },

    { weather: true,
      events: [{ t: 'Picnic', time: '12:00', color: '#34C759' }],
      name: 'Weather in the day' },

    { events: [{ t: 'Backup written', done: true }],
      name: 'Backup, import, export' },

    { events: [{ t: 'Planner · 8 blocks', time: '08:00', color: '#007AFF' }],
      name: 'The daily planner' },

    { events: [{ t: 'Lunch w/ sam fri 1pm', time: '13:00' }],
      name: 'QuickAdd, on the device' },

    { events: [{ t: 'Interview', time: '16:00', buffer: '10 min either side', color: '#AF52DE' }],
      name: 'Conflicts and buffer time' },
  ];

  const SPAN = { title: 'Sprint 12 · multi-day' };

  // apps/brachy/src/utils/colors.ts — the ten Apple system colours it ships
  const PALETTE = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA',
                   '#0A84FF', '#5856D6', '#AF52DE', '#FF2D55', '#8E8E93'];


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
    // on the grid rather than on a day. Its length is fixed: section 2 crops
    // both calendars on this run and says how many days it is, and a length
    // that changed per load would make that sentence right only some of the
    // time. Where it falls is still this month's business.
    const weeks = Math.ceil((M.first + M.days) / 7);
    const len = 3;
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

  // A day number of this month, named. Out-of-range numbers roll into the
  // neighbouring month on their own, which is exactly what the grid does.
  const dateLabel = (d) =>
    new Date(M.y, M.m, d).toLocaleString('en-US', { month: 'long', day: 'numeric' });

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

  function buildCalendar() {
    const app = document.createElement('div');
    app.className = 'app dark blue bg-only-opacity';

    const weeks = Math.ceil((M.first + M.days) / 7);
    let rows = '';
    for (let w = 0; w < weeks; w++) {
      let cells = '';
      for (let c = 0; c < 7; c++) {
        const d = w * 7 + c - M.first + 1;              // day number in this month
        const other = d < 1 || d > M.days;
        const shown = other ? new Date(M.y, M.m, d).getDate() : d;
        const f = other ? null : DEAL.byDay.get(d);
        const evs = f ? f.events : null;

        const cls = ['day-cell'];
        if (other) cls.push('other-month');
        if (c === 0) cls.push('sunday');
        if (c === 6) cls.push('saturday');
        if (!other && d === M.today) cls.push('today');

        const spanned = w === DEAL.span.week &&
          c >= DEAL.span.col && c < DEAL.span.col + DEAL.span.len;

        cells += `<div class="${cls.join(' ')}">` +
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
      if (w === DEAL.span.week) {
        const { col, len } = DEAL.span;
        bar = '<div class="spanning-bar start end" ' +
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

  // ---------- 1a. where this started ----------
  // The desktop calendar this app was built on, rebuilt in DOM rather than
  // screenshotted — so it can come apart at its own seams, and so it can run
  // on the SAME month as ours. The two are then the same subject drawn twice.
  //
  // Nothing here is exaggerated to make a point: an empty grid with one plain
  // white note open on it is what the reference actually shows. The original
  // product is not named. Where this started is the claim; whose it was is
  // not the page's business.
  const OLD_DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // ISO week number, off the week's Thursday — which alone fixes the week.
  function isoWeek(date) {
    const t = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    const jan1 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - jan1) / 86400000 + 1) / 7);
  }

  // Only fixed-date holidays, so the label is never a guess about the
  // visitor's own calendar. Most months show none, which is correct.
  const OLD_HOL = { '11-24': 'Christmas Eve', '11-25': 'Christmas', '11-31': "New Year's Eve", '0-1': 'New Year' };

  // The three appointments, and what the old format cannot hold about each.
  // The hero types them; section 2 shows one of them again, next to the pill
  // that replaced it. Both read from here, so the two screens cannot drift.
  const SCRIPT = [
    { text: 'Design review 2pm',
      loses: 'The 2pm is a word, not a time. Nothing will ring.' },
    { text: 'Client call - jamie',
      loses: 'No tag and no colour, so the project has to go inside the sentence.' },
    { text: 'Standup 9:30 every mon',
      loses: 'No repeat. You will type this again next Monday, and the one after that.' },
  ];

  // Fills `root` — the hero owns one of these, and section 2 builds one per
  // comparison so that each crop is of a live calendar rather than a picture.
  function buildOldCalendar(root) {
    const weeks = Math.ceil((M.first + M.days) / 7);
    const long = new Date(M.y, M.m, M.today).toLocaleString('en-US', { weekday: 'long' });

    let gutter = '';
    let cells = '';
    for (let w = 0; w < weeks; w++) {
      gutter += `<div class="oldcal-week">${isoWeek(new Date(M.y, M.m, w * 7 + 4 - M.first + 1))}</div>`;
      for (let c = 0; c < 7; c++) {
        const d = w * 7 + c - M.first + 1;
        const other = d < 1 || d > M.days;
        const date = new Date(M.y, M.m, d);
        const hol = OLD_HOL[`${date.getMonth()}-${date.getDate()}`];
        // data-d marks the days of this month — the ones the demo writes on
        cells += `<div class="old-cell${other ? ' is-other' : ''}${!other && d === M.today ? ' is-today' : ''}"` +
          `${other ? '' : ` data-d="${d}"`}>` +
          `${date.getDate()}${hol ? `<span class="old-hol">${hol}</span>` : ''}</div>`;
      }
    }

    root.innerHTML =
      `<div class="oldcal-title">${M.month}, ${M.y}` +
        `<span class="oldcal-title-long"> / Today is ${M.month} ${M.today}, ${M.y} ${long}</span>` +
        '<span class="oldcal-btns"><span>☁</span><span>▤</span><span>←</span><span>→</span><span>❐</span><span>⌄</span></span>' +
      '</div>' +
      '<div class="oldcal-dow"><span></span>' +
        OLD_DOW.map((d) => `<span><i>${d}</i><em>${d.slice(0, 3)}</em></span>`).join('') +
      '</div>' +
      `<div class="oldcal-body"><div class="oldcal-weeks">${gutter}</div>` +
        `<div class="oldcal-grid">${cells}</div></div>`;
  }

  // Where a note can stand: the middle columns of the second and third weeks.
  // The card hangs off the day it was opened on, so where it can be opened is
  // decided by where it will then be standing — clear of the copy plate on the
  // left and of ours on the right. Those two rows are in this month whatever
  // weekday it starts on, so there is always somewhere to write.
  function oldNoteCells(root) {
    const room = [...root.querySelectorAll('.old-cell')].filter((el, i) => {
      const row = Math.floor(i / 7), col = i % 7;
      return col >= 3 && col <= 4 && row >= 1 && row <= 2 && el.dataset.d;
    });
    return [0.16, 0.5, 0.84].map((f) => room[Math.round((room.length - 1) * f)]);
  }

  // what a saved note leaves on the day: the text, and nothing else
  function jotInto(cell, text) {
    if (!cell || cell.querySelector('.old-jot')) return;
    const el = document.createElement('span');
    el.className = 'old-jot';
    el.textContent = text;
    cell.appendChild(el);
  }

  // Every piece that can fall. The grid lines are the cells' own borders, so
  // when the cells go the grid goes with them — it comes apart where it was
  // joined, not along invented cracks.
  function collectShards() {
    const root = $('#oldcal');
    const bin = $('#bin');
    const list = [...root.querySelectorAll('.old-cell, .oldcal-week, .oldcal-dow span, .oldcal-title'), $('#old-note')]
      .filter(Boolean)
      .map((el) => ({
        el,
        rot: (Math.random() * 2 - 1) * 110,
        hop: 0.4 + Math.random() * 0.9,
        // the note goes last: it is the thing the section is about
        delay: el.id === 'old-note' ? 0.42 : Math.random() * 0.36,
        dx: 0, dy: 0,
      }));

    const measure = () => {
      const b = bin.getBoundingClientRect();
      const bx = b.left + b.width / 2, by = b.top + b.height / 2;
      list.forEach((s) => {
        s.el.style.transform = 'none';
        const r = s.el.getBoundingClientRect();
        s.dx = bx - (r.left + r.width / 2);
        s.dy = by - (r.top + r.height / 2);
      });
    };
    return { list, measure };
  }

  // ---------- 1b. three appointments, written twice ----------
  // This plays where the page opens, with no scroll asked for: the same three
  // appointments entered the way the old calendar makes you — one
  // double-click, one window and one line of plain text per day — and then
  // the same three, ours, in one panel.
  //
  // The pills at the end are FEATURES' own entries put through the app's own
  // eventHTML, so the right-hand side is the product rather than a picture of
  // it. The left side types the same information in the only format that grid
  // can hold. Nothing is invented to make the point, and what the old way
  // costs is counted rather than asserted — windows opened, keys pressed.
  function initOldDemo() {
    const stage = $('#before-stage');
    const note = $('#old-note');
    const noteText = $('#old-note-text');
    const noteDate = $('#old-note-date');
    const noteX = note.querySelector('.old-note-x');
    const ptr = $('#demo-ptr');
    const step = $('#demo-step');
    const tallyEl = $('#demo-tally');
    const nw = $('#newway');

    // the three the app draws for those same three appointments
    const OURS = ['Ten event colours', 'Tags, and a filter that dims', 'Repeating events']
      .map((n) => FEATURES.find((f) => f.name === n))
      .filter(Boolean)
      .map((f) => f.events[0]);

    // the three days it writes on — the same rule section 2 uses, so both
    // screens write in the same places
    const PICK = oldNoteCells($('#oldcal'));

    const api = { done: false, onSettle: null, isDone: () => api.done };
    let stopped = false;
    const HALT = {};
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))
      .then(() => { if (stopped) throw HALT; });

    let windows = 0, keys = 0, ours = false;
    const tally = () => {
      tallyEl.innerHTML =
        `<b>OLD</b><span>${windows} WINDOW${windows === 1 ? '' : 'S'} · ` +
          `<span class="k">${keys}</span> KEYSTROKES · 0 FIELDS</span>` +
        `<b>OURS</b><span class="is-ours">${ours
          ? '1 PANEL · COLOUR · TIME · TAG · REPEAT · REMINDER'
          : '—'}</span>`;
    };

    // the card hangs off its day, and flips above it rather than run off the
    // bottom of the stage
    const place = (cell) => {
      const s = stage.getBoundingClientRect();
      const c = cell.getBoundingClientRect();
      const w = note.offsetWidth, h = note.offsetHeight;
      const below = c.bottom - s.top;
      const y = below + h > s.height ? c.top - s.top - h : below;
      note.style.left = `${Math.max(0, Math.min(c.left - s.left - 2, s.width - w - 2))}px`;
      note.style.top = `${Math.max(0, y)}px`;
    };
    // left/top rather than a transform, so the two axes can carry different
    // easings and the travel comes out as an arc (see .demo-ptr)
    const pointAt = (el, fx = 0.5, fy = 0.5) => {
      const s = stage.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      ptr.style.left = `${r.left - s.left + r.width * fx}px`;
      ptr.style.top = `${r.top - s.top + r.height * fy}px`;
    };
    const click = () => {
      ptr.classList.remove('is-click');
      void ptr.offsetWidth;                    // restart the ring
      ptr.classList.add('is-click', 'is-press');
      setTimeout(() => ptr.classList.remove('is-press'), 130);
    };
    // Saving does not delete a window and create a line somewhere else. The
    // window goes into the day, and the line is what is left of it — so the
    // card is aimed at the cell and shrunk to nothing on the way there.
    const collapseInto = (cell) => {
      const n = note.getBoundingClientRect();
      const c = cell.getBoundingClientRect();
      note.classList.add('is-collapsing');
      note.style.transform =
        `translate(${c.left + 12 - (n.left + n.width / 2)}px, ` +
        `${c.top + 16 - (n.top + n.height / 2)}px) scale(0.04)`;
      note.style.opacity = '0';
    };
    const resetNote = () => {
      note.classList.remove('is-collapsing', 'is-open');
      note.style.transform = '';
      note.style.opacity = '';
    };

    const oursHTML = () =>
      '<p class="newway-head">THE SAME THREE, HERE</p>' +
      '<div class="app dark blue bg-only-opacity">' +
        `<div class="day-events-detail">${OURS.map(eventHTML).join('')}</div>` +
      '</div>' +
      '<p class="newway-foot">ONE PANEL · FIVE FIELDS · NO RETYPING</p>';

    // A line from the grey line on the day to the pill standing in for it. It
    // stops at the card's edge rather than at the pill, because it runs under
    // the card. Measured when it is drawn; a resize after that leaves it
    // stale, and the shatter clears it a moment later either way.
    const link = $('#demo-link');
    const NS = 'http://www.w3.org/2000/svg';
    const linkTo = (i) => {
      const src = PICK[i].querySelector('.old-jot');
      const pill = nw.querySelectorAll('.day-event-row')[i];
      if (!src || !pill) return;
      const s = stage.getBoundingClientRect();
      // the end of the words, not the end of the cell they sit in: the jot is
      // a block and fills its day, so its box says nothing about the text
      const range = document.createRange();
      range.selectNodeContents(src);
      const a = range.getBoundingClientRect();
      const card = nw.getBoundingClientRect();
      const b = pill.getBoundingClientRect();

      // The card is beside the day on a wide screen and above it on a narrow
      // one, so the line leaves and arrives on whichever axis separates them.
      let x1, y1, x2, y2, c1, c2;
      if (card.bottom < a.top || card.top > a.bottom) {
        const up = card.bottom < a.top;
        x1 = a.left + a.width / 2 - s.left;
        y1 = (up ? a.top - 2 : a.bottom + 2) - s.top;
        x2 = b.left + b.width / 2 - s.left;
        y2 = (up ? card.bottom + 5 : card.top - 5) - s.top;
        const my = (y1 + y2) / 2;
        c1 = `${x1} ${my}`;
        c2 = `${x2} ${my}`;
      } else {
        const right = card.left > a.right;
        x1 = (right ? a.right + 3 : a.left - 3) - s.left;
        y1 = a.top + a.height / 2 - s.top;
        x2 = (right ? card.left - 5 : card.right + 5) - s.left;
        y2 = b.top + b.height / 2 - s.top;
        const mx = (x1 + x2) / 2;
        c1 = `${mx} ${y1}`;
        c2 = `${mx} ${y2}`;
      }
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', `M${x1} ${y1} C${c1}, ${c2}, ${x2} ${y2}`);
      link.appendChild(path);
      path.style.setProperty('--len', path.getTotalLength());
      src.classList.add('is-linked');
      requestAnimationFrame(() => path.classList.add('is-in'));
    };

    const actTwo = () => {
      ptr.classList.remove('is-on');      // the old way's hand is done here
      $('#before-eyebrow').textContent = 'AND THE SAME THREE, OURS';
      $('#before-title').innerHTML = 'One panel.<br />Once.';
      // the second sentence is dropped on a phone: down there the plate has to
      // stay short enough that the card standing open on the grid clears it
      step.innerHTML = 'Colour, time, tag, repeat, reminder — fields, not words. ' +
        '<span class="on-wide">Nothing about an appointment has to be spelled ' +
        'into its own name.</span>';
      ours = true;
      tally();
      nw.innerHTML = oursHTML();
      nw.classList.add('is-open');
    };

    // The end state, reachable from anywhere: whether the demo finished or the
    // reader scrolled straight through it, the stage is left in one settled
    // shape — three days written on, the last card still open. That shape is
    // what the shatter takes apart, and the shard travel is measured off it.
    const settle = () => {
      if (api.done) return;
      api.done = true;
      stopped = true;
      ptr.classList.remove('is-on', 'is-click');
      SCRIPT.forEach((sc, i) => jotInto(PICK[i], sc.text));
      // the count has to describe what is on the grid, not how far the demo
      // happened to get before the reader scrolled out of it
      windows = SCRIPT.length;
      keys = SCRIPT.reduce((n, sc) => n + sc.text.length, 0);
      tally();
      noteDate.textContent = `${M.month} ${PICK[2].dataset.d}, ${M.y}`;
      noteText.textContent = SCRIPT[2].text;
      note.classList.remove('is-typing', 'is-collapsing');
      note.style.transform = '';
      note.style.opacity = '';
      place(PICK[2]);
      note.classList.add('is-open');
      note.style.transition = 'none';    // from here its transform is the scrub's
      if (api.onSettle) api.onSettle();
    };
    api.settle = settle;

    const type = async (text) => {
      for (let i = 1; i <= text.length; i++) {
        noteText.textContent = text.slice(0, i);
        keys++;
        tally();
        await wait(text[i - 1] === ' ' ? 92 : 50);
      }
    };

    async function play() {
      await wait(560);
      for (let i = 0; i < SCRIPT.length; i++) {
        const cell = PICK[i];
        step.textContent = i === 0
          ? 'Double-click the day. A window opens — one window, one day.'
          : 'Next day. Next window. Nothing carries over.';
        pointAt(cell, 0.5, 0.35);
        ptr.classList.add('is-on');
        await wait(640);
        click();
        await wait(170);
        click();                              // it is a double-click
        await wait(230);
        windows++;
        tally();
        noteDate.textContent = `${M.month} ${cell.dataset.d}, ${M.y}`;
        noteText.textContent = '';
        place(cell);
        note.classList.add('is-open', 'is-typing');
        await wait(320);
        pointAt(note, 0.16, 0.42);
        await type(SCRIPT[i].text);
        note.classList.remove('is-typing');
        step.textContent = SCRIPT[i].loses;
        await wait(1500);
        jotInto(cell, SCRIPT[i].text);
        // the last one is left standing open on its day — it is the thing this
        // whole screen is about, and the shatter drops it last
        if (i < SCRIPT.length - 1) {
          pointAt(noteX);
          await wait(440);
          click();
          collapseInto(cell);
          await wait(460);
          resetNote();
          await wait(300);
        }
      }

      actTwo();
      await wait(320);
      // each old line is answered one at a time: the line is drawn, then the
      // thing on the other end of it arrives
      const rows = [...nw.querySelectorAll('.day-event-row')];
      for (let i = 0; i < rows.length; i++) {
        linkTo(i);
        await wait(230);
        rows[i].classList.add('is-in');
        await wait(280);
      }
      await wait(1100);
      settle();
    }

    api.start = () => {
      if (REDUCED()) {
        // nothing plays: the end state is drawn at once
        actTwo();
        nw.querySelectorAll('.day-event-row').forEach((r) => r.classList.add('is-in'));
        settle();
        SCRIPT.forEach((_, i) => linkTo(i));
        return;
      }
      play().catch((e) => { if (e !== HALT) throw e; });
    };
    tally();
    return api;
  }

  // ---------- 0. loader — this month draws itself, day by day ----------
  function runLoader(onDone) {
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

    // the demo owns the screen from here; it is what the reader sees first
    const finish = () => { wrap.classList.add('is-done'); onDone(); };
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

  // ---------- 2. one part at a time ----------
  // The hero shows two calendars. This section takes them apart and holds the
  // same part of each up against the other.
  //
  // Both sides are live DOM. The left is the reference rebuilt from its own
  // measurements; the right is the app's own markup under the app's own
  // stylesheet. Every spec line is written from the computed style of the
  // element in the frame above it, so a line here cannot drift from what is on
  // screen — change the app's CSS and the sentence changes with it. Nothing is
  // typed in by hand that the browser can be asked for.
  //
  // The rule the whole section is held to: A CROP MAY NOT CLAIM WHAT IT DOES
  // NOT SHOW. Where the reference simply has no equivalent, the crop is of the
  // same days with nothing on them — the absence is the thing being shown, and
  // it is in frame.

  // The family the browser actually rendered in — not the first name in the
  // stack it was offered.
  //
  // getComputedStyle returns the whole stack verbatim, so reading its first
  // entry names a font that may not exist here: the app's stack opens with
  // -apple-system, and on Windows the face on screen is Segoe UI. A section
  // about typography cannot print the name of a font it is not showing.
  //
  // There is no API for "which face won", so it is measured: a family the
  // browser does not have falls through to whatever generic follows it, and
  // then two different generics give the same width. The first candidate that
  // moves either measurement is the one being drawn.
  const CANVAS = document.createElement('canvas').getContext('2d');
  const widthIn = (stack) => {
    CANVAS.font = `72px ${stack}`;
    return CANVAS.measureText('mmmwwwiii0123 Wednesday').width;
  };
  const RESOLVED = new Map();
  const resolves = (fam) => {
    if (!RESOLVED.has(fam)) {
      const q = /^[a-z-]+$/i.test(fam) ? fam : `"${fam}"`;   // generics unquoted
      RESOLVED.set(fam,
        widthIn(`${q}, monospace`) !== widthIn('monospace') ||
        widthIn(`${q}, serif`) !== widthIn('serif'));
    }
    return RESOLVED.get(fam);
  };
  const famOf = (el) => {
    const stack = getComputedStyle(el).fontFamily
      .split(',').map((f) => f.replace(/["']/g, '').trim()).filter(Boolean);
    return (stack.find(resolves) || stack[stack.length - 1] || '—').toUpperCase();
  };
  // rgb(79, 195, 247) -> #4FC3F7, so the line prints what the app's CSS says
  const hexOf = (el, prop) => {
    const n = (getComputedStyle(el)[prop] || '').match(/\d+/g);
    return n ? `#${n.slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join('').toUpperCase()}` : '—';
  };
  // "rgb(10, 132, 255) 0px 0px 0px 1.5px inset" — the fourth length is the ring
  const ringOf = (el) => (getComputedStyle(el).boxShadow.match(/-?[\d.]+px/g) || [])[3] || '—';

  // The old calendar's window, as the hero's demo leaves it: a white card with
  // one free-text body. Markup and values are the reference's own.
  const OLD_WINDOW = () =>
    '<div class="old-note is-open">' +
      `<div class="old-note-bar"><span>${M.month} ${M.today}, ${M.y}</span><span class="old-note-x">×</span></div>` +
      `<div class="old-note-body">${SCRIPT[0].text}</div>` +
      '<div class="old-note-foot"><span>◍</span><span>◢</span></div>' +
    '</div>';

  // The app's EventPopup. Its icon row is split into two groups by the app
  // itself — the free fields, a divider, then the ones that carry a PRO badge.
  // That division is the product's, not ours, so the page shows it rather than
  // describing it.
  const OUR_WINDOW = () =>
    '<div class="app dark blue event-modal-popup">' +
      '<div class="popup-header"><span class="popup-title">New event</span><span class="popup-close">×</span></div>' +
      '<div class="popup-content">' +
        '<div class="popup-field">' +
          `<span class="popup-label">${dateLabel(M.today)}</span>` +
          '<span class="popup-input">Design review</span>' +
        '</div>' +
        '<div class="popup-field"><span class="popup-label">Time</span>' +
          '<span class="popup-input">14:00</span></div>' +
        '<div class="icon-row">' +
          '<div class="icon-group">' +
            '<span class="icon-btn-wrapper"><span class="icon-btn">↻</span><span class="icon-btn-label">Repeat</span></span>' +
            '<span class="icon-btn-wrapper"><span class="icon-btn">◔</span><span class="icon-btn-label">Remind</span></span>' +
            '<span class="icon-btn-wrapper"><span class="icon-btn">◷</span><span class="icon-btn-label">Buffer</span></span>' +
            '<span class="icon-btn-wrapper"><span class="icon-btn">D</span><span class="icon-btn-label">D-Day</span></span>' +
          '</div>' +
          '<span class="icon-row-divider"></span>' +
          '<div class="icon-group">' +
            '<span class="icon-btn-wrapper premium"><span class="icon-btn active">◉<span class="icon-btn-pro-badge">PRO</span></span><span class="icon-btn-label">Colour</span></span>' +
            '<span class="icon-btn-wrapper premium"><span class="icon-btn">#<span class="icon-btn-pro-badge">PRO</span></span><span class="icon-btn-label">Tag</span></span>' +
            '<span class="icon-btn-wrapper premium"><span class="icon-btn">▤<span class="icon-btn-pro-badge">PRO</span></span><span class="icon-btn-label">Template</span></span>' +
            '<span class="icon-btn-wrapper premium"><span class="icon-btn">G<span class="icon-btn-pro-badge">PRO</span></span><span class="icon-btn-label">Google</span></span>' +
          '</div>' +
        '</div>' +
        `<div class="colour-drop is-open">${PALETTE.map((c) =>
          `<span class="compose-swatch${c === '#FF3B30' ? ' is-on' : ''}" style="background:${c};color:${c}"></span>`).join('')}</div>` +
      '</div>' +
      '<div class="popup-footer"><span class="popup-save">Save</span></div>' +
    '</div>';

  function buildVersus() {
    const box = $('#versus-steps');

    // A live reference calendar, written on the way the hero leaves it: the
    // same three appointments, in the only format that grid can hold.
    const oldStage = () => {
      const stage = document.createElement('div');
      stage.className = 'vs-cal';
      const cal = document.createElement('div');
      cal.className = 'oldcal';
      stage.appendChild(cal);
      buildOldCalendar(cal);
      const cells = oldNoteCells(cal);
      SCRIPT.forEach((s, i) => jotInto(cells[i], s.text));
      return stage;
    };

    // The run of days the multi-day bar covers, so step 6 crops the SAME days
    // on both sides. The left crop is centred on the run's middle by taking the
    // run's FIRST cell and walking half a run to the right — every cell in a
    // week is the same width, so len/2 cell-widths lands exactly where the bar
    // is centred on the other side, whether the run is odd or even.
    const runStart = DEAL.span.week * 7 + DEAL.span.col;
    const RUN = DEAL.span.len;

    const STEPS = [
      {
        title: 'The typeface',
        kind: 'type',
        // Two live components per side; the specimen is then set in whatever
        // family each of them actually resolved to.
        old: {
          probe: (s) => [s.querySelector('.oldcal-title'), s.querySelector('.old-cell')],
          words: ['November', '24'],
        },
        ours: {
          probe: (s) => [s.querySelector('.month-year span'), s.querySelector('.day-number')],
          words: ['November', '24'],
        },
        note: 'Two families inside one grid — a serif for the labels, a sans for the numbers ' +
          'you actually read. Ours sets the whole month in one, so nothing on it is spoken in ' +
          'a voice the rest of it does not use.',
      },
      {
        title: 'The month’s name',
        span: 200,
        // Both lines count characters, because the length of each title is the
        // thing the two frames actually show. "centred" would be true of the
        // left one and unshowable — the crop runs off both its edges.
        old: {
          find: (s) => s.querySelector('.oldcal-title'),
          spec: (el) => {
            const c = getComputedStyle(el);
            // the glyph buttons live in this element too; they are not title
            const words = [...el.childNodes]
              .filter((n) => !(n.classList && n.classList.contains('oldcal-btns')))
              .map((n) => n.textContent).join('').trim();
            return `<b>${famOf(el)}</b> ${c.fontSize} · <b>${words.length} CHARACTERS</b> — ` +
              'THE MONTH, THE YEAR, AND THEN THE WHOLE OF TODAY’S DATE AGAIN';
          },
        },
        ours: {
          find: (s) => s.querySelector('.month-year'),
          spec: (el) => {
            const t = el.querySelector('span');
            const arrow = el.parentNode.querySelector('.nav-arrow');
            return `<b>${famOf(t)}</b> ${getComputedStyle(t).fontSize} · ` +
              `<b>${el.textContent.trim().length} CHARACTERS</b> — THE MONTH AND THE YEAR · ` +
              `THE TWO ARROWS BESIDE IT ARE ${hexOf(arrow, 'color')}`;
          },
        },
        note: 'A serif, and a sentence: the month, the year, and then today’s full date welded ' +
          'on after a slash. Ours puts the month and the year in the same stack as the days, ' +
          'and the only things standing next to them are the two arrows that move them.',
      },
      {
        title: 'The weekend',
        span: 164,
        // Both lines name the label AND the date sitting under it, because both
        // of them are inside the crop. "the same as every other weekday" would
        // be true and unshowable — the frame holds one column.
        old: {
          find: (s) => s.querySelectorAll('.oldcal-dow span')[7],
          spec: (el, s) => {
            const c = getComputedStyle(el);
            const num = s.querySelectorAll('.old-cell')[6];
            return `<b>${famOf(el)}</b> ${c.fontSize} · LABEL ${hexOf(el, 'color')}, ` +
              `THE DATE UNDER IT ${num ? hexOf(num, 'color') : '—'} — NOTHING MARKS THE COLUMN`;
          },
        },
        ours: {
          find: (s) => s.querySelector('.weekday-cell.saturday'),
          spec: (el, s) => {
            const c = getComputedStyle(el);
            const num = s.querySelector('.day-cell.saturday:not(.other-month) .day-number');
            return `<b>${famOf(el)}</b> ${c.fontSize} · TRACKING ${c.letterSpacing} · ` +
              `LABEL <b>${hexOf(el, 'color')}</b>, THE DATE UNDER IT <b>${num ? hexOf(num, 'color') : '—'}</b> — THE WHOLE COLUMN CARRIES IT`;
          },
        },
        note: 'Every weekday at one weight and one colour, so the shape of a week has to be ' +
          'counted out. Ours colours both ends of it: you find Saturday without reading a word.',
      },
      {
        title: 'Today',
        span: 146,
        old: {
          find: (s) => s.querySelector('.old-cell.is-today'),
          spec: (el) => {
            const c = getComputedStyle(el);
            const w = (c.boxShadow.match(/-?[\d.]+px/g) || [])[3] || '—';
            return `${c.fontSize} · TODAY IS A <b>${w}</b> BOX DRAWN ROUND THE WHOLE DAY`;
          },
        },
        ours: {
          find: (s) => s.querySelector('.day-cell.today .day-number'),
          spec: (el) => {
            const c = getComputedStyle(el);
            return `EVERY NUMERAL IN THE SAME <b>${c.width} × ${c.height}</b> CIRCLE · RING <b>${ringOf(el)}</b>, INSET — ` +
              'A SHADOW, NOT A BORDER, SO IT COSTS THE CELL NO LAYOUT';
          },
        },
        note: 'A box drawn round the whole day. Ours rings the numeral instead, and rings it ' +
          'with a shadow — so nothing in the cell has to move aside to make room for today.',
      },
      {
        // The same appointment on both sides: the hero types "Design review 2pm"
        // into the reference, and this is what the app makes of it.
        title: 'An appointment',
        span: 154,
        old: {
          find: (s) => s.querySelector('.old-jot'),
          // Only what the frame shows. It says nowrap rather than "clipped",
          // because on a short note like this one nothing is clipped and the
          // crop would be claiming something it does not show.
          spec: (el) => {
            const c = getComputedStyle(el);
            return `${c.fontSize} PLAIN TEXT · <b>WHITE-SPACE ${c.whiteSpace.toUpperCase()}</b> — ONE LINE, WHATEVER FITS · ` +
              'NO TIME FIELD, NO COLOUR, NO REPEAT: THE 2PM IS A WORD';
          },
        },
        ours: {
          find: (s) => [...s.querySelectorAll('.day-event-row')]
            .find((r) => r.textContent.indexOf('Design review') === 0),
          spec: (row) => {
            const p = row.querySelector('.day-event-title');
            const c = getComputedStyle(p);
            const t = row.querySelector('.day-event-time');
            return `PILL — RADIUS <b>${c.borderTopLeftRadius}</b>, PADDING ${c.paddingTop} ${c.paddingLeft}, WEIGHT ${c.fontWeight} · ` +
              `LABEL <b>${hexOf(p, 'color')}</b> ON THE SAME COLOUR AT 15% · ` +
              `THE TIME IS ITS OWN ELEMENT, ${t ? getComputedStyle(t).fontSize : '—'}`;
          },
        },
        note: 'The same appointment, twice. On the left the time is four characters inside a ' +
          'sentence, and the colour and the repeat have nowhere to go. On the right each of ' +
          'them is a field, and the title is only what is left over.',
      },
      {
        // Nothing is added to the reference to lose this comparison. The crop
        // is of the same days, and what it shows is that they are only days.
        title: 'A run of days',
        // The whole run has to be inside both frames: three cells of a 900px
        // month is 372px, and a little over that leaves a margin. Any tighter
        // and the left crop shows two days while its line says three.
        span: 392,
        old: {
          find: (s) => s.querySelectorAll('.old-cell')[runStart],
          ax: RUN / 2,
          spec: (el) => {
            const c = getComputedStyle(el);
            return `THE SAME ${RUN} DAYS · ${c.borderRightWidth} BORDERS AND NOTHING ELSE — ` +
              'NO BAR, NO JOIN, NOTHING SAYING THESE BELONG TO ONE THING';
          },
        },
        ours: {
          find: (s) => s.querySelector('.spanning-bar'),
          spec: (el) => {
            const spacer = el.closest('.week-row').querySelector('.day-spanning-spacer');
            return `ONE BAR OVER ${RUN} DAYS, <b>${getComputedStyle(el).height}</b> TALL, DRAWN ONCE · ` +
              `EVERY DAY IT CROSSES RESERVES <b>${spacer ? getComputedStyle(spacer).height : '—'}</b>, ` +
              'SO IT NEVER LANDS ON A WORD';
          },
        },
        note: `${RUN === 3 ? 'Three' : RUN} days that belong to one thing, and the grid on the ` +
          'left has no way to say so — you would write it out again on each of them. Ours draws ' +
          'it once, and every day underneath keeps the room for it.',
      },
      {
        title: 'Writing it down',
        kind: 'window',
        old: {
          html: OLD_WINDOW,
          find: (s) => s.querySelector('.old-note-body'),
          spec: (el) => {
            const c = getComputedStyle(el);
            return `<b>${famOf(el)}</b> ${c.fontSize} · ONE FREE-TEXT BOX, ${c.minHeight} OF IT · ` +
              'ONE WINDOW PER DAY, AND NOTHING CARRIES OVER';
          },
        },
        ours: {
          html: OUR_WINDOW,
          find: (s) => s.querySelector('.icon-row'),
          spec: (el) => {
            const all = el.querySelectorAll('.icon-btn-wrapper').length;
            const pro = el.querySelectorAll('.icon-btn-wrapper.premium').length;
            const sw = el.parentNode.querySelectorAll('.compose-swatch').length;
            return `<b>${all}</b> FIELD BUTTONS — ${all - pro} FREE, <b>${pro} PRO</b> · ${sw} COLOURS · ` +
              'THE DIVIDER IS THE APP’S OWN, NOT THIS PAGE’S';
          },
        },
        note: 'One box, and whatever fits on a line of it. Ours asks for the parts separately — ' +
          'and the row splits itself exactly where the paid fields start. That line is drawn ' +
          'by the product, so the page shows it rather than making a claim about it.',
      },
    ];

    const cropped = [];   // re-placed on resize and once the web fonts land
    const total = pad2(STEPS.length);

    STEPS.forEach((s, i) => {
      const step = document.createElement('article');
      step.className = `vs-step vs-step--${s.kind || 'crop'}`;
      step.innerHTML =
        `<p class="vs-n">${pad2(i + 1)} / ${total}</p>` +
        `<h3 class="vs-title">${s.title}</h3>` +
        '<div class="vs-pair">' +
          '<figure class="vs-side vs-side--old">' +
            '<figcaption class="vs-tag">WHERE THIS STARTED</figcaption>' +
            '<div class="vs-box"></div><p class="vs-spec"></p></figure>' +
          '<figure class="vs-side vs-side--ours">' +
            '<figcaption class="vs-tag is-ours">BRACHY</figcaption>' +
            '<div class="vs-box"></div><p class="vs-spec"></p></figure>' +
        '</div>' +
        `<p class="vs-note">${s.note}</p>`;
      box.appendChild(step);

      const boxes = step.querySelectorAll('.vs-box');
      const specs = step.querySelectorAll('.vs-spec');

      [['old', 0], ['ours', 1]].forEach(([side, n]) => {
        const cfg = s[side];
        const frame = boxes[n];
        const out = specs[n];

        if (s.kind === 'window') {
          frame.classList.add('vs-box--win');
          frame.innerHTML = cfg.html();
          out.innerHTML = cfg.spec(cfg.find(frame));
          return;
        }

        const stage = side === 'old' ? oldStage() : buildCalendar();
        frame.appendChild(stage);

        if (s.kind === 'type') {
          // The specimen is set in the same stack the live component beside it
          // is set in, so the browser lands on the same face; the label says
          // which face that turned out to be, and at what size the component
          // itself is set.
          //
          // The stack goes on through el.style, NEVER through a style="" in an
          // HTML string: a computed font-family carries double quotes around
          // any family with a space in it ('Georgia, "Times New Roman", serif'),
          // and those close the attribute early. The declaration then dies on a
          // trailing comma and both specimens quietly fall back to the page's
          // own display face — which is this section showing neither typeface
          // while claiming to compare them.
          frame.classList.add('vs-box--type');
          const read = cfg.probe(stage).map((el) => {
            const c = getComputedStyle(el);
            return { fam: famOf(el), stack: c.fontFamily, size: c.fontSize };
          });
          stage.remove();
          read.forEach((r, k) => {
            const row = document.createElement('p');
            row.className = 'vs-type-row';
            const fam = document.createElement('span');
            fam.className = 'vs-type-fam';
            fam.textContent = `${r.fam} · ${r.size} IN THE CALENDAR`;
            const line = document.createElement('span');
            line.className = 'vs-type-line';
            line.style.fontFamily = r.stack;
            line.textContent = cfg.words[k];
            row.append(fam, line);
            frame.appendChild(row);
          });
          const fams = [...new Set(read.map((r) => r.fam))];
          out.innerHTML = fams.length > 1
            ? `<b>${fams.length} FAMILIES</b> IN ONE GRID — ${fams.join(' + ')}`
            : `<b>ONE FAMILY</b> THROUGHOUT — ${fams[0]}`;
          return;
        }

        cropped.push({
          stage, out, frame, span: s.span, find: cfg.find, spec: cfg.spec,
          // where inside the found element the crop is centred, in multiples of
          // its own width/height. 0.5 is its middle; step 6 uses 1.5 to land on
          // the middle of a three-cell run from the run's first cell.
          ax: cfg.ax === undefined ? 0.5 : cfg.ax,
          ay: cfg.ay === undefined ? 0.5 : cfg.ay,
        });
      });
    });

    // Centre each crop on its target. Scaling about the element's centre keeps
    // the centre fixed, so the target is first translated there — in the
    // element's own pre-scale coordinates, which is what a percentage translate
    // on the inside of the scale gives us.
    //
    // A step declares `span`: how many of the stage's 900 px must be visible
    // across the frame, and the scale falls out of the frame's real width. A
    // fixed multiplier would be tuned to one viewport — the phone's frames are
    // a third narrower than the desktop's, and the same 3.4× that framed an
    // appointment on a laptop cut the words off either end of it.
    const place = () => {
      cropped.forEach(({ stage, out, frame, span, find, spec, ax, ay }) => {
        const target = find(stage);
        if (!target) return;
        // the stage goes through too: a line may need a second element from the
        // same calendar, and it must be THIS calendar rather than another step's
        out.innerHTML = spec(target, stage);
        stage.style.transform = 'none';   // measure untransformed, or a re-run compounds
        const c = stage.getBoundingClientRect();
        const t = target.getBoundingClientRect();
        const fw = frame.clientWidth;
        if (!c.width || !c.height || !fw) return;
        const zoom = fw / span;
        const dx = 50 - ((t.left + t.width * ax - c.left) / c.width) * 100;
        const dy = 50 - ((t.top + t.height * ay - c.top) / c.height) * 100;
        stage.style.transform = `scale(${zoom}) translate(${dx}%, ${dy}%)`;
      });
    };
    requestAnimationFrame(place);
    addEventListener('resize', place);
    // web fonts change the metrics under us; re-measure once they are in
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);

    // The section closes on itself: the page went and looked up what day it is,
    // and so did the calendar it is arguing for.
    const self = document.createElement('div');
    self.className = 'vs-step vs-step--self';
    self.innerHTML =
      `<p class="vs-self">This page knows today is the ${ORDINAL(M.today)}.<br />So does the calendar.</p>`;
    box.appendChild(self);

    return [...box.querySelectorAll('.vs-step')];
  }

  // ---------- scroll scrub — one rAF-throttled pass drives every section ----------
  function initScrub(demo, vsSteps) {
    const hero = $('#hero');
    const wall = $('#plane-wall');
    const cal = $('#plane-cal');
    const pin = $('.hero-pin');
    const stage = $('#before-stage');
    const frame = $('#oldcal-frame');
    const copy = $('#before-copy');
    const bin = $('#bin');
    const binLid = $('.bin-lid');
    const nw = $('#newway');
    const beatBreak = $('#beat-break');
    const beatBuilt = $('#beat-built');
    const cue = $('#cue-label');
    const link = $('#demo-link');
    const shards = collectShards();

    // progress of a tall section behind its sticky pin, 0 → 1
    const prog = (el) => {
      const r = el.getBoundingClientRect();
      const span = r.height - innerHeight;
      return span <= 0 ? 0 : clamp01(-r.top / span);
    };

    let queued = false;

    function run() {
      queued = false;
      const vh = innerHeight;

      // 1. hero — one pinned sequence in three beats:
      //    BEFORE 0 → .30 · SHATTER .30 → .62 · REVEAL .62 → 1
      //
      //    The hero used to carry a fourth beat, a clickable tour of the month.
      //    It is gone: the first screen states the difference and section 2
      //    proves it, so the reveal is the last thing the pin has to do.
      const p = prog(hero);
      const seg = (a, b) => clamp01((p - a) / (b - a));
      wall.style.transform = `translate3d(0, ${p * -40}px, 0) scale(1.06)`;

      const qBreak = seg(0.30, 0.62);
      const qUp = seg(0.62, 0.80);

      // The demo plays at p = 0, so its narration is up from the first frame
      // rather than fading in on a scroll that has not happened yet. Leaving
      // the screen is what ends it.
      if (p > 0.12) demo.settle();
      copy.style.opacity = String(1 - seg(0.24, 0.32));
      // ours leaves with the copy; the shatter is not the place to already be
      // holding a piece of the answer
      if (p > 0.14) {
        const k = String(1 - seg(0.14, 0.28));
        nw.style.opacity = k;
        link.style.opacity = k;
      } else if (nw.style.opacity) {
        nw.style.opacity = '';
        link.style.opacity = '';
      }
      frame.style.opacity = String(1 - seg(0.30, 0.42));
      stage.style.opacity = String(1 - seg(0.62, 0.68));
      bin.style.opacity = String(seg(0.20, 0.30) * (1 - seg(0.62, 0.68)));
      bin.style.transform = `scale(${1 + 0.1 * Math.sin(qBreak * Math.PI)})`;
      binLid.style.transform = `rotate(${-22 * qBreak}deg) translateY(${-2 * qBreak}px)`;

      // Each piece hangs, then goes — its own delay, its own spin, all of them
      // aimed at the bin. dx/dy were measured once, so this is transform only.
      shards.list.forEach((s) => {
        const t = clamp01((qBreak - s.delay) / (1 - s.delay));
        const e = t * t;
        const hop = -Math.sin(t * Math.PI) * 46 * s.hop;
        s.el.style.transform = t
          ? `translate3d(${s.dx * e}px, ${s.dy * e + hop}px, 0) rotate(${s.rot * e}deg) scale(${1 - 0.94 * e})`
          : 'none';
        s.el.style.opacity = String(1 - t * 0.85);
      });

      beatBreak.style.opacity = String(seg(0.34, 0.41) * (1 - seg(0.55, 0.62)));
      beatBuilt.style.opacity = String(seg(0.68, 0.74) * (1 - seg(0.84, 0.90)));

      // ours rises in its place and then holds. A thing you are being handed
      // should not still be sliding while you look at it.
      cal.style.opacity = String(qUp);
      cal.style.transform =
        `translate3d(0, ${(1 - qUp) * 46}px, 0) scale(${0.962 + qUp * 0.038})`;

      const label = !demo.isDone() ? 'SCROLL WHEN READY'
        : p < 0.30 ? 'SCROLL TO BREAK IT'
        : p < 0.86 ? 'SCROLL'
        : 'ONE PART AT A TIME';
      if (cue.textContent !== label) cue.textContent = label;

      // the pin dims on the way out, so nothing outlives the calendar
      pin.style.opacity = String(clamp01(1 - (p - 0.93) / 0.07));

      // 2. one part at a time — each comparison assembles as it reaches the
      //    middle of the screen and lets go as it leaves. One custom property
      //    per step; the two sides read it for their own offsets, so this pass
      //    writes one value and the compositor does the rest.
      vsSteps.forEach((el) => {
        const r = el.getBoundingClientRect();
        const off = Math.abs(r.top + r.height / 2 - vh / 2) / (vh / 2);
        el.style.setProperty('--k', clamp01(1 - off * 1.15).toFixed(3));
      });
    }

    // While the cue reads as an instruction it must not do the opposite of
    // what it says: clicking it advances THROUGH the sequence to the reveal,
    // and only once ours is standing does it go back to being the link past
    // the section.
    $('.scroll-cue').addEventListener('click', (e) => {
      if (prog(hero) >= 0.80) return;
      e.preventDefault();
      const top = hero.offsetTop + (hero.offsetHeight - innerHeight) * 0.84;
      scrollTo({ top, behavior: REDUCED() ? 'auto' : 'smooth' });
    });

    const request = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
    // Where each shard has to travel is measured once, at rest — never per
    // frame. Layout can move under it twice: on resize, and when the web
    // fonts land, so it is re-measured on both.
    const remeasure = () => { shards.measure(); request(); };
    // The demo moves the card around the grid, so where the shards travel from
    // is only true once it has settled.
    demo.onSettle = remeasure;
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', remeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    requestAnimationFrame(remeasure);
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
    scrollTo(0, 0);
    buildOldCalendar($('#oldcal'));
    $('#plane-cal').appendChild(buildCalendar());
    const vsSteps = buildVersus();
    const demo = initOldDemo();
    runLoader(demo.start);
    initScrub(demo, vsSteps);
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
