/* SOWHAT-DINO — builds the page from assets/manifest.js.
   Nothing here is interactive; it is all composition + motion. */
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

  // ---------- counts ----------
  const setCount = (sel, n) => { const t = $(sel); if (t) t.textContent = String(n); };
  setCount('#motion-count', A.motion.length + A.sprites.length);
  setCount('#deco-count', allDeco.length);
})();
