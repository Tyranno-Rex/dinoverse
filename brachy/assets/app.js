// BRACHY CALENDAR — page logic.
//
// Two screens, and neither of them is a picture.
//
//   1. MONTH — one month, as it happened. The 1st, an empty grid, and then the
//             month filling: work arrives the way work arrives — somebody
//             messages you — and the calendar takes it. The screen cuts to
//             black between days and hands you the date, and the days nothing
//             was said on fill in behind it. Every event that lands is a real
//             feature doing its own job.
//             Scroll scatters the words and leaves the calendar standing in the
//             cleared middle with no window around it — which is desktop mode,
//             demonstrated rather than described.
//   2. TOUR — ours, being used. A pointer writes an event with QuickAdd, drags
//             it, plans the day, filters the month down to one project,
//             decorates it, syncs it to a second device, then steps away and
//             lets an agent put one in. Scroll picks the step; arriving at one
//             plays it.
//
// Nothing here is a drawing of the product: the calendar, the side panel,
// QuickAdd, the daily planner, the tag filter bar and the stickers are Brachy's
// own markup (CalendarGrid.tsx, DayCell.tsx, SchedulePanel.tsx, QuickAdd.tsx,
// DailyPlanner.tsx, TagFilterBar.tsx, FreeStickerItem.tsx) under Brachy's own
// stylesheet, in desktop mode. The tour is not a video either — the DOM really
// changes, which is why every step also knows how to put itself back when the
// reader scrolls up.
//
// Two things have no window of their own to show. Desktop mode is something the
// OS does, so it is shown as the real calendar on a real wallpaper. MCP is a
// socket, so what the agent asked for is said in the PAGE's type, outside the
// app's frame — neither is drawn as a screen the product does not have.
//
// The page runs on the visitor's real date throughout: the story is this
// month, the 1st to its own last day, and every step works on days this month
// really has.
//
// Stage one is CSS only. The one WebGL moment left on the plan (the wallpaper
// displacement dissolve) waits on real app screenshots — see
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
  const ORDINAL = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

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

  // The three tags the month is filed under. A tag in the app is a name and a
  // colour, and it is what the filter bar filters on — so the page needs real
  // ones rather than three loose dots.
  const TAGS = [
    { name: 'Client', color: '#34C759' },
    { name: 'Personal', color: '#AF52DE' },
    { name: 'Ship', color: '#FF9500' },
  ];
  const TAG = Object.fromEntries(TAGS.map((t) => [t.name, t.color]));

  // Every entry is a real feature of the app, and what it puts on the grid is
  // what the app would put there — a repeat icon, a tag dot, one of the ten
  // Apple system colours it ships. docs/spec/FEATURE_MATRIX.md (mesozoic) is
  // the code-checked reference; where it and this page disagreed, this page
  // was wrong. Two of them were: the tag filter does not dim what does not
  // match, it takes it out of the day (App.tsx getFilteredEventsForDate), and
  // QuickAdd's parser reads relative days and named dates but not weekday
  // names, so a pill reading "fri 1pm" was advertising something it cannot do.
  //
  // The month is dressed with these so that the tour has a real month to work
  // in. Which of them are paid is not asserted here — the tour reaches the paid
  // ones through the app's own gates, and the product has already drawn that
  // line itself.
  const FEATURES = [
    { events: [{ t: 'Weekly standup', time: '09:30', repeat: true, tags: [TAG.Client] }],
      name: 'Repeating events' },

    { events: [{ t: 'Design review', time: '14:00', color: '#FF3B30' }],
      name: 'Ten event colours' },

    { events: [{ t: 'Launch', dday: 'D-7', color: '#FF2D55', tags: [TAG.Ship] }],
      name: 'D-day countdown' },

    { events: [{ t: 'Client call', time: '11:00', tags: [TAG.Client, TAG.Personal] }],
      name: 'Tags, and a filter' },

    { events: [{ t: 'Renew domain', done: true }],
      name: 'Completion' },

    { sticker: '🎉',
      events: [{ t: 'Ship v1.2', time: '17:00', color: '#34C759', tags: [TAG.Ship] }],
      name: 'Mood stickers' },

    // The day the warning is for, and the one the planner opens on. The grid
    // shows what fits and counts the rest, which is what monthViewMaxEvents
    // does; `extra` is the rest, and the planner gets all of them — which is
    // the whole reason anyone opens it on a day like this.
    { overcommit: true,
      events: [
        { t: 'All-hands', time: '10:00', tags: [TAG.Client] },
        { t: 'Vendor sync', time: '13:00', color: '#5AC8FA', tags: [TAG.Client] },
        { t: '+3 more', more: true },
      ],
      extra: [
        { t: 'Budget review', time: '15:00', color: '#FF9500' },
        { t: '1:1 with Dana', time: '16:30', tags: [TAG.Personal] },
        { t: 'Ship checklist', time: '18:00', color: '#34C759', tags: [TAG.Ship] },
      ],
      name: 'Overcommit warning' },

    { events: [{ t: 'Dentist', time: '15:00', color: '#5856D6', remind: '15 min before', tags: [TAG.Personal] }],
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
      events: [{ t: 'Picnic', time: '12:00', color: '#34C759', tags: [TAG.Personal] }],
      name: 'Weather in the day' },

    { events: [{ t: 'Backup written', done: true }],
      name: 'Backup, import, export' },

    { events: [{ t: 'Planner · 8 blocks', time: '08:00', color: '#007AFF' }],
      name: 'The daily planner' },

    // The tour writes this one back in with QuickAdd, so it is held out of the
    // grid before the reader arrives — see hold() in initTour.
    { events: [{ t: 'Lunch with Sam', time: '13:00' }],
      name: 'QuickAdd, on the device' },

    { events: [{ t: 'Interview', time: '16:00', buffer: '10 min either side', color: '#AF52DE', tags: [TAG.Client] }],
      name: 'Conflicts and buffer time' },
  ];

  const SPAN = { title: 'Sprint 12 · multi-day' };

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

  // ---------- the two the tour writes ----------
  // They are the month's own, taken off EVERY calendar the page draws so that
  // writing them is what puts the month together rather than adding a second
  // copy two cells away. Off every calendar, not just the tour's: the story
  // hands the reader a finished month and the tour picks it up, and two pills
  // quietly vanishing at the seam would be the page contradicting itself.
  const HELD = ['QuickAdd, on the device', 'Google Calendar, CalDAV, iCal feeds']
    .map((name) => {
      const f = FEATURES.find((x) => x.name === name);
      return { ev: f.events[0], day: ([...DEAL.byDay].find(([, v]) => v === f) || [])[0] };
    });
  const holdFrom = (root) => HELD.forEach(({ day }) => {
    const c = day && root.querySelector(`.day-cell[data-day="${day}"]`);
    const box = c && c.querySelector('.day-events-detail');
    if (box) box.remove();
  });

  function eventHTML(e) {
    // the app's overflow line is not an event; it does not get an event's pill
    if (e.more) return `<div class="day-event-more">${e.t}</div>`;
    const style = e.color ? ` style="--event-color:${e.color};--event-color-light:${light(e.color)}"` : '';
    // the tags ride on the row so the filter step can pick rows the way the app
    // picks events — by which tags they carry, not by where they happen to sit
    return `<div class="day-event-row${e.done ? ' completed' : ''}"` +
      `${e.tags ? ` data-tags="${e.tags.join(' ')}"` : ''}>` +
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

  // ---------- 0. loader — the black the story starts in ----------
  // It says nothing, and it draws nothing. The screen it lifts onto is still
  // black — the month's story opens in a blackout of its own — so there is no
  // moment where this cover can be seen leaving. All it has to do is hold the
  // page while the month is built and the fonts land.
  function runLoader(onDone) {
    const wrap = $('#boot');
    const finish = () => { wrap.classList.add('is-done'); onDone(); };
    if (REDUCED()) { finish(); return; }
    setTimeout(finish, 620);
  }

  // ---------- 1. the month — one month, as it happened ----------
  // The first screen is not a pitch and it is not a list. It is the 1st, an
  // empty month, and then the month happening. Work arrives the way work
  // actually arrives — somebody messages you — and the calendar takes it.
  //
  // Between one day and the next the screen goes black and gives you the date,
  // the way a film cuts, and the days nothing was said on fill in behind it. So
  // the month is never skipped: the 1st to the 30th all happen, and we only
  // stop where there is something to see.
  //
  // Every event that lands is a real feature of the product doing the thing it
  // does, dealt onto this month by dealFeatures() — the same deal the tour then
  // works on. Nothing here is written for the story: the story is written for
  // what the product actually does, which is the only order those two can go in.
  //
  // Scroll picks the day and arriving at one plays it, the same contract every
  // tour step keeps: play, settle, undo. Scrolling back really does take the
  // pills off the grid again.
  //
  // The senders are invented. The work is not: this is a month of the kind of
  // thing a calendar is actually asked to hold.
  const INBOX = {
    'Repeating events': {
      who: 'Dana', dot: '#0A84FF',
      text: 'Standup every Monday from now on — set it once so I stop asking.',
      did: 'It repeats, and it ends when you say so.',
      lead: 'Daily, weekly, monthly, or every second week. Edit one occurrence or that one and everything after it.' },

    'Ten event colours': {
      who: 'Mina', dot: '#FF375F',
      text: 'Design review Thursday. Make it red — I keep walking past it.',
      did: 'Red. One of the ten the system ships.',
      lead: 'The pill takes the colour at 15%, the label at full. Turn on the colourblind palette and all ten remap to Wong’s universal set.' },

    'D-day countdown': {
      who: 'Sam', dot: '#FF9F0A',
      text: 'Launch is a week out. Can you put the countdown on it?',
      did: 'D-7, and it counts itself down.',
      lead: 'The number is never something you work out on your fingers.' },

    'Tags, and a filter': {
      who: 'Dana', dot: '#0A84FF',
      text: 'Client call Tuesday. Tag it so I can pull the whole account later.',
      did: 'Two tags, two dots.',
      lead: 'Filter by one and the rest of the month dims rather than disappears — so you read a project without losing the shape of the month.' },

    'Completion': {
      who: 'Ops', dot: '#8E8E93',
      text: 'Domain renewal is on you today.',
      did: 'Ticked off where it stands.',
      lead: 'On a repeating event completion is stored per occurrence, so last week being done does not mark this week done.' },

    'Mood stickers': {
      who: 'Sam', dot: '#FF9F0A',
      text: 'We shipped 1.2. That deserves something on the day.',
      did: 'One sticker, on that day.',
      lead: 'From the cell’s right-click menu, and you can register your own images alongside the emoji.' },

    'Overcommit warning': {
      who: 'Mina', dot: '#FF375F',
      text: 'Can you take the vendor sync as well? It is the same day.',
      did: 'Five on one day — and the cell says so.',
      lead: 'The threshold is yours: a number of events, or a number of hours. It warns while the day is still ahead of you.' },

    'Reminders, and snooze': {
      who: 'Ops', dot: '#8E8E93',
      text: 'Dentist confirmed for Wednesday, 3pm.',
      did: 'Fifteen minutes before.',
      lead: 'A real system notification, several to one event, snoozed for ten. If the event has a meeting link the notification opens it.' },

    'Pomodoro timer': {
      who: 'Dana', dot: '#0A84FF',
      text: 'Four blocks on the deck today, if you can.',
      did: 'Four sessions, logged on the day they ran.',
      lead: 'Started from the event they belong to, so the month ends up holding the work and not only the plan.' },

    'Memo windows': {
      who: 'Sam', dot: '#FF9F0A',
      text: 'Passport number when you get a second — not urgent.',
      did: 'A memo, in its own window.',
      lead: 'Free-standing notes outside the grid. Pin one and it stays above every other window until you unpin it.' },

    'Focus-time suggestions': {
      who: 'Brachy', dot: '#64D2FF', app: true,
      text: 'Two clear hours on Friday morning. Want them?',
      did: 'Offered, not booked.',
      lead: 'It reads the day you already have, finds the gaps inside your working hours that are worth anything, and offers them.' },

    'Weather in the day': {
      who: 'Mina', dot: '#FF375F',
      text: 'Picnic Saturday, if it is dry.',
      did: 'The forecast sits in the day header.',
      lead: 'Your coordinates are rounded to two decimal places and sent straight to Open-Meteo. The request never passes through our server.' },

    'Backup, import, export': {
      who: 'Ops', dot: '#8E8E93',
      text: 'Audit next month. Make sure all of this is backed up.',
      did: 'Written on launch, and again on quit.',
      lead: 'The last five are kept and the operating system encrypts them. Export is JSON or plain .ics, and a month prints to PDF.' },

    'The daily planner': {
      who: 'Dana', dot: '#0A84FF',
      text: 'Send me that day hour by hour, not just the list.',
      did: 'Press P and the day opens.',
      lead: 'Add straight into an hour, tick things off there, and what you planned and what you kept sit in the same column.' },

    'Conflicts and buffer time': {
      who: 'Mina', dot: '#FF375F',
      text: 'Interview at four. Leave yourself room either side.',
      did: 'Ten minutes before, ten after.',
      lead: 'Two events on the same hour are flagged as they are made, and the time an event really costs you is the time the day accounts for.' },
  };

  function initMonth() {
    const black = $('#black');
    const blackDow = $('#black-dow');
    const blackDay = $('#black-day');
    const msg = $('#msg');
    const cue = $('#cue-label');
    const cal = $('#plane-cal');

    const cellFor = (d) => cal.querySelector(`.day-cell[data-day="${d}"]`);
    const evBox = (d) => { const c = cellFor(d); return c && c.querySelector('.day-events-detail'); };

    // Every day of the month is off the grid to begin with, including the
    // header marks — a weather glyph on the 12th before the 12th has happened
    // would be the month knowing something it has not been told.
    const marks = (d) => {
      const c = cellFor(d);
      return c ? [...c.querySelectorAll('.day-cell-header > *:not(.day-number)')] : [];
    };
    const spanBar = cal.querySelector('.spanning-bar');
    const spanDay = (() => {
      const row = spanBar && spanBar.closest('.week-row');
      const cellsIn = row ? [...row.querySelectorAll('.day-cell[data-day]')] : [];
      const spaced = cellsIn.filter((c) => c.querySelector('.day-spanning-spacer'));
      return spaced.length ? +spaced[0].dataset.day : 0;
    })();

    // ---- the days this month actually has something on ----
    // Read off the deal, in date order. The two the tour writes are not here:
    // they are held off every calendar on the page, and a story that put them
    // on would be handing the tour a month it cannot then write into.
    const held = new Set(HELD.map((h) => h.day));
    const dealt = [...DEAL.byDay]
      .filter(([d]) => !held.has(d))
      .sort((a, b) => a[0] - b[0]);

    // Seven of them get a message and a stop. Only days whose feature has
    // something to say are eligible — a feature added to FEATURES without a
    // line in INBOX quietly fills in with the rest rather than stopping the
    // story on a day nobody wrote — and they are picked evenly across the
    // month rather than taken from the front, so the story runs the length of
    // the month instead of finishing in its first week. The days that are not
    // stopped on fill in behind the black, which is what they look like.
    // The 1st and the last day are spoken for — one opens the month empty and
    // one hands it over full — so a stop on either would put the same date on
    // the rail twice and cut to black twice on one day.
    const tellable = dealt.filter(([d, f]) => INBOX[f.name] && d > 1 && d < M.days);
    // Five. It was seven when the scroll picked the day and the reader set the
    // pace; now the film runs at its own, and every stop is roughly four
    // seconds nobody can skip past. Five days of a month is enough to show a
    // month happening, and the tour below performs eight more.
    const STOPS = Math.min(5, tellable.length);
    const told = new Set();
    for (let i = 0; i < STOPS; i++) {
      told.add(tellable[STOPS === 1 ? 0 : Math.round((i * (tellable.length - 1)) / (STOPS - 1))][0]);
    }

    // ---- the beats ----
    // The 1st, then every day worth stopping on, then the 30th. The first and
    // the last are the only two invented: the month has to start somewhere
    // empty, and it has to be handed over full.
    const OPEN = {
      day: 1,
      copy: { eyebrow: `${M.month.toUpperCase()} ${M.y}`, title: 'An empty month.',
        lead: 'Thirty days, nothing on them yet. Everything that lands here from now on lands because somebody asked for it.' },
    };
    const CLOSE = {
      day: M.days,
      copy: { eyebrow: `${M.days} DAYS · ${dealt.length} OF THEM SPOKEN FOR`,
        title: 'And it is the wallpaper.',
        lead: 'Desktop mode drops the frame and hands the month to the desktop itself. Nothing to arrange, and nothing sitting on top of anything.' },
    };
    const BEATS = [OPEN,
      ...dealt.filter(([d]) => told.has(d)).map(([d, f]) => {
        const m = INBOX[f.name];
        return { day: d, feature: f, msg: m,
          copy: { eyebrow: f.name.toUpperCase(), title: m.did, lead: m.lead } };
      }),
      CLOSE];

    // ---- the grid, day by day ----
    const showDay = (d, on) => {
      const c = cellFor(d);
      if (!c) return;
      c.classList.toggle('is-on', on);
      marks(d).forEach((el) => el.classList.toggle('is-on', on));
      if (spanDay && d === spanDay && spanBar) spanBar.classList.toggle('is-on', on);
    };
    // everything up to and including `d`, and nothing after it
    const upTo = (d) => { for (let n = 1; n <= M.days; n++) showDay(n, n <= d); };

    // ---- the cut ----
    const blackTo = (on) => { black.classList.toggle('is-on', !!on); };
    // `on` is coerced: classList.toggle(name, undefined) flips the class rather
    // than clearing it, and a settle that flipped this on would leave the next
    // cut showing its date before the black had arrived under it.
    const dateCard = (d, on) => {
      if (on) {
        const dt = new Date(M.y, M.m, d);
        blackDow.textContent = dt.toLocaleString('en-US', { weekday: 'long' });
        blackDay.textContent = `${M.month} ${ORDINAL(d)}`;
      }
      black.classList.toggle('is-said', !!on);
    };

    const showMsg = (m, on) => {
      if (on) {
        $('#msg-who').textContent = m.who;
        $('#msg-dot').style.background = m.dot;
        $('#msg-body').textContent = m.text;
        msg.classList.toggle('is-app', !!m.app);
      }
      msg.classList.toggle('is-on', !!on);
    };

    const rail = $('#month-rail');
    rail.innerHTML = BEATS.map((b) => `<li class="month-tick">${pad2(b.day)}</li>`).join('');
    const ticks = [...rail.children];

    const say = (i) => {
      const c = BEATS[i] ? BEATS[i].copy : null;
      $('#month-eyebrow').textContent = c ? c.eyebrow : '';
      $('#month-title').textContent = c ? c.title : '';
      $('#month-lead').textContent = c ? c.lead : '';
      ticks.forEach((t, k) => t.classList.toggle('is-at', k === i));
    };

    // ---- the film ----
    // One screen, and it plays itself all the way through. It used to be a tall
    // section with the scroll picking the day, and that was the wrong shape for
    // it: one flick of a trackpad crossed four days at once, so the reader was
    // handed a month that had visibly changed and no account of how. A story
    // cannot be scrubbed. It is told at the speed it is told at.
    //
    // Leaving is the only control, and it does what leaving a film does: the
    // rest of it is over, and the month is handed over finished.
    const settle = (i) => {
      const b = BEATS[i];
      blackTo(false); dateCard(0, false); showMsg(null, false);
      upTo(b.day);
      say(i);
    };

    let token = 0, done = false;
    const HALT = {};

    const finish = () => {
      done = true;
      if (cue.textContent !== 'NOW WATCH IT WORK') cue.textContent = 'NOW WATCH IT WORK';
    };

    async function film() {
      token++;
      const mine = token;
      const w = (ms) => new Promise((r) => setTimeout(r, ms))
        .then(() => { if (token !== mine) throw HALT; });

      for (let i = 0; i < BEATS.length; i++) {
        const b = BEATS[i];

        // the cut: the screen goes, the date is said on the black, and the days
        // nothing was said on land behind it — so the month is never skipped
        // and never seen jumping
        blackTo(true);
        showMsg(null, false);
        await w(260);
        dateCard(b.day, true);
        upTo(b.day);
        say(i);
        await w(i === 0 ? 900 : 700);
        dateCard(0, false);
        await w(230);
        blackTo(false);

        // and then the day itself: something comes in, and the calendar takes it
        if (b.msg) {
          await w(380);
          showMsg(b.msg, true);
          await w(1250);
          const box = evBox(b.day);
          if (box) { box.classList.remove('is-landed'); void box.offsetWidth; box.classList.add('is-landed'); }
          await w(800);
          showMsg(null, false);
          await w(260);
        } else {
          await w(i === BEATS.length - 1 ? 700 : 520);
        }
      }
      finish();
    }

    upTo(0);
    say(0);
    return {
      start() {
        if (REDUCED()) { settle(BEATS.length - 1); finish(); return; }
        cue.textContent = 'WATCH';
        film().catch((e) => { if (e !== HALT) throw e; });
      },
      // Scrolling off the screen ends it, whatever it was in the middle of —
      // the same contract every step on this page keeps. The month is handed
      // over finished rather than frozen halfway through the 12th.
      leave() {
        if (done) return;
        token++;
        settle(BEATS.length - 1);
        finish();
      },
    };
  }

  // ---------- 2. the tour — the calendar uses itself ----------
  // The wall leaves ours standing on the desktop. This picks it up and works
  // it: QuickAdd writes an event out of one sentence, the hand drags it, the
  // daily planner takes a day apart, a tag empties the month down to one
  // project, the decorate layer marks it up, a second device agrees with it,
  // and then the hand leaves and an agent writes one while nobody is there.
  //
  // Everything a step touches is the app's: the bar is QuickAdd.tsx, the window
  // is DailyPlanner.tsx, the pills are TagFilterBar.tsx, the stickers are
  // FreeStickerItem.tsx, the side panel is SchedulePanel, and every event on
  // the grid is drawn by the same eventHTML as every other one. The English on
  // them is the app's own en locale, not a paraphrase.
  //
  // Nothing here is a video and nothing is a mock-up — the DOM really changes,
  // which is the whole reason a step also has to know how to put itself back.
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

  // ---- the app's QuickAdd ----
  // QuickAdd.tsx: one bar, and under it what the parser made of the line. The
  // confidence is not decorative — utils/quickParse.ts scores 0.3 for a title,
  // +0.25 for a date and +0.25 for a time, so a line carrying all three comes
  // out at 80%. Typing a different line here would make that number a lie.
  const QUICK_TEXT = 'Lunch with Sam';
  const QUICK_TIME = '13:00';
  const quickHTML = (when) =>
    '<div class="app dark blue">' +
      '<div class="quick-add-container">' +
        '<div class="quick-add-bar">' +
          `<span class="quick-add-date">${when}</span>` +
          '<span class="quick-add-input" id="qa-in"><i></i><span class="type-caret"></span></span>' +
          '<span class="quick-add-counter" id="qa-n">0/50</span>' +
          '<span class="quick-add-hint">↵</span>' +
        '</div>' +
        '<div class="quick-add-preview" id="qa-prev">' +
          '<div class="quick-add-preview-header">' +
            '<span class="quick-add-preview-label">Parsed result</span>' +
            '<span class="quick-add-preview-confidence">80%</span>' +
          '</div>' +
          '<div class="quick-add-preview-fields">' +
            `<div class="quick-add-preview-row"><span class="quick-add-preview-icon">📅</span><span>${when}</span></div>` +
            `<div class="quick-add-preview-row"><span class="quick-add-preview-icon">⏰</span><span>${QUICK_TIME}</span></div>` +
            `<div class="quick-add-preview-row"><span class="quick-add-preview-icon">📝</span><span>${QUICK_TEXT}</span></div>` +
          '</div>' +
          '<div class="quick-add-preview-actions">' +
            '<span class="quick-add-btn quick-add-btn-cancel">Cancel</span>' +
            '<span class="quick-add-btn quick-add-btn-confirm" id="qa-ok">Create event</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  // ---- the app's DailyPlanner ----
  // DailyPlanner.tsx, on its Review tab: the day, how much of it is done, then
  // what is scheduled and what is finished. The strings are the app's en
  // locale, down to the shape of "{{completed}}/{{total}} done ({{percent}}%)".
  const plannerHTML = (cell, events) => {
    const done = events.filter((e) => e.done).length;
    const pct = events.length ? Math.round((done / events.length) * 100) : 0;
    const d = +cell.dataset.day;
    const row = (e) =>
      `<div class="dp-event-item${e.done ? ' completed' : ''}">` +
        `<span class="dp-check-btn${e.done ? ' checked' : ''}">${e.done ? '☑' : '☐'}</span>` +
        (e.color ? `<span class="dp-event-color" style="background:${e.color}"></span>` : '') +
        '<span class="dp-event-info">' +
          `<span class="dp-event-title">${e.t}</span>` +
          (e.time ? `<span class="dp-event-time">${e.time}</span>` : '') +
        '</span>' +
      '</div>';
    const open = events.filter((e) => !e.done);
    const shut = events.filter((e) => e.done);
    return '<div class="app dark blue"><div class="daily-planner">' +
      '<div class="daily-planner-header">' +
        '<span class="daily-planner-title">Daily Planner</span>' +
        '<span class="dp-close-btn">×</span>' +
      '</div>' +
      '<div class="daily-planner-date">' +
        `<span class="dp-day-name">${DOW_LONG[new Date(M.y, M.m, d).getDay()]}</span>` +
        `<span class="dp-date-label">${cell.dataset.when}</span>` +
      '</div>' +
      '<div class="dp-progress-section">' +
        `<div class="dp-progress-bar"><div class="dp-progress-fill" style="width:${pct}%"></div></div>` +
        `<div class="dp-progress-text">${done}/${events.length} done (${pct}%)</div>` +
      '</div>' +
      '<div class="dp-tabs">' +
        '<span class="dp-tab active">Review</span>' +
        '<span class="dp-tab">Timeline</span>' +
        '<span class="dp-tab">Summary</span>' +
      '</div>' +
      '<div class="daily-planner-body">' +
        '<div class="dp-section">' +
          `<div class="dp-section-header">Scheduled (${open.length})</div>` +
          `<div class="dp-event-list">${open.map(row).join('') ||
            '<div class="dp-empty">No scheduled events</div>'}</div>` +
        '</div>' +
        (shut.length ? '<div class="dp-section">' +
          `<div class="dp-section-header completed">Completed (${shut.length})</div>` +
          `<div class="dp-event-list">${shut.map(row).join('')}</div>` +
        '</div>' : '') +
      '</div>' +
    '</div></div>';
  };

  // ---- the app's mood sticker picker ----
  // constants/stickers.ts MOOD_EMOJIS, all twenty of them, five to a row the
  // way MoodStickerPicker lays them out.
  const MOOD_EMOJIS = [
    '😊', '😄', '🥰', '😎', '🤩',
    '😐', '😴', '🤔', '😤', '😢',
    '😡', '🤒', '💪', '🎉', '☕',
    '📚', '🏃', '🎵', '✨', '❤️',
  ];
  const moodHTML = (pick) =>
    '<div class="app dark blue"><div class="mood-sticker-picker">' +
      `<div class="mood-sticker-picker-grid">${MOOD_EMOJIS.map((e) =>
        `<span class="mood-sticker-option${e === pick ? '' : ''}" data-e="${e}">${e}</span>`).join('')}</div>` +
      '<div class="mood-sticker-remove">Remove</div>' +
    '</div></div>';

  function initTour() {
    const pin = $('.tour-pin');
    const stage = $('#tour-stage');
    const panel = $('#tour-panel');
    const quick = $('#tour-quick');
    const planner = $('#tour-planner');
    const mood = $('#tour-mood');
    const agent = $('#tour-agent');
    const mirror = $('#tour-mirror');
    const ptr = $('#tour-ptr');
    const rail = $('#tour-rail');

    const cal = buildCalendar();
    stage.appendChild(cal);

    const cells = () => [...cal.querySelectorAll('.day-cell[data-day]')];
    // Days are held as NUMBERS, never as nodes: the grid outlives no step by
    // accident, and a number survives anything a step does to the DOM.
    const cellFor = (d) => cal.querySelector(`.day-cell[data-day="${d}"]`);

    // ---- the two events the tour writes ----
    // Held off every calendar on the page — see HELD/holdFrom above.
    holdFrom(cal);
    const WRITTEN = HELD[0].ev;   // step 1 writes it back in with QuickAdd
    const SYNCED = HELD[1].ev;    // step 6 syncs it in from Google

    // ---- the days each step works on ----
    // Read off the grid rather than assumed: the month is a different shape
    // every time somebody opens the page.
    const free = cells().filter((c) => !c.querySelector('.day-events-detail') &&
      !c.querySelector('.day-spanning-spacer'));
    // QuickAdd's parser (utils/quickParse.ts) reads relative days and named
    // dates. It does NOT read weekday names, so the day is chosen first and the
    // sentence is written to match — never the other way round.
    const pair = free.find((c) => {
      const to = cellFor(+c.dataset.day + 2);
      return to && to.closest('.week-row') === c.closest('.week-row') && free.includes(to);
    });
    const FROM = +(pair || free[0] || cells()[0]).dataset.day;
    const TO = pair ? FROM + 2 : +(free[1] || cells()[1]).dataset.day;
    const qPhrase = FROM === M.today + 1
      ? `${QUICK_TEXT} tomorrow 1pm`
      : `${QUICK_TEXT} ${M.month} ${FROM} 1pm`;

    // the day the planner takes apart: the overcommitted one, which is the only
    // day in the month carrying more than the grid can show
    const PLAN_F = FEATURES.find((f) => f.name === 'Overcommit warning');
    const PLAN = ([...DEAL.byDay].find(([, v]) => v === PLAN_F) || [])[0];
    const PLAN_EVENTS = [...PLAN_F.events.filter((e) => !e.more), ...(PLAN_F.extra || [])];

    // the day the sync lands on, and the day the agent writes on — two
    // different days, or the last two steps would pile onto one cell
    const SYNC_DAY = +(free[free.length - 1] || cells()[cells().length - 1]).dataset.day;
    const AGENT_DAY = +(free[free.length - 2] || free[free.length - 1] ||
      cells()[cells().length - 1]).dataset.day;
    const AGENT = [
      { call: 'create_event', ev: { t: 'Sprint retro', time: '16:00', color: '#5856D6' } },
      { call: 'create_event', ev: { t: 'Write the recap', time: '17:30' } },
    ];

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

    // ---- the overlays ----
    const show = (el, on, squeeze) => {
      el.classList.toggle('is-open', on);
      el.setAttribute('aria-hidden', on ? 'false' : 'true');
      if (squeeze) pin.classList.toggle('is-panel-open', on);
    };
    const shutAll = () => {
      show(panel, false, true);
      show(quick, false);
      show(planner, false);
      show(mood, false);
      quick.classList.remove('is-typing');
    };

    // ---- what a step puts on the grid ----
    // Everything is marked with the step that put it there, so undo takes back
    // exactly its own things and leaves the month it found alone.
    const putEvent = (day, ev, mark, root = cal) => {
      const cell = root.querySelector(`.day-cell[data-day="${day}"]`);
      if (!cell) return null;
      let box = cell.querySelector('.day-events-detail');
      if (!box) {
        box = document.createElement('div');
        box.className = 'day-events-detail';
        box.dataset.made = mark;
        cell.querySelector('.day-cell-content').appendChild(box);
      }
      box.insertAdjacentHTML('beforeend', eventHTML(ev));
      const row = box.lastElementChild;
      row.dataset.put = mark;
      return row;
    };
    const dropEvents = (mark, root = cal) => {
      root.querySelectorAll(`.day-event-row[data-put="${mark}"]`).forEach((r) => r.remove());
      root.querySelectorAll(`.day-events-detail[data-made="${mark}"]`).forEach((b) => {
        if (!b.children.length) b.remove();
      });
    };
    const lit = (d, on) => {
      const c = cellFor(d);
      if (c) c.classList.toggle('is-lit', on);
    };
    // ticking something off in the planner has to reach the month, because the
    // two are not two views of the appointment — they are the appointment
    const strike = (day, title, on) => {
      const cell = cellFor(day);
      if (!cell) return;
      [...cell.querySelectorAll('.day-event-row')]
        .filter((r) => r.textContent.indexOf(title) === 0)
        .forEach((r) => {
          r.classList.toggle('completed', on);
          const t = r.querySelector('.day-event-title');
          if (t) t.classList.toggle('completed', on);
        });
    };

    // ---- the app's tag filter bar, in the app's own place ----
    // TagFilterBar renders inside the calendar, under its header, whenever the
    // month has tags — so it is built once and lives there, rather than being
    // conjured for one step.
    const bar = document.createElement('div');
    bar.className = 'tag-filter-bar';
    bar.innerHTML = TAGS.map((t) =>
      `<span class="tag-filter-pill" data-c="${t.color}">` +
        `<span class="tag-filter-dot" style="background:${t.color}"></span>` +
        `<span class="tag-filter-label">${t.name}</span></span>`).join('') +
      '<span class="tag-filter-clear">×</span>';
    cal.querySelector('.calendar-header').after(bar);

    // The app FILTERS: an event without the tag leaves the day (App.tsx
    // getFilteredEventsForDate). It is not dimmed, so nothing here dims it.
    const filter = (colour) => {
      bar.classList.toggle('has-filter', !!colour);
      bar.querySelectorAll('.tag-filter-pill').forEach((p) =>
        p.classList.toggle('active', p.dataset.c === colour));
      cal.querySelectorAll('.day-event-row').forEach((r) =>
        r.classList.toggle('is-filtered',
          !!colour && !(r.dataset.tags || '').split(' ').includes(colour)));
      cal.querySelectorAll('.day-event-more, .spanning-bar').forEach((el) =>
        el.classList.toggle('is-filtered', !!colour));
    };

    // ---- the decorate layer, where the app puts it ----
    const layer = document.createElement('div');
    layer.className = 'free-stickers-layer';
    cal.querySelector('.days-grid-container').appendChild(layer);
    // Sized against the month it is being stuck on, not in absolute pixels: 78px
    // is a sticker on a desktop and a blot across four days on a handset.
    const STICKER = { emoji: '✨', x: 74, y: 32, rot: -17 };
    const stickerPx = () =>
      Math.round(Math.max(42, Math.min(78, stage.getBoundingClientRect().width * 0.058)));
    // `editing` is the mode, not the sticker: the play turns it on to show the
    // handles and the dashed layer, and settle leaves it — because edit mode is
    // something you come out of, and the later steps should not be looking at
    // a selection nobody is holding.
    const decorate = (on, turned, editing) => {
      const px = stickerPx();
      layer.classList.toggle('edit-mode', on && editing);
      layer.innerHTML = on
        ? `<div class="free-sticker-item${editing ? ' editable selected' : ''}" style="left:${STICKER.x}%;top:${STICKER.y}%;` +
            `width:${px}px;height:${px}px;` +
            `transform:translate(-50%,-50%) rotate(${turned ? STICKER.rot : 0}deg)">` +
            '<div class="free-sticker-content">' +
              `<span class="free-sticker-emoji" style="font-size:${Math.round(px * 0.75)}px">${STICKER.emoji}</span>` +
            '</div>' +
            // the app shows these only on the selected sticker, in edit mode
            (editing
              ? '<span class="free-sticker-delete">×</span>' +
                '<span class="free-sticker-rotate-stem"></span>' +
                '<span class="free-sticker-rotate-handle"></span>' +
                '<span class="free-sticker-resize-handle"></span>'
              : '') +
          '</div>'
        : '';
      return layer.firstElementChild;
    };
    const MOOD = '💪';
    const setMood = (day, on) => {
      const head = cellFor(day) && cellFor(day).querySelector('.day-cell-header');
      if (!head) return;
      const had = head.querySelector('.day-mood-sticker[data-tour]');
      if (had) had.remove();
      if (!on) return;
      const s = document.createElement('span');
      s.className = 'day-mood-sticker';
      s.dataset.tour = '1';
      s.textContent = MOOD;
      head.appendChild(s);
    };

    // ---- the second device ----
    let twin = null;
    const split = (on) => {
      if (on && !twin) {
        // The same account, so it is the same month — held the same way, and
        // already carrying what this tour has written and moved. Two devices
        // that disagree about anything but the thing being synced would make
        // the step say the opposite of what it means.
        twin = buildCalendar();
        holdFrom(twin);
        putEvent(TO, WRITTEN, 'q', twin);
        // the same tags too — without the bar its grid starts 20px higher than
        // ours, and two months that do not line up read as two months
        twin.querySelector('.calendar-header').after(bar.cloneNode(true));
        $('#tour-mirror-stage').appendChild(twin);
      }
      pin.classList.toggle('is-split', on);
      mirror.setAttribute('aria-hidden', on ? 'false' : 'true');
    };

    // ---- the steps ----
    const STEPS = [
      {
        title: 'Say it in one line.',
        tier: 'FREE',
        lead: 'QuickAdd pulls the date, the time and the title out of a sentence — with a ' +
          'regular expression, on your machine. Nothing is sent anywhere and there is no ' +
          'model to wait for.',
        async play(w) {
          hand(true);
          quick.innerHTML = quickHTML(cellFor(FROM).dataset.when);
          $('#qa-prev').classList.add('is-hidden');
          show(quick, true);
          await w(420);
          const box = $('#qa-in');
          pointAt(box, 0.1, 0.5);
          quick.classList.add('is-typing');
          await w(340);
          for (let i = 1; i <= qPhrase.length; i++) {
            box.querySelector('i').textContent = qPhrase.slice(0, i);
            $('#qa-n').textContent = `${i}/50`;
            await w(qPhrase[i - 1] === ' ' ? 84 : 44);
          }
          quick.classList.remove('is-typing');
          await w(260);
          $('#qa-prev').classList.remove('is-hidden');
          await w(900);
          pointAt($('#qa-ok'));
          await w(520);
          click();
          await w(220);
          this.settle();
        },
        settle() {
          shutAll();
          dropEvents('q');
          const row = putEvent(FROM, WRITTEN, 'q');
          if (row) row.parentElement.classList.add('is-landed');
        },
        undo() { shutAll(); dropEvents('q'); },
      },
      {
        title: 'Then move it with your hand.',
        tier: 'FREE',
        lead: 'It is a desktop calendar, so an appointment moves the way anything on a ' +
          'desktop moves. Pick it up, drop it on another day; the day you dropped it on is ' +
          'the day it is on.',
        async play(w) {
          shutAll();
          const from = cellFor(FROM), to = cellFor(TO);
          const row = from && from.querySelector('.day-event-row[data-put="q"]');
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
          row.style.opacity = '0.25';
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
          shutAll();
          dropEvents('q');
          const row = putEvent(TO, WRITTEN, 'q');
          if (row) row.parentElement.classList.add('is-landed');
        },
        undo() { dropEvents('q'); putEvent(FROM, WRITTEN, 'q'); },
      },
      {
        title: 'Take one day apart.',
        tier: 'FREE',
        lead: 'P opens the planner on a day: what is scheduled, what is done, and how far ' +
          'through it you are. Tick something there and the month agrees with you — they ' +
          'are not two views of the appointment, they are the appointment.',
        async play(w) {
          shutAll();
          const cell = cellFor(PLAN);
          if (!cell || !PLAN_EVENTS.length) { this.settle(); return; }
          hand(true);
          planner.innerHTML = plannerHTML(cell, PLAN_EVENTS);
          show(planner, true);
          lit(PLAN, true);
          await w(900);
          pointAt(planner.querySelector('.dp-check-btn'));
          await w(620);
          click();
          await w(220);
          this.settle();
        },
        settle() {
          shutAll();
          const cell = cellFor(PLAN);
          if (!cell || !PLAN_EVENTS.length) return;
          const marked = PLAN_EVENTS.map((e, i) => (i ? e : { ...e, done: true }));
          planner.innerHTML = plannerHTML(cell, marked);
          show(planner, true);
          lit(PLAN, true);
          strike(PLAN, PLAN_EVENTS[0].t, true);
        },
        undo() {
          shutAll();
          lit(PLAN, false);
          if (PLAN_EVENTS.length) strike(PLAN, PLAN_EVENTS[0].t, false);
        },
      },
      {
        title: 'Keep one project, lose the rest.',
        tier: 'PRO',
        lead: 'Tag the month, then press a tag. What does not carry it leaves the day — the ' +
          'filter takes events out rather than greying them down, so what is left is a ' +
          'month you can actually read.',
        async play(w) {
          shutAll();
          lit(PLAN, false);
          hand(true);
          const pill = bar.querySelector(`.tag-filter-pill[data-c="${TAG.Client}"]`);
          pointAt(pill);
          await w(760);
          click();
          await w(200);
          this.settle();
        },
        settle() { shutAll(); lit(PLAN, false); filter(TAG.Client); },
        undo() { filter(null); },
      },
      {
        title: 'Then make it yours.',
        tier: 'PRO',
        lead: 'One emoji on a day for how it went, and a layer over the whole month you can ' +
          'put anything on — drag it, size it, turn it. It is a calendar you are allowed to ' +
          'decorate.',
        async play(w) {
          filter(null);
          hand(true);
          const cell = cellFor(TO);
          mood.innerHTML = moodHTML(MOOD);
          const p = pin.getBoundingClientRect();
          const r = (cell || cells()[0]).getBoundingClientRect();
          mood.style.left = `${Math.min(r.left - p.left, p.width - 230)}px`;
          mood.style.top = `${r.bottom - p.top + 6}px`;
          show(mood, true);
          await w(560);
          const opt = mood.querySelector(`.mood-sticker-option[data-e="${MOOD}"]`);
          pointAt(opt);
          await w(620);
          click();
          opt.classList.add('active');
          setMood(TO, true);
          await w(520);
          show(mood, false);

          const item = decorate(true, false, true);
          await w(520);
          pointAt(item.querySelector('.free-sticker-rotate-handle'));
          await w(560);
          click();
          item.style.transform = `translate(-50%,-50%) rotate(${STICKER.rot}deg)`;
          await w(900);
          this.settle();
        },
        settle() {
          shutAll();
          filter(null);
          setMood(TO, true);
          decorate(true, true, false);
        },
        undo() { shutAll(); setMood(TO, false); decorate(false, false, false); filter(TAG.Client); },
      },
      {
        title: 'Two of them, agreeing.',
        tier: 'PRO',
        lead: 'Cloud sync carries events, memos, settings and tags between your machines, ' +
          'and the push is live rather than on a timer. Google Calendar and CalDAV go both ' +
          'ways on the same wire.',
        async play(w) {
          shutAll();
          hand(false);
          split(true);
          await w(900);
          const there = putEvent(SYNC_DAY, SYNCED, 'g', twin);
          if (there) there.parentElement.classList.add('is-landed');
          await w(1000);
          const here = putEvent(SYNC_DAY, SYNCED, 'g');
          if (here) here.parentElement.classList.add('is-landed');
          await w(400);
        },
        settle() {
          shutAll();
          split(true);
          dropEvents('g'); dropEvents('g', twin);
          putEvent(SYNC_DAY, SYNCED, 'g', twin);
          putEvent(SYNC_DAY, SYNCED, 'g');
        },
        undo() {
          dropEvents('g');
          if (twin) dropEvents('g', twin);
          split(false);
        },
      },
      {
        title: 'And you do not have to be here.',
        tier: 'FREE',
        lead: 'Turn on MCP and an agent works the calendar over a local socket — a named ' +
          'pipe, not a port, and nothing leaves the machine. It writes the event; you find ' +
          'it already there, in the app’s own panel, with everything filled in.',
        async play(w) {
          shutAll();
          split(false);
          hand(false);                       // this one happens without a hand
          agent.innerHTML = '';
          agent.setAttribute('aria-hidden', 'false');
          await w(500);
          for (const a of AGENT) {
            const line = document.createElement('p');
            line.className = 'tour-agent-line';
            line.innerHTML = `<b>${a.call}</b> ${cellFor(AGENT_DAY).dataset.when} · ` +
              `${a.ev.time} · “${a.ev.t}”`;
            agent.appendChild(line);
            await w(120);
            line.classList.add('is-in');
            await w(680);
            const row = putEvent(AGENT_DAY, a.ev, 'a');
            if (row) row.parentElement.classList.add('is-landed');
            await w(700);
          }
          await w(500);
          this.settle();
        },
        settle() {
          shutAll();
          split(false);
          agent.setAttribute('aria-hidden', 'false');
          agent.innerHTML = AGENT.map((a) =>
            `<p class="tour-agent-line is-in"><b>${a.call}</b> ${cellFor(AGENT_DAY).dataset.when} · ` +
            `${a.ev.time} · “${a.ev.t}”</p>`).join('');
          dropEvents('a');
          AGENT.forEach((a) => putEvent(AGENT_DAY, a.ev, 'a'));
          const cell = cellFor(AGENT_DAY);
          $('#tour-panel-when').textContent = cell.dataset.when;
          $('#tour-panel-list').innerHTML = scheduleDay(cell, AGENT.map((a) => a.ev));
          show(panel, true, true);
          lit(AGENT_DAY, true);
        },
        undo() {
          shutAll();
          agent.setAttribute('aria-hidden', 'true');
          agent.innerHTML = '';
          dropEvents('a');
          lit(AGENT_DAY, false);
          split(true);
        },
      },
    ];

    // ---- the rail: where you are, and how much is left ----
    // Numbers only. The step's title is already on the plate to the left, and a
    // rail that carried it too came out ragged — an `opacity: 0` title still
    // takes its width, so the ticks sat on different lines.
    rail.innerHTML = STEPS.map((_, i) => `<li class="tour-tick">${pad2(i + 1)}</li>`).join('');
    const ticks = [...rail.querySelectorAll('.tour-tick')];

    // ---- the engine ----
    let at = -1;            // the last step whose end state is on screen
    let token = 0;          // cancels a play() that the reader has scrolled past
    const HALT = {};

    const say = (i) => {
      const s = STEPS[i];
      $('#tour-n').textContent = `${pad2(i + 1)} / ${pad2(STEPS.length)}`;
      $('#tour-tier').textContent = s ? s.tier : '';
      $('#tour-tier').className = `tour-tier${s && s.tier === 'PRO' ? ' is-pro' : ''}`;
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
      cal.querySelectorAll('.day-event-row[style]').forEach((r) => { r.style.opacity = ''; });
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
      // which runs at load while the reader is still on the month, would play
      // step one to an empty room.
      at: (p) => {
        if (p <= 0) { goTo(-1, false); return; }
        goTo(Math.min(STEPS.length - 1, Math.floor(p * STEPS.length)), true);
      },
    };
  }

  // ---------- scroll scrub — one rAF-throttled pass drives every section ----------
  // Two sections, two pins, one pass. Each is told a position between 0 and 1
  // and works out for itself what that means; neither is ever told a direction,
  // which is why scrolling up puts things back instead of replaying them.
  function initScrub(month, tour) {
    const monthSec = $('#month');
    const tourSec = $('#tour');

    // progress of a tall section behind its sticky pin, 0 → 1
    const prog = (el) => {
      const r = el.getBoundingClientRect();
      const span = r.height - innerHeight;
      return span <= 0 ? 0 : clamp01(-r.top / span);
    };

    let queued = false;

    function run() {
      queued = false;

      // The month is one screen and it plays itself, so there is nothing for
      // the scroll to pick. It only has to be told when the reader has left,
      // which ends it — the same thing leaving does to every step on this page.
      if (monthSec.getBoundingClientRect().bottom < innerHeight * 0.7) month.leave();

      // the tour — scroll picks the step and the step plays itself. The engine
      // is told a position, never a direction: it works out for itself what to
      // play, what to snap past, and what to put back.
      tour.at(prog(tourSec));
    }

    const request = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', request);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(request);
    run();
    // handed back so the loader can ask for one more frame on its way out: the
    // month is sitting behind a full-screen cover until then
    return request;
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
    const plane = buildCalendar();
    holdFrom(plane);           // the month the story hands over is the month the tour picks up
    $('#plane-cal').appendChild(plane);
    const month = initMonth();
    const tour = initTour();
    const request = initScrub(month, tour);
    // the story owns the screen the moment the loader lets go of it
    runLoader(() => { month.start(); request(); });
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
