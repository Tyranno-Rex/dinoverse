// BRACHY CALENDAR — page logic.
//
// Two screens, and neither of them is a picture.
//
//   1. WALL — every feature the product has, all at once, set on a wallpaper.
//             The count is read off the list rather than typed next to it.
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
// The page runs on the visitor's real date throughout: the loader draws this
// actual month and stops on today, and every step works on days this month
// really has.
//
// Stage one is CSS only. The two WebGL moments (wall sheen, wallpaper
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

  // ---------- the catalogue: everything the product does ----------
  // Transcribed from mesozoic's docs/spec/FEATURE_MATRIX.md, which is written
  // against the code rather than against a plan — section by section, in its
  // order, one line per row of its tables. A leading * means the app gates it
  // behind PRO, and that mark is the matrix's, not this page's.
  //
  // The two repositories are separate, so nothing keeps this in step
  // automatically. It is a snapshot of the matrix dated 2026-08-31; when the
  // product grows, this list has to be brought over by hand.
  //
  // The wall's numbers are counted off these arrays at run time. A count typed
  // next to a list is a claim; a count read out of it cannot be wrong.
  const CATALOG = [
    // 2.1 views and navigation
    'Month, week, day and agenda views',
    'A custom N-day view',
    'Year heatmap',
    'Today, previous, next — and jump to any month',
    'Mini calendar in the day view',
    'Timeline scrubber',
    '*Tag filter bar',
    '*Account filter bar',
    'Overcommit warning',
    // 2.2 events
    'Create, edit, delete, duplicate',
    'Write one in its own window',
    'Drag an event to another day',
    'Drag its edges to change the time',
    'Title, notes, start and end, all-day',
    'Multi-day events',
    'Location, and locations you have saved',
    'Several links, each with its own label',
    'Meet, Zoom and Teams links recognised',
    'Attendees and organiser, read from the invite',
    'D-day countdown',
    'Buffer time before and after',
    'Completion, per repeat instance',
    'Time-conflict detection',
    '*Per-event colour',
    '*Tags on an event',
    '*Save and apply templates',
    '*Assign an event to an account',
    // 2.3 repeats
    'Daily, weekly, monthly, yearly — every N',
    'Ends on a date, or after N times',
    'Edit or skip a single occurrence',
    'This one, or all the ones after it',
    // 2.4 reminders
    'Several reminders on one event',
    'OS-native notification scheduler',
    'Snooze',
    'Join the meeting from the notification',
    // 2.5 memos, pomodoro, planner, time
    'Memos, and memo windows',
    'Pomodoro timer, started from an event',
    'The daily planner',
    'Focus-time suggestions',
    'Share your free slots',
    '*Statistics and charts',
    // 2.6 search, quick add, birthdays
    'Search, in a modal or its own window',
    'QuickAdd — parsed on the device',
    'Birthdays, drawn on the month',
    // 2.7 stickers
    'Mood stickers',
    'Your own images as stickers',
    '*Decorate mode — place, size, rotate',
    // 2.8 appearance, display, layout
    'Light and dark',
    'Accent colour',
    'Font size',
    'Window opacity, or background only',
    'Colourblind-friendly palette',
    'Reduce motion',
    'Holidays, lunar dates, adjacent months, grid lines, ISO week numbers',
    'Event dots, for a compact month',
    'Events per cell, and columns within one',
    'Hide weekdays you do not use',
    'Carry unfinished days forward',
    'Overcommit warning, and where the line is',
    'Schedule panel left or right, and pinned',
    'Always on top, resize mode, drag, fit to screen',
    'Desktop mode — it becomes the wallpaper',
    'Tray icon',
    '*Weather in the day',
    // 2.9 time and language
    'First day of the week',
    'When your day starts',
    '12 or 24 hour',
    'Up to two more time zones',
    'Six languages, or follow the system',
    'Locale defaults applied for you',
    // 2.10 data in and out
    'Export and import JSON',
    'Import and export iCal',
    'Export the month as PDF',
    'Automatic backup, encrypted, five kept',
    'Undo and redo',
    // 2.11 account and subscription
    'Sign in with Google',
    'Subscription status, and the upgrade sheet',
    'Redeem a coupon',
    'Card payment',
    'Manage, cancel or reactivate',
    'Delete your account and everything in it',
    '*Link up to three email addresses',
    '*Choose the account new events go to',
    // 2.12 external calendars
    '*Google Calendar, both ways',
    '*CalDAV, both ways',
    '*Background sync every 15 minutes',
    '*Credentials in the OS keychain only',
    '*Subscribe to an iCal feed',
    // 2.13 cloud
    '*Cloud sync — events, memos, settings, tags',
    '*Live push over SSE',
    '*How much storage you are using',
    '*Erase everything on the server',
    // 2.14 MCP
    'MCP connection, off until you turn it on',
    'Local socket only — no network port',
    'list, create and update events',
    'list, create and update memos and tags',
    'Connecting copies a prompt, and touches nothing else',
    // 2.15 onboarding
    'A tour on first run',
    'Tip of the day',
    '*Privacy re-consent when you upgrade',
  ];

  // The matrix counts these among its rows, but each one is a second way into a
  // feature already on the list above. Counting them again would inflate the
  // total, so they get their own band and their own number.
  const KEYS = [
    ['N', 'new event'], ['Q', 'quickadd'], ['P', 'planner'], ['T', 'today'],
    ['← →', 'prev · next'], ['1 2 3 4', 'month · week · day · agenda'],
    ['Ctrl K', 'search'], ['Ctrl Z', 'undo'], ['F5', 'refresh'],
  ];

  // The eight the tour actually performs, set larger on the wall so it has a
  // rhythm instead of being an even paste. Desktop mode is one of them: the
  // wall's own transition is its demonstration.
  const BIG = new Set([
    'Desktop mode — it becomes the wallpaper',
    'QuickAdd — parsed on the device',
    'Drag an event to another day',
    'The daily planner',
    '*Tag filter bar',
    '*Decorate mode — place, size, rotate',
    '*Cloud sync — events, memos, settings, tags',
    'MCP connection, off until you turn it on',
  ]);

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
  // copy two cells away. Off every calendar, not just the tour's: the wall
  // hands the reader a month and the tour picks it up, and two pills quietly
  // vanishing at the seam would be the page contradicting itself.
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

  // ---------- 1. the wall — everything it does, and then where it lives ----------
  // The whole catalogue at once, set on a wallpaper. The words are one block of
  // type in three sizes, so the wall has a rhythm rather than being an even
  // paste; the large ones are the eight the tour is about to perform.
  //
  // Scroll takes it apart. Each word has its own direction and its own delay,
  // and the delay is not random for the large ones: the small type leaves
  // first, so the eight are the last things standing before the calendar takes
  // the screen. What is left in the cleared middle has no window around it,
  // which is the whole of desktop mode — shown rather than described, and the
  // reason the tour does not spend a step on it.
  //
  // Every number here is counted off CATALOG and KEYS. A count typed next to a
  // list is a claim; a count read out of the list cannot be wrong.
  function initWall() {
    const words = $('#wall-words');
    const keysEl = $('#wall-keys');
    const wallPlane = $('#plane-wall');
    const cal = $('#plane-cal');
    const pin = $('.wall-pin');

    const pro = CATALOG.filter((s) => s[0] === '*').length;
    const COPY = [
      {
        eyebrow: `${CATALOG.length} FEATURES · ${CATALOG.length - pro} FREE · ${pro} PRO`,
        title: 'All of it, at once.',
        lead: 'Every feature in the build you can download today, settings included. ' +
          'Nothing on this wall is on a roadmap.',
      },
      {
        eyebrow: 'AND NO WINDOW AROUND IT',
        title: 'It is the wallpaper.',
        lead: 'Desktop mode drops the frame and hands the month to the desktop itself. ' +
          'Nothing to arrange, and nothing sitting on top of anything.',
      },
    ];

    const build = (raw) => {
      const isPro = raw[0] === '*';
      const el = document.createElement('span');
      el.className = `wall-word${BIG.has(raw) ? ' is-big' : ''}${isPro ? ' is-pro' : ''}`;
      el.textContent = isPro ? raw.slice(1) : raw;
      if (isPro) {
        const b = document.createElement('i');
        b.className = 'wall-pro';
        b.textContent = 'PRO';
        el.appendChild(b);
      }
      words.insertBefore(el, keysEl);      // the keys band stays last
      return el;
    };

    // where each piece goes when the wall comes apart, decided once
    const scatter = (el, delay) => {
      const a = Math.random() * Math.PI * 2;
      const d = 260 + Math.random() * 520;
      return {
        el, delay, t: -1,
        dx: Math.cos(a) * d,
        dy: Math.sin(a) * d - 70,
        rot: (Math.random() * 2 - 1) * 64,
      };
    };

    const pieces = CATALOG.map((raw) =>
      scatter(build(raw), (BIG.has(raw) ? 0.36 : 0) + Math.random() * 0.28));

    keysEl.innerHTML = `<span class="wall-keys-n">${KEYS.length} SHORTCUTS</span>` +
      KEYS.map(([k, what]) => `<span class="wall-key"><b>${k}</b>${what}</span>`).join('');
    // the band leaves in one piece: it is one thought, not nine
    pieces.push({ el: keysEl, delay: 0, t: -1, dx: 0, dy: 260, rot: 0 });

    // A hundred names do not fit one phone screen, and a block clipped at both
    // ends reads as a bug rather than as a lot of features. So the wall pans
    // through itself before it comes apart. On a wide screen the block fits,
    // the overflow is zero, and this span collapses to nothing — one code path,
    // no phone-only behaviour to keep in step.
    let over = 0, panEnd = 0, lastP = 0;
    const measure = () => {
      // measured with nothing scattered: a transformed word still counts
      // towards the scrollable area, so a half-flung wall would measure taller
      // than it is
      pieces.forEach((s) => { s.el.style.transform = 'none'; s.el.style.opacity = ''; s.t = -1; });
      // centred content that overflows spills past BOTH ends and the top half
      // cannot be scrolled to, so a block too tall for its box is aligned to
      // the top instead — and then panned through with scrollTop
      words.classList.remove('is-tall');
      // a couple of pixels over is not a wall that needs panning — it is a wall
      // that fits, and spending a third of the section scrolling three pixels
      // would be a dead beat on every desktop
      const tall = words.scrollHeight > words.clientHeight + 24;
      words.classList.toggle('is-tall', tall);
      over = tall ? words.scrollHeight - words.clientHeight : 0;
      // how long the pan takes is how much there is to pan, capped
      panEnd = over ? Math.max(0.12, Math.min(0.34, (over / words.clientHeight) * 0.3)) : 0;
    };

    let said = -1;
    const say = (i) => {
      if (i === said) return;
      said = i;
      $('#wall-eyebrow').textContent = COPY[i].eyebrow;
      $('#wall-title').textContent = COPY[i].title;
      $('#wall-lead').textContent = COPY[i].lead;
    };
    say(0);

    measure();
    return {
      // the block's height changes when the web fonts land and when the window
      // is resized, and how far it has to pan changes with it
      measure() { measure(); this.at(lastP); },
      // p is 0 → 1 across the section behind the pin
      at(p) {
        lastP = p;
        // first the block pans through itself (nothing to pan on a wide
        // screen), then everything after it runs on what is left of the scroll
        const pan = panEnd ? clamp01(p / panEnd) : 0;
        // a little past the measured bottom, because the browser clamps
        // scrollTop for us: the block can settle a few pixels taller than it
        // measured, and stopping short would leave the last row half cut
        words.scrollTop = (over + 24) * pan;
        // a beat at the bottom before it comes apart, so the end of the list is
        // something the reader gets to see rather than something that flashes
        const rest = panEnd ? panEnd + 0.08 : 0;
        const r = rest ? clamp01((p - rest) / (1 - rest)) : p;

        const q = clamp01(r / 0.56);          // the scatter is over well before the end
        pieces.forEach((s) => {
          const t = clamp01((q - s.delay) / (1 - s.delay));
          if (t === s.t) return;              // 110 nodes: do not write what has not changed
          s.t = t;
          const e = t * t;
          s.el.style.transform = t
            ? `translate3d(${s.dx * e}px, ${s.dy * e}px, 0) rotate(${s.rot * e}deg)`
            : 'none';
          s.el.style.opacity = String(1 - t);
        });

        wallPlane.style.transform = `translate3d(0, ${p * -34}px, 0) scale(1.06)`;

        // ours rises in the cleared middle and then holds. A thing you are being
        // handed should not still be moving while you look at it.
        const up = clamp01((r - 0.36) / 0.26);
        cal.style.opacity = String(up);
        cal.style.transform =
          `translate3d(0, ${(1 - up) * 44}px, 0) scale(${0.964 + up * 0.036})`;

        say(r < 0.44 ? 0 : 1);
        pin.style.opacity = String(clamp01(1 - (r - 0.93) / 0.07));
      },
    };
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
      // which runs at load while the reader is still on the wall, would play
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
  function initScrub(wall, tour) {
    const wallSec = $('#wall');
    const tourSec = $('#tour');
    const cue = $('#cue-label');

    // progress of a tall section behind its sticky pin, 0 → 1
    const prog = (el) => {
      const r = el.getBoundingClientRect();
      const span = r.height - innerHeight;
      return span <= 0 ? 0 : clamp01(-r.top / span);
    };

    let queued = false;

    function run() {
      queued = false;

      const p = prog(wallSec);
      wall.at(p);

      const label = p < 0.30 ? 'SCROLL'
        : p < 0.62 ? 'KEEP GOING'
        : 'NOW WATCH IT WORK';
      if (cue.textContent !== label) cue.textContent = label;

      // the tour — scroll picks the step and the step plays itself. The engine
      // is told a position, never a direction: it works out for itself what to
      // play, what to snap past, and what to put back.
      tour.at(prog(tourSec));
    }

    const request = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
    // The wall is a block of type: how tall it is, and therefore how far it has
    // to pan before it can come apart, changes when the window is resized and
    // once more when the web fonts land.
    const remeasure = () => { wall.measure(); request(); };
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', remeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    run();
    // handed back so the loader can ask for one more frame on its way out: the
    // wall is measured behind a full-screen cover until then
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
    holdFrom(plane);           // the month the wall hands over is the month the tour picks up
    $('#plane-cal').appendChild(plane);
    const wall = initWall();
    const tour = initTour();
    runLoader(initScrub(wall, tour));
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
