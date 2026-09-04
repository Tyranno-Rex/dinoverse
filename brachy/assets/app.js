// BRACHY CALENDAR — page logic.
//
// Two screens, and neither of them is a picture.
//
//   1. HERO — the desktop calendar this app was built on, rebuilt in DOM on the
//             visitor's real month. It writes three appointments the only way it
//             can, comes apart at its own seams, and ours rises in its place,
//             full screen, the way it sits on a desktop.
//   2. TOUR — ours, being used. A pointer walks to a day and clicks it, writes
//             an event in, drags it, ticks it off, turns the month. Scroll picks
//             the step; arriving at one plays it.
//
// Nothing here is a drawing of either product: the calendar, the side panel and
// the composer are Brachy's own markup (CalendarGrid.tsx, DayCell.tsx,
// SchedulePanel.tsx, EventPopup.tsx) under Brachy's own stylesheet, in desktop
// mode. The reference is rebuilt from its own measurements. The tour is not a
// video either — the DOM really changes, which is why every step also knows how
// to put itself back when the reader scrolls up.
//
// The page runs on the visitor's real date throughout — the loader draws this
// actual month and stops on today, and the tour's last step turns the page to a
// month that has no ring in it because today is not there.
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

  // A day number of a month, named. Out-of-range numbers roll into the
  // neighbouring month on their own, which is exactly what the grid does.
  const dateLabel = (d, mm = M) =>
    new Date(mm.y, mm.m, d).toLocaleString('en-US', { month: 'long', day: 'numeric' });

  // Any month, in the same shape thisMonth() returns. `today` is 0 for a month
  // that is not this one, so nothing in it can be ringed — which is the point
  // of the tour's last step: turn the page and the ring is simply not there.
  function monthAt(offset) {
    if (!offset) return M;
    const d = new Date(M.y, M.m + offset, 1);
    const y = d.getFullYear(), m = d.getMonth();
    return {
      y, m,
      first: d.getDay(),
      days: new Date(y, m + 1, 0).getDate(),
      today: 0,
      month: d.toLocaleString('en-US', { month: 'long' }),
    };
  }
  const EMPTY_DEAL = { byDay: new Map(), span: { week: -1, col: 0, len: 0 } };

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

  // `mm`/`deal` default to this month and its dealt features. The tour hands in
  // a different pair for its last step, where the reader turns the page.
  function buildCalendar(mm = M, deal = DEAL) {
    const app = document.createElement('div');
    app.className = 'app dark blue bg-only-opacity';

    const weeks = Math.ceil((mm.first + mm.days) / 7);
    let rows = '';
    for (let w = 0; w < weeks; w++) {
      let cells = '';
      for (let c = 0; c < 7; c++) {
        const d = w * 7 + c - mm.first + 1;             // day number in this month
        const other = d < 1 || d > mm.days;
        const shown = other ? new Date(mm.y, mm.m, d).getDate() : d;
        const f = other ? null : deal.byDay.get(d);
        const evs = f ? f.events : null;

        const cls = ['day-cell'];
        if (other) cls.push('other-month');
        if (c === 0) cls.push('sunday');
        if (c === 6) cls.push('saturday');
        if (!other && d === mm.today) cls.push('today');

        const spanned = w === deal.span.week &&
          c >= deal.span.col && c < deal.span.col + deal.span.len;

        // the tour reaches for days by number and prints their date, so the
        // cells carry both rather than making it re-derive the grid's maths
        cells += `<div class="${cls.join(' ')}"` +
          `${other ? '' : ` data-day="${d}" data-when="${dateLabel(d, mm)}"`}>` +
          '<div class="day-cell-content"><div class="day-cell-header">' +
            `<span class="day-number${!other && d === mm.today ? ' today-badge' : ''}">${shown}</span>` +
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
      if (w === deal.span.week) {
        const { col, len } = deal.span;
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
            '<button class="nav-btn nav-arrow nav-prev" tabindex="-1" aria-hidden="true">&lsaquo;</button>' +
            `<div class="month-year"><span class="month-text">${mm.month}</span><span class="year-text">${mm.y}</span></div>` +
            '<button class="nav-btn nav-arrow nav-next" tabindex="-1" aria-hidden="true">&rsaquo;</button>' +
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

  // ---------- 2. the tour — the calendar uses itself ----------
  // The hero leaves ours standing there. This picks it up and works it: a
  // pointer walks to a day and clicks it, writes an event into it, drags it,
  // ticks it off, turns the month.
  //
  // Everything a step touches is the app's: the panel is SchedulePanel, the
  // composer is EventPopup down to the PRO badges its own icon row carries,
  // and the pill that lands is drawn by the same eventHTML as every other pill
  // on the grid. Nothing here is a video and nothing is a mock-up — the DOM
  // really changes, which is the whole reason a step also has to know how to
  // put itself back.
  //
  // Scroll picks the step; arriving at one plays it. Three entry points into
  // the same state, and they must agree:
  //   play()   — the pointer does it, at reading speed
  //   settle() — the same end state, instantly (scrubbed past, or reduced motion)
  //   undo()   — back to what the step found

  // the app's SchedulePanel, rendered for one day.
  // apps/brachy/src/components/SchedulePanel: the day grouped with its count,
  // then each event as a schedule-item — checkbox, colour dot, tag dots, D-day
  // badge, and a meta row of whatever the event actually has. Nothing is drawn
  // for a field the event does not carry.
  const DOW_LONG = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function scheduleItem(e) {
    const meta =
      (e.time ? `<div class="schedule-item-time"><span>◷</span><span>${e.time}</span></div>` : '') +
      (e.repeat ? '<div class="schedule-item-repeat"><span>↻</span><span>Repeat</span></div>' : '') +
      (e.remind ? `<div class="schedule-item-time"><span>◔</span><span>${e.remind}</span></div>` : '') +
      (e.buffer ? `<div class="schedule-item-time"><span>◷</span><span>${e.buffer}</span></div>` : '');
    return `<div class="schedule-item${e.done ? ' is-done' : ''}">` +
      `<span class="schedule-item-checkbox${e.done ? ' checked' : ''}">✓</span>` +
      '<div class="schedule-item-content"><div class="schedule-item-title-row">' +
        (e.color ? `<span class="schedule-item-color-dot" style="background:${e.color}"></span>` : '') +
        (e.tags ? `<span class="schedule-item-tag-dots">${e.tags.map((c) =>
          `<span class="schedule-item-tag-dot" style="background:${c}"></span>`).join('')}</span>` : '') +
        `<p class="schedule-item-title${e.done ? ' completed' : ''}">${e.t}</p>` +
        (e.dday ? `<span class="schedule-item-dday">${e.dday}</span>` : '') +
      '</div>' +
      (meta ? `<div class="schedule-item-meta">${meta}</div>` : '') +
      '</div></div>';
  }

  function scheduleDay(cell, events) {
    const d = +cell.dataset.day;
    const today = d === M.today;
    return `<div class="schedule-day-group${today ? ' today' : ''}">` +
      `<div class="schedule-day-header${today ? ' today' : ''}">` +
        '<div class="schedule-day-header-left">' +
          '<span class="schedule-day-chevron">›</span>' +
          `<span class="schedule-day-label${today ? ' today' : ''}">${DOW_LONG[new Date(M.y, M.m, d).getDay()].toUpperCase()}</span>` +
          `<span class="schedule-day-date">${cell.dataset.when}</span>` +
        '</div>' +
        `<span class="schedule-day-count">${events.length}</span>` +
      '</div>' +
      `<div class="schedule-day-events">${events.map(scheduleItem).join('')}</div>` +
    '</div>';
  }

  // The app's EventPopup. Its icon row is split into two groups by the app
  // itself — the free fields, a divider, then the ones that carry a PRO badge.
  // That division is the product's, not ours, so the page shows it rather than
  // describing it, and the tour presses the PRO button before it picks a colour
  // instead of demonstrating a paid field as though it were free.
  const composeHTML = (when) =>
    '<div class="app dark blue event-modal-popup">' +
      '<div class="popup-header"><span class="popup-title">New event</span><span class="popup-close">×</span></div>' +
      '<div class="popup-content">' +
        '<div class="popup-field">' +
          `<span class="popup-label">${when}</span>` +
          '<span class="popup-input" id="tc-title"><i></i><span class="tc-caret"></span></span>' +
        '</div>' +
        '<div class="popup-field"><span class="popup-label">Time</span>' +
          '<span class="popup-input is-empty" id="tc-time">--:--</span></div>' +
        '<div class="icon-row">' +
          '<div class="icon-group">' +
            '<span class="icon-btn-wrapper"><span class="icon-btn">↻</span><span class="icon-btn-label">Repeat</span></span>' +
            '<span class="icon-btn-wrapper"><span class="icon-btn">◔</span><span class="icon-btn-label">Remind</span></span>' +
            '<span class="icon-btn-wrapper"><span class="icon-btn">◷</span><span class="icon-btn-label">Buffer</span></span>' +
            '<span class="icon-btn-wrapper"><span class="icon-btn">D</span><span class="icon-btn-label">D-Day</span></span>' +
          '</div>' +
          '<span class="icon-row-divider"></span>' +
          '<div class="icon-group">' +
            '<span class="icon-btn-wrapper premium" id="tc-colour-btn"><span class="icon-btn">◉<span class="icon-btn-pro-badge">PRO</span></span><span class="icon-btn-label">Colour</span></span>' +
            '<span class="icon-btn-wrapper premium"><span class="icon-btn">#<span class="icon-btn-pro-badge">PRO</span></span><span class="icon-btn-label">Tag</span></span>' +
            '<span class="icon-btn-wrapper premium"><span class="icon-btn">▤<span class="icon-btn-pro-badge">PRO</span></span><span class="icon-btn-label">Template</span></span>' +
            '<span class="icon-btn-wrapper premium"><span class="icon-btn">G<span class="icon-btn-pro-badge">PRO</span></span><span class="icon-btn-label">Google</span></span>' +
          '</div>' +
        '</div>' +
        `<div class="colour-drop" id="tc-colours">${PALETTE.map((c) =>
          `<span class="compose-swatch" style="background:${c};color:${c}" data-c="${c}"></span>`).join('')}</div>` +
      '</div>' +
      '<div class="popup-footer"><span class="popup-save" id="tc-save">Save</span></div>' +
    '</div>';

  function initTour() {
    const pin = $('.tour-pin');
    const stage = $('#tour-stage');
    const panel = $('#tour-panel');
    const compose = $('#tour-compose');
    const ptr = $('#tour-ptr');
    const rail = $('#tour-rail');

    let cal = buildCalendar();
    stage.appendChild(cal);

    const cells = () => [...cal.querySelectorAll('.day-cell[data-day]')];
    // Days are held as NUMBERS, never as nodes. The last step replaces the whole
    // grid to turn the month, and any node a step was holding dies with it — a
    // day number survives, so every step reaches for its cell through here.
    const cellFor = (d) => cal.querySelector(`.day-cell[data-day="${d}"]`);

    // ---- the event the tour writes ----
    // It is one of the month's own, taken back out of the grid before the
    // reader gets here, so its day starts empty and step 2 writing it in is
    // what puts the month back together. Without this the hand would be typing
    // out an appointment that is already sitting two cells away.
    //
    // It comes out of the GRID, not out of DEAL: the hero's calendar is built
    // from the same deal and should still show a whole month. Which means every
    // rebuild has to take it out again — hence hold(), called from swap().
    const HELD = FEATURES.find((f) => f.name === 'Ten event colours');
    const WRITTEN = HELD.events[0];
    const heldDay = ([...DEAL.byDay].find(([, f]) => f === HELD) || [])[0];
    const hold = () => {
      const c = heldDay && cellFor(heldDay);
      const box = c && c.querySelector('.day-events-detail:not([data-written])');
      if (box) box.remove();
    };
    hold();

    // ---- the days each step works on ----
    // The written event needs an empty day, and the drag needs an empty one two
    // columns along in the same week, so the pair is read off the grid rather
    // than assumed. The held day is tried first — writing the event back where
    // it came from is the tidiest version of this — and the fallbacks are there
    // so an awkward month degrades instead of throwing.
    const free = cells().filter((c) => !c.querySelector('.day-events-detail') &&
      !c.querySelector('.day-spanning-spacer'));
    if (heldDay) free.sort((a, b) => (+b.dataset.day === heldDay) - (+a.dataset.day === heldDay));
    const pairFrom = free.find((c) => {
      const to = cellFor(+c.dataset.day + 2);
      return to && to.closest('.week-row') === c.closest('.week-row') && free.includes(to);
    });
    const FROM = +(pairFrom || free[0] || cells()[0]).dataset.day;
    const TO = pairFrom ? FROM + 2 : +(free[1] || cells()[1]).dataset.day;

    // the day the first step opens: one that is actually carrying something
    const OPEN = +(cells().find((c) => c.querySelector('.day-event-row') &&
      +c.dataset.day !== FROM) || cells()[0]).dataset.day;
    const OPEN_EVENTS = (DEAL.byDay.get(OPEN) || { events: [] })
      .events.filter((e) => !e.more);

    // ---- the hand ----
    // left/top rather than a transform, so the two axes can carry different
    // easings and the travel comes out as an arc (see .demo-ptr)
    const pointAt = (el, fx = 0.5, fy = 0.5) => {
      if (!el) return;
      const p = pin.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      ptr.style.left = `${r.left - p.left + r.width * fx}px`;
      ptr.style.top = `${r.top - p.top + r.height * fy}px`;
    };
    const click = () => {
      ptr.classList.remove('is-click');
      void ptr.offsetWidth;                    // restart the ring
      ptr.classList.add('is-click', 'is-press');
      setTimeout(() => ptr.classList.remove('is-press'), 130);
    };
    const hand = (on) => ptr.classList.toggle('is-on', !!on);

    // ---- panels ----
    const openPanel = (cell, events) => {
      $('#tour-panel-when').textContent = cell.dataset.when;
      $('#tour-panel-list').innerHTML = scheduleDay(cell, events);
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      pin.classList.add('is-panel-open');
    };
    const shutPanel = () => {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      pin.classList.remove('is-panel-open');
    };
    const openCompose = (cell) => {
      compose.innerHTML = composeHTML(cell.dataset.when);
      compose.classList.add('is-open');
      compose.setAttribute('aria-hidden', 'false');
      pin.classList.add('is-panel-open');
    };
    const shutCompose = () => {
      compose.classList.remove('is-open', 'is-typing');
      compose.setAttribute('aria-hidden', 'true');
      pin.classList.remove('is-panel-open');
    };

    // ---- the written event, on the grid ----
    const putEvent = (cell, done) => {
      // a month that does not have that day simply has nowhere to put it
      if (!cell) return null;
      let box = cell.querySelector('.day-events-detail');
      if (!box) {
        box = document.createElement('div');
        box.className = 'day-events-detail';
        cell.querySelector('.day-cell-content').appendChild(box);
      }
      box.innerHTML = eventHTML({ ...WRITTEN, done });
      box.dataset.written = '1';
      return box;
    };
    const clearEvent = () => {
      const box = cal.querySelector('.day-events-detail[data-written]');
      if (box) box.remove();
    };
    const lit = (d, on) => {
      const c = cellFor(d);
      if (c) c.classList.toggle('is-lit', on);
    };

    // ---- the steps ----
    // Each one owns three ways into the same state. If they ever disagree, a
    // reader who scrolls quickly sees a different calendar from one who reads.
    const STEPS = [
      {
        title: 'Click a day.',
        lead: 'The panel that opens is the app’s own — the day grouped with what it is ' +
          'carrying, and every event as a row you can tick, not a line of text.',
        async play(w) {
          hand(true);
          pointAt(cellFor(OPEN), 0.5, 0.35);
          await w(700);
          click();
          await w(240);
          this.settle();
        },
        settle() { openPanel(cellFor(OPEN), OPEN_EVENTS); lit(OPEN, true); },
        undo() { shutPanel(); lit(OPEN, false); },
      },
      {
        title: 'Write one in.',
        lead: 'Double-click an empty day and everything about the appointment is a field. ' +
          'The row of them splits itself where the paid ones start — that divider is the ' +
          'product’s, so the hand presses the PRO button before it picks a colour.',
        async play(w) {
          shutPanel();
          lit(OPEN, false);
          hand(true);
          pointAt(cellFor(FROM), 0.5, 0.4);
          await w(620);
          click(); await w(160); click();          // it is a double-click
          await w(240);
          openCompose(cellFor(FROM));
          await w(520);

          const title = $('#tc-title');
          pointAt(title, 0.12, 0.5);
          compose.classList.add('is-typing');
          await w(320);
          for (let i = 1; i <= WRITTEN.t.length; i++) {
            title.querySelector('i').textContent = WRITTEN.t.slice(0, i);
            await w(WRITTEN.t[i - 1] === ' ' ? 88 : 46);
          }
          compose.classList.remove('is-typing');
          await w(320);

          const time = $('#tc-time');
          pointAt(time, 0.12, 0.5);
          await w(420);
          click(); await w(170);
          time.textContent = WRITTEN.time;
          time.classList.remove('is-empty');
          await w(520);

          const cBtn = $('#tc-colour-btn');
          pointAt(cBtn, 0.5, 0.3);
          await w(520);
          click();
          cBtn.querySelector('.icon-btn').classList.add('active');
          $('#tc-colours').classList.add('is-open');
          await w(480);
          const sw = compose.querySelector(`.compose-swatch[data-c="${WRITTEN.color}"]`);
          pointAt(sw);
          await w(430);
          click();
          sw.classList.add('is-on');
          title.querySelector('i').style.color = WRITTEN.color;
          await w(620);

          const save = $('#tc-save');
          pointAt(save);
          await w(460);
          click();
          save.classList.add('is-press');
          await w(220);
          this.settle();
        },
        settle() { shutPanel(); shutCompose(); lit(OPEN, false); putEvent(cellFor(FROM), false); },
        undo() { shutCompose(); clearEvent(); },
      },
      {
        title: 'Drag it somewhere else.',
        lead: 'It is a desktop calendar, so an appointment moves the way anything on a ' +
          'desktop moves. Pick it up, drop it on another day; the day you dropped it on is ' +
          'the day it is on.',
        async play(w) {
          const from = cellFor(FROM), to = cellFor(TO);
          const row = from && from.querySelector('.day-event-row');
          if (!row || !to) { this.settle(); return; }
          hand(true);
          pointAt(row, 0.4, 0.5);
          await w(560);
          click();

          // a ghost travels with the hand; the real one is re-drawn on the day
          // it was dropped on, because that is what the drop means
          const g = row.cloneNode(true);
          g.className = 'day-event-row tour-ghost';
          pin.appendChild(g);
          const p = pin.getBoundingClientRect();
          const a = row.getBoundingClientRect();
          const b = to.getBoundingClientRect();
          g.style.left = `${a.left - p.left}px`;
          g.style.top = `${a.top - p.top}px`;
          g.style.width = `${a.width}px`;
          from.querySelector('.day-events-detail').style.opacity = '0.25';
          await w(60);
          g.style.left = `${b.left - p.left + 8}px`;
          g.style.top = `${b.top - p.top + 34}px`;
          pointAt(to, 0.4, 0.42);
          await w(680);
          g.remove();
          this.settle();
          await w(120);
        },
        settle() {
          shutPanel(); shutCompose();
          clearEvent();
          const box = putEvent(cellFor(TO), false);
          if (box) box.classList.add('is-landed');
        },
        undo() { clearEvent(); putEvent(cellFor(FROM), false); },
      },
      {
        title: 'Tick it off where you are.',
        lead: 'The grid and the panel are not two views of the appointment. They are the ' +
          'appointment — check it in one and it strikes through in the other, in place.',
        async play(w) {
          const cell = cellFor(TO);
          if (!cell) { this.settle(); return; }
          hand(true);
          pointAt(cell, 0.5, 0.4);
          await w(520);
          click();
          await w(200);
          openPanel(cell, [WRITTEN]);
          lit(TO, true);
          await w(760);
          pointAt(panel.querySelector('.schedule-item-checkbox'));
          await w(520);
          click();
          await w(180);
          this.settle();
        },
        settle() {
          shutCompose();
          const cell = cellFor(TO);
          if (!cell) return;
          openPanel(cell, [{ ...WRITTEN, done: true }]);
          lit(TO, true);
          clearEvent();
          putEvent(cell, true);
        },
        undo() {
          shutPanel();
          lit(TO, false);
          clearEvent();
          putEvent(cellFor(TO), false);
        },
      },
      {
        title: 'Turn the page, and come back.',
        lead: 'Next month is empty because you have not been there yet — and the ring is ' +
          'gone with it. It only ever sits on today, which this calendar had to go and look ' +
          'up. Today takes you back.',
        async play(w) {
          shutPanel(); shutCompose();
          lit(TO, false);
          hand(true);
          pointAt(cal.querySelector('.nav-next'));
          await w(620);
          click();
          await w(180);
          swap(monthAt(1), EMPTY_DEAL);
          await w(1600);
          pointAt(cal.querySelector('.today-btn'));
          await w(620);
          click();
          await w(180);
          this.settle();
        },
        settle() {
          shutPanel(); shutCompose();
          swap(M, DEAL);
          lit(TO, false);
          putEvent(cellFor(TO), true);
        },
        undo() {
          swap(M, DEAL);
          const cell = cellFor(TO);
          if (!cell) return;
          putEvent(cell, true);
          openPanel(cell, [{ ...WRITTEN, done: true }]);
          lit(TO, true);
        },
      },
    ];

    // Swapping the month throws the whole grid away, which is why no step holds
    // a cell — they hold day numbers and ask cellFor() each time. Whatever the
    // written event was doing has to be re-drawn by the caller afterwards; a
    // grid that has just been rebuilt is a grid with nothing written on it.
    function swap(mm, deal) {
      const next = buildCalendar(mm, deal);
      cal.replaceWith(next);
      cal = next;
      hold();
    }

    // ---- the rail: where you are, and how much is left ----
    // Numbers only. The step's title is already on the plate to the left, and a
    // rail that carried it too came out ragged — an `opacity: 0` title still
    // takes its width, so five right-aligned ticks sat on five different lines.
    rail.innerHTML = STEPS.map((_, i) => `<li class="tour-tick">${pad2(i + 1)}</li>`).join('');
    const ticks = [...rail.querySelectorAll('.tour-tick')];

    // ---- the engine ----
    let at = -1;            // the last step whose end state is on screen
    let token = 0;          // cancels a play() that the reader has scrolled past
    const HALT = {};

    const say = (i) => {
      const s = STEPS[i];
      $('#tour-n').textContent = `${pad2(i + 1)} / ${pad2(STEPS.length)}`;
      $('#tour-title').textContent = s ? s.title : '';
      $('#tour-lead').textContent = s ? s.lead : '';
      ticks.forEach((t, k) => t.classList.toggle('is-at', k === i));
    };

    function goTo(n, animate) {
      if (n === at) return;
      // Bumping the token halts whatever play() is mid-flight, which means it
      // stops between two awaits and never reaches its own tidying up. So the
      // things a play can leave lying around are cleared here, where every
      // route in and out of a step passes.
      token++;
      const mine = token;
      pin.querySelectorAll('.tour-ghost').forEach((g) => g.remove());
      const w = (ms) => new Promise((r) => setTimeout(r, ms))
        .then(() => { if (token !== mine) throw HALT; });

      if (n < at) {
        // backwards: hand the calendar back one step at a time, in reverse
        for (let i = at; i > n; i--) STEPS[i].undo();
        hand(false);
        at = n;
        say(Math.max(0, at));
        return;
      }
      // Forwards. The step being left is settled first — it may have been cut
      // off halfway through its own play, and the next one is entitled to find
      // the calendar in the state the last one promised. settle() is written to
      // be safe to call on a step that is already settled.
      if (at >= 0) STEPS[at].settle();
      for (let i = at + 1; i < n; i++) STEPS[i].settle();
      at = n;
      say(n);
      const s = STEPS[n];
      if (!animate || REDUCED()) { hand(false); s.settle(); return; }
      Promise.resolve(s.play(w)).catch((e) => { if (e !== HALT) throw e; })
        .then(() => { if (token === mine) hand(false); });
    }

    say(0);
    return {
      steps: STEPS.length,
      // p is 0..1 across the section, and it is 0 both above the section and at
      // the instant the pin sticks. So p === 0 means "not here yet" and winds
      // the calendar all the way back — otherwise the scrub's very first frame,
      // which runs at load while the reader is still in the hero, would play
      // step one to an empty room.
      at: (p) => {
        if (p <= 0) { goTo(-1, false); return; }
        goTo(Math.min(STEPS.length - 1, Math.floor(p * STEPS.length)), true);
      },
    };
  }

  // ---------- scroll scrub — one rAF-throttled pass drives every section ----------
  function initScrub(demo, tour) {
    const hero = $('#hero');
    const tourSec = $('#tour');
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
        : 'NOW WATCH IT WORK';
      if (cue.textContent !== label) cue.textContent = label;

      // the pin dims on the way out, so nothing outlives the calendar
      pin.style.opacity = String(clamp01(1 - (p - 0.93) / 0.07));

      // 2. the tour — scroll picks the step and the step plays itself. The
      //    engine is told a position, never a direction: it works out for
      //    itself what to play, what to snap past, and what to put back.
      tour.at(prog(tourSec));
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
    const tour = initTour();
    const demo = initOldDemo();
    runLoader(demo.start);
    initScrub(demo, tour);
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
