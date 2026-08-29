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

  // ---------- loader: SOWHAT, then one of each kind ----------
  // The dinosaur stands in for the second half of the name, and every kind
  // takes the slot once before the last one keeps it. The gap between swaps
  // is not constant — it opens at half a second, tightens to a tenth in the
  // middle and eases back out — which is what makes it read as a reel being
  // flicked through rather than a slideshow on a timer.
  const loader = $('#loader');
  const slot = $('#loader-slot');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // one representative pose per kind; the sowhat dino takes the last slot and
  // keeps it, so the loader ends on the animal the page is actually about
  const CAST = [
    'family/ankylosaurus-1.webp',
    'family/brachiosaurus-1.webp',
    'family/parasaurolophus-1.webp',
    'family/pteranodon-1.webp',
    'family/stegosaurus-1.webp',
    'family/triceratops-1.webp',
    'herd/sowhat-1.webp',
  ];

  const seen = (() => {
    try { return sessionStorage.getItem('sowhat:loader') === '1'; } catch { return false; }
  })();

  if (loader && slot && !still && !seen) {
    try { sessionStorage.setItem('sowhat:loader', '1'); } catch { /* private mode */ }

    const frames = CAST.map((f, i) => {
      const img = el('img', null, { src: `image/${f}`, alt: '', decoding: 'async' });
      if (i === 0) img.loading = 'eager';
      slot.appendChild(img);
      return img;
    });

    const counter = $('#loader-n');
    const START = 66_000_000;                    // the asteroid, give or take
    const ENTER = 900;                           // word up, slot open
    const HOLD = 800;                            // the last one keeps the slot

    // 500ms at the ends, 100ms in the middle — one arch across the cast
    const gap = (i) => 100 + 400 * (1 - Math.sin((i / (frames.length - 1)) * Math.PI));
    const marks = frames.reduce((acc, _, i) => {
      acc.push((acc[i - 1] || ENTER) + (i ? gap(i - 1) : 0));
      return acc;
    }, []);
    const end = marks[marks.length - 1] + HOLD;

    requestAnimationFrame(() => loader.classList.add('is-on'));
    frames.forEach((img, i) => {
      setTimeout(() => {
        if (i) frames[i - 1].classList.remove('is-up');
        img.classList.add('is-up');
      }, marks[i]);
    });

    // 66 million years down to now, landing exactly as the loader lifts
    if (counter) {
      const t0 = performance.now();
      const count = () => {
        const p = Math.min((performance.now() - t0) / end, 1);
        const eased = p < 0.5 ? 2 * p * p : 1 - ((-2 * p + 2) ** 2) / 2;
        counter.textContent = Math.round(START * (1 - eased)).toLocaleString('en-US');
        if (p < 1) requestAnimationFrame(count);
      };
      count();
    }

    setTimeout(() => {
      loader.classList.add('is-done');
      setTimeout(() => loader.remove(), 800);
    }, end);
  } else if (loader) {
    loader.remove();
  }

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

  // ---------- 0. sticker bomb: every dinosaur we have, dug out one by one ----------
  // Seeded so the wall is the same picture on every visit — a fixed
  // composition rather than noise that reshuffles under the reader.
  const seeded = (s) => () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const bombWall = $('#bomb-wall');
  if (bombWall) {
    // six species off the family sheets plus the sowhat dino sampled out of
    // the game's own animation library — see tools/dino-stickers.mjs
    const herd = window.SOWHAT_DINOS || [];

    if (herd.length) {
      const rnd = seeded(20260829);
      const small = window.matchMedia('(max-width: 760px)').matches;
      // pitch spaces the lattice, unit sizes the stickers. Keeping them apart
      // is what lets the wall thin out without the dinosaurs growing: widen
      // the pitch and the count falls, the ink ground opens up between them,
      // and every sticker stays the size it was.
      const pitch = small ? 112 : 140;
      const unit = small ? 78 : 100;
      const cols = Math.ceil(window.innerWidth / pitch) + 1;
      const rows = Math.ceil(window.innerHeight / (pitch * 0.82)) + 1;
      const vmin = Math.min(window.innerWidth, window.innerHeight) / 100;

      const shuffle = (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(rnd() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      };
      // Seven kinds, and the wall gives each the same number of slots. The
      // green sowhat dino has 73 poses against nine per species, so drawing
      // from one pile — however it is shuffled — hands him most of the
      // screen. Round-robin across the kinds instead: green spends his share
      // on 73 different poses, each species cycles its nine.
      const kind = (f) => (f.startsWith('family/')
        ? f.slice('family/'.length).replace(/-\d+\.webp$/, '')
        : 'sowhat');
      const kinds = new Map();
      herd.forEach((f) => {
        const k = kind(f);
        if (!kinds.has(k)) kinds.set(k, []);
        kinds.get(k).push(f);
      });
      const piles = [...kinds.values()].map(shuffle);
      // Tiles are filled straight off this list, so its order is the wall's.
      // Each pile is cycled by its own length, not by a shared index — walking
      // one index across all seven would run the six short piles dry and hand
      // the whole tail to green. Re-shuffling the turn order every round keeps
      // the kinds from marching in a fixed sequence across the lattice.
      const count = cols * rows;
      const bag = [];
      for (let i = 0; bag.length < count; i++) {
        shuffle(piles.slice()).forEach((pile) => bag.push(pile[i % pile.length]));
      }

      const tiles = [];
      let n = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const img = el('img', null, {
            src: `image/${bag[n++ % bag.length]}`, alt: '', decoding: 'async',
          });
          // odd rows step half a pitch across — a brick bond, not a grid
          const x = (c + (r % 2 ? 0.5 : 0) + (rnd() - 0.5) * 0.5) / (cols - 1);
          const y = (r + (rnd() - 0.5) * 0.45) / (rows - 1);
          img.style.left = `${(x * 100).toFixed(2)}%`;
          img.style.top = `${(y * 100).toFixed(2)}%`;
          img.style.setProperty('--w', `${((unit * (1.35 + rnd() * 0.65)) / vmin).toFixed(2)}vmin`);
          img.style.setProperty('--r', `${Math.round((rnd() - 0.5) * 48)}deg`);
          img.style.zIndex = String(1 + Math.floor(rnd() * 6));
          tiles.push({ img, x, y });
          bombWall.appendChild(img);
        }
      }

      // ----- the dig -----
      // Nothing is on screen until the reader brushes it off. The pointer is
      // the tool: whatever falls inside its radius surfaces and stays up.
      const section = $('.bomb');
      const brush = $('#dig-brush');
      const hint = $('#bomb-hint');
      const R = Math.round(pitch * 0.8);
      if (brush) brush.style.setProperty('--brush', `${R * 2}px`);

      const buried = tiles.slice();
      const surface = (t) => t.img.classList.add('is-dug');

      // Reveal whatever the brush covers at this point. The wall is measured
      // per call rather than cached: the section scrolls, so a stored rect
      // goes stale the moment the reader moves the page.
      const brushAt = (cx, cy) => {
        const box = bombWall.getBoundingClientRect();
        for (let i = buried.length - 1; i >= 0; i--) {
          const t = buried[i];
          const dx = box.left + t.x * box.width - cx;
          const dy = box.top + t.y * box.height - cy;
          if (dx * dx + dy * dy <= R * R) { surface(t); buried.splice(i, 1); }
        }
      };

      // Whatever is left, opened outward from where the brush stopped. Used
      // as a floor, not a feature: a reader who never moves the mouse, or one
      // who has cleared most of it and would be hunting for stragglers,
      // should not be left staring at bare rock.
      let finishing = false;
      const finish = (fromX, fromY) => {
        if (finishing) return;
        finishing = true;
        const box = bombWall.getBoundingClientRect();
        buried
          .map((t) => {
            const dx = box.left + t.x * box.width - fromX;
            const dy = box.top + t.y * box.height - fromY;
            return { t, d: Math.hypot(dx, dy) * (0.88 + rnd() * 0.24) };
          })
          .sort((a, b) => a.d - b.d)
          .forEach(({ t }, i) => setTimeout(() => surface(t), i * 20));
        buried.length = 0;
      };

      const coarse = window.matchMedia('(hover: none)').matches;
      // nothing to brush with on a touch screen, so do not ask for a mouse
      if (coarse && hint) hint.remove();
      let idle = null;
      const centre = () => {
        const box = bombWall.getBoundingClientRect();
        return [box.left + box.width * 0.42, box.top + box.height * 0.56];
      };
      // A pointer that has not arrived yet gets a countdown; once the reader
      // is actually digging it is theirs, and only the straggler rule applies.
      const armIdle = () => {
        clearTimeout(idle);
        idle = setTimeout(() => finish(...centre()), coarse ? 900 : 4500);
      };
      armIdle();

      let last = null;
      section.addEventListener('pointermove', (e) => {
        clearTimeout(idle);
        if (brush) {
          brush.classList.add('is-on');
          brush.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        }
        // step along the segment since the last event: a fast sweep would
        // otherwise jump clean over a sticker without uncovering it
        if (last) {
          const dx = e.clientX - last[0];
          const dy = e.clientY - last[1];
          const steps = Math.min(30, Math.ceil(Math.hypot(dx, dy) / (R * 0.5)));
          for (let i = 1; i < steps; i++) {
            brushAt(last[0] + (dx * i) / steps, last[1] + (dy * i) / steps);
          }
        }
        brushAt(e.clientX, e.clientY);
        last = [e.clientX, e.clientY];

        if (hint && tiles.length - buried.length > 3) hint.classList.add('is-gone');
        if (buried.length && buried.length < tiles.length * 0.12) finish(e.clientX, e.clientY);
      }, { passive: true });

      section.addEventListener('pointerleave', () => {
        if (brush) brush.classList.remove('is-on');
        last = null;
      });
    }
  }

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
