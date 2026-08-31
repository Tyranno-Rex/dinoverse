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

  // Every entry: what the day shows, and what that thing IS. The events on the
  // grid are not filler — each one is a feature, and clicking it opens this
  // text. Nothing here is claimed that FEATURE_SPEC.md does not describe.
  const FEATURES = [
    { events: [{ t: 'Weekly standup', time: '09:30', repeat: true }],
      name: 'Repeating events',
      body: 'Daily, weekly, monthly or yearly. Pick the interval, then end it on a date or after a set number of times. The small loop in the cell is how a repeat announces itself.' },
    { events: [{ t: 'Design review', time: '14:00', color: '#FF3B30' }],
      name: 'Ten event colours',
      body: 'The ten Apple system colours — and a colourblind-safe palette that remaps all ten to hues you can still tell apart. The pill takes the colour at 15%, the label takes it at full.' },
    { events: [{ t: 'D-7 · Launch', color: '#FF2D55' }],
      name: 'D-day countdown',
      body: 'Mark an event as a D-day and the cell counts down to it. The side panel counts with it, so the number is never something you work out on your fingers.' },
    { events: [{ t: 'Client call', time: '11:00', tags: ['#34C759', '#AF52DE'] }],
      name: 'Tags, and a filter that dims',
      body: 'Any number of tags per event, each one a dot on the pill. Filter by one and the rest of the month dims rather than disappears — you read a project without losing the shape of the month.' },
    { events: [{ t: 'Renew domain', done: true }],
      name: 'Completion',
      body: 'Tick it off and it strikes through in place. On a repeating event completion is tracked per occurrence: last week being done does not mark this week done.' },
    { sticker: '🎉', events: [{ t: 'Ship v1.2', time: '17:00', color: '#34C759' }],
      name: 'Mood stickers',
      body: 'One sticker per day, from the cell’s right-click menu. The fastest way to make a month readable at a glance — a shape lands before a word does.' },
    { overcommit: true, events: [{ t: 'All-hands', time: '10:00' }, { t: '+4 more', more: true }],
      name: 'Overcommit warning',
      body: 'When a day is carrying more than it should, the cell says so while the day is still ahead of you. You set the threshold.' },
    { events: [{ t: 'Dentist', time: '15:00', color: '#5856D6' }],
      name: 'Reminders',
      body: 'From on the minute to a full day ahead, delivered as a real system notification — so it reaches you whether or not the calendar has focus.' },
    { events: [{ t: 'Synced · Google', time: '08:00', color: '#8E8E93' }],
      name: 'Google Calendar, both ways',
      body: 'Authorisation is OAuth PKCE and the tokens are sealed by the operating system’s own credential store. They are never written into a file of ours.' },
    { events: [{ t: 'Pomodoro ×4', color: '#FF9500' }],
      name: 'Pomodoro timer',
      body: 'A focus timer that logs its finished sessions against the day it ran on. The month ends up holding a record of the work, not only the plan.' },
    { events: [{ t: 'Memo · passport', color: '#FFCC00' }],
      name: 'Memo windows',
      body: 'Free-standing notes on the desktop, outside the grid. Pin one and it stays above every other window until you unpin it.' },
    { events: [{ t: 'Deep work · 2h', time: '09:00', color: '#5AC8FA' }],
      name: 'Time blocking',
      body: 'Drop a block on a day and those hours are spoken for. Blocks stack, and the day shows you what is left rather than what you promised.' },
    { weather: true, events: [{ t: 'Picnic', time: '12:00', color: '#34C759' }],
      name: 'Weather in the day',
      body: 'The forecast sits in the day header. An outdoor plan tells you what it is walking into before you commit to it.' },
    { events: [{ t: 'Backup written', done: true }],
      name: 'Backup, import, export',
      body: 'A backup is written on launch and again on quit. Import and export are plain .ics — nothing you put in here is trapped in here.' },
  ];
  const SPAN = {
    title: 'Sprint 12 · multi-day',
    name: 'Multi-day events',
    body: 'An event running across days is drawn once, as a single bar over the week — not as seven copies of itself. Every cell it crosses reserves the height, so the bar never lands on a word.',
  };

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

        cells += `<div class="${cls.join(' ')}"${f ? ` data-feat="${FEATURES.indexOf(f)}" data-when="${dateLabel(d)}"` : ''}>` +
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
        const d0 = w * 7 + col - M.first + 1;
        bar = `<div class="spanning-bar start end" data-feat="span" ` +
          `data-when="${dateLabel(d0)} – ${dateLabel(d0 + len - 1)}" ` +
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

  function buildOldCalendar() {
    const root = $('#oldcal');
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

    const SCRIPT = [
      { text: 'Design review 2pm',
        loses: 'The 2pm is a word, not a time. Nothing will ring.' },
      { text: 'Client call - jamie',
        loses: 'No tag and no colour, so the project has to go inside the sentence.' },
      { text: 'Standup 9:30 every mon',
        loses: 'No repeat. You will type this again next Monday, and the one after that.' },
    ];
    // the three the app draws for those same three appointments
    const OURS = ['Ten event colours', 'Tags, and a filter that dims', 'Repeating events']
      .map((n) => FEATURES.find((f) => f.name === n))
      .filter(Boolean)
      .map((f) => f.events[0]);

    // The middle columns, the second and third weeks. The card hangs off the
    // day it was opened on, so where it can be opened is decided by where it
    // will then be standing: clear of the copy plate on the left, clear of
    // ours on the right, and inside the frame. Those two rows are in this
    // month whatever weekday it starts on, so there is always somewhere to
    // write.
    const cells = [...$('#oldcal').querySelectorAll('.old-cell')];
    const room = cells.filter((el, i) => {
      const row = Math.floor(i / 7), col = i % 7;
      return col >= 3 && col <= 4 && row >= 1 && row <= 2 && el.dataset.d;
    });
    const PICK = [0.16, 0.5, 0.84].map((f) => room[Math.round((room.length - 1) * f)]);

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

    // what a saved note leaves on the day: the text, and nothing else
    const jot = (cell, text) => {
      if (cell.querySelector('.old-jot')) return;
      const el = document.createElement('span');
      el.className = 'old-jot';
      el.textContent = text;
      cell.appendChild(el);
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
      SCRIPT.forEach((sc, i) => jot(PICK[i], sc.text));
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
        jot(cell, SCRIPT[i].text);
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

  // ---------- the feature tour ----------
  // Every event written on this month IS a feature. Hovering a day names it;
  // clicking it opens the explanation in a panel on the right — which is also
  // what clicking a day does inside the app, so the gesture is the product's.
  function initFeatureTour() {
    const cal = $('#plane-cal');
    const out = $('#feat-read');
    const panel = $('#feat-panel');
    const pin = $('.hero-pin');
    const closeBtn = $('#feat-close');
    const total = FEATURES.length + 1;
    const base = `CLICK A DAY — <b>${total}</b> FEATURES ARE LIVING IN THIS MONTH`;
    out.innerHTML = base;

    const featOf = (el) => (el.dataset.feat === 'span' ? SPAN : FEATURES[+el.dataset.feat]);

    // Only the hero's calendar is the menu. The audit clones and the desktop
    // widget carry the same markup but must stay out of the tab order.
    cal.querySelectorAll('[data-feat]').forEach((el) => {
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `Feature — ${featOf(el).name}`);
    });

    let open = null;
    const close = () => {
      if (!open) return;                       // the scrub calls this on every frame
      open.classList.remove('is-selected');
      open = null;
      panel.classList.remove('is-open');
      pin.classList.remove('is-panel-open');
      panel.setAttribute('aria-hidden', 'true');
      closeBtn.tabIndex = -1;
      out.innerHTML = base;
    };
    const show = (el) => {
      const f = featOf(el);
      if (!f) return;
      if (open) open.classList.remove('is-selected');
      open = el;
      el.classList.add('is-selected');
      $('#feat-panel-when').textContent = el.dataset.when;
      $('#feat-panel-title').textContent = f.name;
      $('#feat-panel-body').textContent = f.body;
      $('#feat-panel-n').textContent =
        `${f === SPAN ? total : FEATURES.indexOf(f) + 1} / ${total}`;
      panel.classList.add('is-open');
      pin.classList.add('is-panel-open');
      panel.setAttribute('aria-hidden', 'false');
      closeBtn.tabIndex = 0;
    };

    cal.addEventListener('pointerover', (e) => {
      const hit = e.target.closest('[data-feat]');
      out.innerHTML = hit ? `${featOf(hit).name.toUpperCase()} — <b>CLICK</b> TO OPEN` : base;
    });
    cal.addEventListener('pointerleave', () => { out.innerHTML = base; });
    cal.addEventListener('click', (e) => {
      const hit = e.target.closest('[data-feat]');
      if (hit) show(hit);
    });
    cal.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const hit = e.target.closest('[data-feat]');
      if (!hit) return;
      e.preventDefault();
      show(hit);
    });
    closeBtn.addEventListener('click', close);
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) close(); });
    // A tap anywhere else shuts it. On a phone the panel is a sheet lying over
    // the lower weeks, so without this a covered day could not be reached.
    document.addEventListener('click', (e) => {
      if (open && !e.target.closest('#feat-panel, [data-feat]')) close();
    });
    return { close };
  }

  // ---------- scroll scrub — one rAF-throttled pass drives every section ----------
  function initScrub(tour, demo) {
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
    const read = $('#feat-read');
    const cue = $('#cue-label');
    const link = $('#demo-link');
    const shards = collectShards();
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

      // 1. hero — one pinned sequence in four beats:
      //    BEFORE 0 → .24 · SHATTER .24 → .50 · REVEAL .50 → .64 · TOUR .64 → 1
      const p = prog(hero);
      const seg = (a, b) => clamp01((p - a) / (b - a));
      wall.style.transform = `translate3d(0, ${p * -40}px, 0) scale(1.06)`;

      const qBreak = seg(0.24, 0.50);
      const qUp = seg(0.50, 0.64);

      // The demo plays at p = 0, so its narration is up from the first frame
      // rather than fading in on a scroll that has not happened yet. Leaving
      // the screen is what ends it.
      if (p > 0.10) demo.settle();
      copy.style.opacity = String(1 - seg(0.20, 0.26));
      // ours leaves with the copy; the shatter is not the place to already be
      // holding a piece of the answer
      if (p > 0.12) {
        const k = String(1 - seg(0.12, 0.24));
        nw.style.opacity = k;
        link.style.opacity = k;
      } else if (nw.style.opacity) {
        nw.style.opacity = '';
        link.style.opacity = '';
      }
      frame.style.opacity = String(1 - seg(0.24, 0.34));
      stage.style.opacity = String(1 - seg(0.50, 0.56));
      bin.style.opacity = String(seg(0.16, 0.24) * (1 - seg(0.50, 0.56)));
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

      beatBreak.style.opacity = String(seg(0.27, 0.33) * (1 - seg(0.44, 0.50)));
      beatBuilt.style.opacity = String(seg(0.55, 0.60) * (1 - seg(0.66, 0.72)));

      // ours rises in its place, and only then becomes the menu
      cal.style.opacity = String(qUp);
      cal.style.transform =
        `translate3d(0, ${(1 - qUp) * 46 + p * -70}px, 0) scale(${0.962 + qUp * 0.038})`;
      pin.classList.toggle('is-tour', p > 0.63);
      read.style.opacity = String(seg(0.64, 0.70) * (1 - seg(0.93, 1)));
      if (p < 0.60) tour.close();

      const label = !demo.isDone() ? 'SCROLL WHEN READY'
        : p < 0.24 ? 'SCROLL TO BREAK IT' : 'SCROLL';
      if (cue.textContent !== label) cue.textContent = label;

      // the pin dims on the way out, so the panel and the readout leave with
      // the calendar rather than outliving it
      pin.style.opacity = String(clamp01(1 - (p - 0.93) / 0.07));

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

    // While the cue reads as an instruction it must not do the opposite of
    // what it says: clicking it advances THROUGH the sequence, and only once
    // the tour is up does it go back to being the link past the section.
    $('.scroll-cue').addEventListener('click', (e) => {
      if (prog(hero) >= 0.63) return;
      e.preventDefault();
      const top = hero.offsetTop + (hero.offsetHeight - innerHeight) * 0.72;
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
    buildOldCalendar();
    $('#plane-cal').appendChild(buildCalendar(false));
    $('#life-cal').appendChild(buildCalendar(true));
    buildAudit();
    const tour = initFeatureTour();
    const demo = initOldDemo();
    runLoader(demo.start);
    initScrub(tour, demo);
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
