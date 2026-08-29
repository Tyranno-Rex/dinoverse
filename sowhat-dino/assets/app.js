/* SOWHAT-DINO — builds the page from assets/manifest.js.
   Composition + motion only; the one bit of logic is the scroll scrub at the
   bottom, which drives the hero type swap and the fly-in copy. */
(() => {
  const A = window.SOWHAT_ASSETS;
  if (!A) return;

  const $ = (sel) => document.querySelector(sel);
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const el = (tag, cls, props) => Object.assign(document.createElement(tag), props || {}, cls ? { className: cls } : {});

  // ---------- sprite sheets ----------
  const sprites = Object.fromEntries(A.sprites.map((s) => [s.key, s]));
  document.querySelectorAll('[data-sprite]').forEach((node) => {
    const s = sprites[node.dataset.sprite];
    if (!s) return;
    node.style.setProperty('--n', s.frames);
    node.style.setProperty('--ar', `${s.cellW} / ${s.cellH}`);
    if (node.dataset.dur) node.style.setProperty('--dur', node.dataset.dur);
    node.style.backgroundImage = `url("image/sprite/${s.key}.webp")`;
  });

  // ---------- 1. furniture pouring out of the box ----------
  // one flat pool so the rain mixes categories instead of clumping
  const allDeco = A.deco.flatMap((d) => d.items.map((f) => `image/deco/${d.cat}/${f}`));

  const spill = $('#spill');
  if (spill && allDeco.length) {
    const small = window.matchMedia('(max-width: 760px)').matches;
    // back layer carries the volume; front layer is a few big pieces for depth
    const layers = [
      { cls: 'spill-layer spill-back', count: small ? 14 : 30,
        size: small ? [34, 78] : [46, 118], dur: [11, 20] },
      { cls: 'spill-layer spill-front', count: small ? 4 : 9,
        size: small ? [64, 112] : [96, 190], dur: [7, 12],
        // on a narrow screen a single big piece can bury the wordmark,
        // so keep the front layer hugging the edges there
        edges: small },
    ];

    layers.forEach(({ cls, count, size, dur: durRange, edges }) => {
      const layer = el('div', cls);
      for (let i = 0; i < count; i++) {
        const dur = rand(...durRange);
        const img = el('img', null, { src: pick(allDeco), alt: '', loading: 'eager', decoding: 'async' });
        img.style.left = edges
          ? `${Math.random() < 0.5 ? rand(-8, 16) : rand(78, 98)}%`
          : `${rand(-4, 98)}%`;
        img.style.setProperty('--w', `${Math.round(rand(...size))}px`);
        img.style.setProperty('--dur', `${dur.toFixed(2)}s`);
        // negative delay: the rain is already falling when the page opens
        img.style.setProperty('--delay', `${(-Math.random() * dur).toFixed(2)}s`);
        img.style.setProperty('--r0', `${Math.round(rand(-40, 40))}deg`);
        img.style.setProperty('--r1', `${Math.round(rand(-400, 400))}deg`);
        img.style.opacity = rand(0.75, 1).toFixed(2);
        layer.appendChild(img);
      }
      spill.appendChild(layer);
    });
  }

  // ---------- 3. motion marquee ----------
  const marquee = $('#marquee');
  if (marquee && A.motion.length) {
    const ROWS = 3;
    const rows = Array.from({ length: ROWS }, () => []);
    A.motion.forEach((m, i) => rows[i % ROWS].push(m));

    rows.forEach((items, r) => {
      const row = el('div', `marquee-row${r % 2 ? ' marquee-row--rev' : ''}`);
      row.style.setProperty('--dur', `${34 + r * 9}s`);
      // duplicated once so translateX(-50%) lands on an identical frame
      for (let copy = 0; copy < 2; copy++) {
        items.forEach((m) => {
          const card = el('div', 'marquee-card');
          card.appendChild(el('img', null, {
            src: `image/motion/${m.file}`, alt: '', loading: 'lazy', decoding: 'async',
          }));
          card.appendChild(el('span', 'marquee-label', { textContent: m.label }));
          row.appendChild(card);
        });
      }
      marquee.appendChild(row);
    });
  }

  // ---------- 4. deco wall ----------
  const wall = $('#deco-wall');
  if (wall) {
    A.deco.forEach((d) => {
      const block = el('div', 'deco-cat');
      const head = el('h3', 'deco-cat-label');
      head.appendChild(el('span', null, { textContent: d.label }));
      head.appendChild(el('span', 'deco-cat-n', { textContent: String(d.items.length) }));
      block.appendChild(head);

      const grid = el('div', 'deco-grid');
      d.items.forEach((f) => {
        grid.appendChild(el('img', null, {
          src: `image/deco/${d.cat}/${f}`, alt: '', loading: 'lazy', decoding: 'async',
        }));
      });
      block.appendChild(grid);
      wall.appendChild(block);
    });
  }

  // ============================================================
  // scroll scrub — one rAF-throttled pass drives every scrubbed section
  // ============================================================
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrubs = [];

  // ---------- 1. hero: SOWHAT fills the screen, then DINO takes it ----------
  const hero = $('.hero');
  const heroPin = $('.hero-pin');
  const typeLines = $('.type-lines');
  const lineA = $('.type-line--a');
  const lineB = $('.type-line--b');
  const cue = $('.scroll-cue');

  if (!still && hero && heroPin && typeLines && lineA && lineB) {
    scrubs.push(() => {
      // the pin is one viewport of the section's height; the rest is runway,
      // and all of it goes to the swap — SOWHAT starts already full-bleed
      const travel = hero.offsetHeight - heroPin.offsetHeight;
      if (travel <= 0) return;
      const swap = clamp01(-hero.getBoundingClientRect().top / travel);
      const full = typeLines.clientHeight;

      lineA.style.height = `${full * (1 - swap)}px`;
      lineB.style.height = `${full * swap}px`;
      if (cue) cue.style.opacity = (1 - clamp01(swap * 3)).toFixed(3);
    });
  }

  // ---------- 2. 어쩔공룡: copy flown in from all eight directions ----------
  // up, down, left, right, then the four diagonals
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]];

  const assemble = $('.assemble');
  const assemblePin = $('.assemble-pin');

  if (!still && assemble && assemblePin) {
    const groups = [...assemble.querySelectorAll('[data-assemble]')].map((host) => {
      const [from, to] = host.dataset.assemble.split(' ').map(Number);
      // hangul headlines have no spaces to split on, hence data-split="char"
      const parts = host.dataset.split === 'char'
        ? [...host.textContent.trim()]
        : host.textContent.trim().split(/\s+/);
      host.textContent = '';

      const words = parts.map((text, i) => {
        const w = el('span', 'word', { textContent: text });
        // i * 3 walks all eight vectors (3 and 8 are coprime), so consecutive
        // words never share an approach
        const [dx, dy] = DIRS[(i * 3) % DIRS.length];
        w.style.setProperty('--dx', `${dx * 85}vw`);
        w.style.setProperty('--dy', `${dy * 85}vh`);
        w.style.setProperty('--r', `${(i % 2 ? 1 : -1) * (10 + (i % 5) * 7)}deg`);
        w.style.setProperty('--t', '1');
        host.appendChild(w);
        if (host.dataset.split !== 'char') host.appendChild(document.createTextNode(' '));
        return w;
      });
      return { words, from, to };
    });

    const timed = (sel, attr) => [...assemble.querySelectorAll(sel)].map((node) => {
      const [from, to] = node.dataset[attr].split(' ').map(Number);
      node.style.setProperty('--o', '0');
      return { node, from, to };
    });
    const fades = timed('[data-fade]', 'fade');
    const pops = timed('[data-pop]', 'pop');

    const window01 = (p, from, to) => clamp01((p - from) / (to - from || 1));

    scrubs.push(() => {
      const travel = assemble.offsetHeight - assemblePin.offsetHeight;
      if (travel <= 0) return;
      const p = clamp01(-assemble.getBoundingClientRect().top / travel);

      groups.forEach(({ words, from, to }) => {
        const local = window01(p, from, to);
        // each word gets its own slice of the group's window, in reading order
        const each = 0.55;
        const step = words.length > 1 ? (1 - each) / (words.length - 1) : 0;
        words.forEach((w, i) => {
          const t = easeOut(clamp01((local - i * step) / each));
          w.style.setProperty('--t', (1 - t).toFixed(4));
        });
      });

      fades.forEach(({ node, from, to }) => {
        node.style.setProperty('--o', window01(p, from, to).toFixed(3));
      });
      pops.forEach(({ node, from, to }) => {
        const t = easeOut(window01(p, from, to));
        node.style.setProperty('--o', t.toFixed(3));
        node.style.setProperty('--s', (0.7 + 0.3 * t).toFixed(3));
      });
    });
  }

  if (scrubs.length) {
    let queued = false;
    const run = () => { queued = false; scrubs.forEach((fn) => fn()); };
    const request = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', request);
    run();
  }

  // ---------- counts ----------
  const setCount = (sel, n) => { const t = $(sel); if (t) t.textContent = String(n); };
  setCount('#motion-count', A.motion.length + A.sprites.length);
  setCount('#deco-count', allDeco.length);
})();
