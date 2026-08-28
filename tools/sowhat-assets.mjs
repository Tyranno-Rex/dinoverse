// Local-only asset builder for sowhat-dino/ — NOT run in CI.
// Reads the game project's PNG library and emits web-sized webp + a manifest.
// Only the generated output under sowhat-dino/ is committed.
//
// Usage:
//   SHARP_DIR=<dir containing node_modules/sharp> node tools/sowhat-assets.mjs
//   node tools/sowhat-assets.mjs --src "C:/.../sowhat-dino/image/use"

import { createRequire } from 'node:module';
import { readdirSync, mkdirSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const SRC = resolve(arg('src', 'C:/Users/eunseong/Desktop/games/sowhat-dino/image/use'));
const OUT = resolve(arg('out', 'sowhat-dino/image'));
const HERO_SRC = resolve(arg('hero', 'data/sowhat-dino/main-page.png'));

const sharpDir = process.env.SHARP_DIR;
const require_ = createRequire(sharpDir ? join(sharpDir, 'noop.js') : import.meta.url);
const sharp = require_('sharp');

// natural sort: walk2 before walk10
const nat = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const pngs = (dir) => readdirSync(dir).filter((f) => /\.png$/i.test(f)).sort(nat);

// ---------- what goes on the page ----------

// Three sequences get real frame-by-frame animation (sprite strips).
const SPRITES = [
  { key: 'sowhat', dir: 'dino/sowhat', frames: 16, height: 320 },
  { key: 'dance', dir: 'dino/dance1', frames: 16, height: 260 },
  { key: 'guitar', dir: 'dino/play-guitar', frames: 16, height: 260 },
];

// Every other action contributes one representative still to the motion marquee.
const MOTION_LABELS = {
  box: 'UNBOXING', clean: 'CLEANING', cook: 'COOKING', dance2: 'DANCING',
  dance3: 'DANCING', dance4: 'DANCING', drag: 'DRAGGED', 'eat-fish': 'EATING FISH',
  'eat-meat': 'EATING MEAT', 'eat-rice': 'EATING RICE', jump: 'JUMPING',
  'keyboard-sitdown': 'TYPING', liedown: 'LYING DOWN', paint: 'PAINTING',
  peep: 'PEEPING', phone: 'ON THE PHONE', 'play-draw': 'DRAWING',
  'play-game': 'GAMING', 'play-sing': 'SINGING', readbook: 'READING',
  'self-talk': 'TALKING TO SELF', sitdown: 'SITTING', situp: 'STANDING UP',
  'stock-up': 'STOCKING UP', stretching: 'STRETCHING', tease: 'TEASING',
  walk: 'WALKING', watch_movie: 'WATCHING A MOVIE', water: 'WATERING',
  work: 'WORKING', yoga: 'DOING YOGA',
};

const DECO_LABELS = {
  bedroom: 'BEDROOM', food1: 'FOOD', food2: 'MORE FOOD', gameroom: 'GAME ROOM',
  hobby: 'HOBBY', kitchen: 'KITCHEN', 'light&book': 'LIGHT & BOOKS',
  normal1: 'EVERYDAY', normal2: 'EVERYDAY II', normal3: 'EVERYDAY III',
  'paint&clean-stuff': 'PAINT & CLEAN', plant: 'PLANTS',
};

// ---------- helpers ----------

const ensure = (dir) => mkdirSync(dir, { recursive: true });

async function toWebp(src, dest, { width, height, quality = 78 }) {
  await sharp(src)
    .resize({ width, height, fit: 'inside', withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toFile(dest);
}

// Pick `count` frames spread evenly across the sequence.
const sample = (list, count) => {
  if (list.length <= count) return list;
  const step = list.length / count;
  return Array.from({ length: count }, (_, i) => list[Math.floor(i * step)]);
};

// A sprite strip needs every cell identical, so pad each frame onto one canvas.
async function buildSprite({ key, dir, frames, height }) {
  const srcDir = join(SRC, dir);
  const picked = sample(pngs(srcDir), frames).map((f) => join(srcDir, f));

  const metas = await Promise.all(picked.map((p) => sharp(p).metadata()));
  const maxW = Math.max(...metas.map((m) => m.width));
  const maxH = Math.max(...metas.map((m) => m.height));
  const scale = height / maxH;
  const cellW = Math.round(maxW * scale);
  const cellH = height;

  const cells = await Promise.all(
    picked.map((p) =>
      sharp(p)
        // fit each frame inside the cell, anchored to the floor so the dino
        // does not bob when frame bounds change
        .resize({ width: cellW, height: cellH, fit: 'contain', position: 'south',
                  background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    )
  );

  const dest = join(OUT, 'sprite', `${key}.webp`);
  ensure(join(OUT, 'sprite'));
  await sharp({
    create: { width: cellW * cells.length, height: cellH, channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(cells.map((input, i) => ({ input, left: i * cellW, top: 0 })))
    .webp({ quality: 82, effort: 6 })
    .toFile(dest);

  return { key, frames: cells.length, cellW, cellH };
}

// ---------- build ----------

rmSync(OUT, { recursive: true, force: true });
ensure(OUT);

console.log('hero…');
ensure(join(OUT, 'hero'));
await toWebp(HERO_SRC, join(OUT, 'hero', 'main-page.webp'), { width: 1658, quality: 84 });

console.log('sprites…');
const sprites = [];
for (const s of SPRITES) sprites.push(await buildSprite(s));

console.log('motion stills…');
ensure(join(OUT, 'motion'));
const motion = [];
for (const [name, label] of Object.entries(MOTION_LABELS)) {
  const srcDir = join(SRC, 'dino', name);
  if (!existsSync(srcDir)) { console.warn(`  skip ${name} (missing)`); continue; }
  const files = pngs(srcDir);
  if (!files.length) { console.warn(`  skip ${name} (empty)`); continue; }
  // 40% in: past the wind-up, usually the readable peak of the action
  const frame = files[Math.floor(files.length * 0.4)];
  const file = `${name}.webp`;
  await toWebp(join(srcDir, frame), join(OUT, 'motion', file), { height: 300 });
  motion.push({ name, label, file });
}

console.log('deco…');
const deco = [];
for (const [cat, label] of Object.entries(DECO_LABELS)) {
  const srcDir = join(SRC, 'deco', cat);
  if (!existsSync(srcDir)) { console.warn(`  skip ${cat} (missing)`); continue; }
  const slug = cat.replace(/[^a-z0-9]+/gi, '-');
  ensure(join(OUT, 'deco', slug));
  const items = [];
  for (const f of pngs(srcDir)) {
    const file = f.replace(/\.png$/i, '.webp');
    await toWebp(join(srcDir, f), join(OUT, 'deco', slug, file), { width: 220 });
    items.push(file);
  }
  deco.push({ cat: slug, label, items });
  console.log(`  ${slug}: ${items.length}`);
}

const manifest = { sprites, motion, deco };
writeFileSync(
  resolve('sowhat-dino/assets/manifest.js'),
  '// Generated by tools/sowhat-assets.mjs — do not hand-edit.\n' +
    'window.SOWHAT_ASSETS = ' + JSON.stringify(manifest, null, 1) + ';\n'
);

const bytes = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce(
    (n, e) => n + (e.isDirectory() ? bytes(join(dir, e.name)) : statSync(join(dir, e.name)).size), 0);

console.log(
  `\ndone — ${sprites.length} sprites, ${motion.length} motion stills, ` +
  `${deco.reduce((n, d) => n + d.items.length, 0)} deco items, ` +
  `${(bytes(OUT) / 1048576).toFixed(2)} MB total`
);
