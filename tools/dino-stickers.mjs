// Local-only asset builder for the sowhat-dino sticker bomb — NOT run in CI.
// Two sources, one manifest:
//   family/ — image/dino-family/*.png, each a 3x3 contact sheet of one species
//             on a flat black ground, sliced into one webp per pose
//   herd/   — the game project's animation library, sampled a few frames deep
//             per action so the poses read as different animals, not a loop
// Only the generated output under sowhat-dino/ is committed.
//
// Needs ImageMagick on PATH (brew install imagemagick).
//
// Usage:
//   node tools/dino-stickers.mjs
//   node tools/dino-stickers.mjs --game ~/development/sowhat-dino --per 3

import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const SRC = resolve(arg('src', 'image/dino-family'));
const OUT = resolve(arg('out', 'sowhat-dino/image'));
const MANIFEST = resolve(arg('manifest', 'sowhat-dino/assets/dinos.js'));
const GAME = resolve(arg('game', `${process.env.HOME}/development/sowhat-dino`));
const PER = Number(arg('per', 2));            // frames sampled per action
const HEIGHT = Number(arg('height', 190));
const QUALITY = Number(arg('quality', 72));

// the sheets have no alpha — the ground is flat black. Flooding from a corner
// lifts only the connected outside, so the dinos keep their own black linework.
const KEY = ['-alpha', 'set', '-fuzz', '12%', '-fill', 'none', '-floodfill', '+0+0', 'black'];

const magick = (args) => execFileSync('magick', args, { encoding: 'utf8', maxBuffer: 64 << 20 });

// natural sort: walk2 before walk10
const nat = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

// one bounding box per sticker, read off the alpha channel
const blobs = (src) => {
  const report = magick([
    src, ...KEY, '-alpha', 'extract', '-threshold', '20%',
    '-define', 'connected-components:verbose=true',
    '-define', 'connected-components:area-threshold=20000',
    '-connected-components', '8', 'null:',
  ]);
  return report
    .split('\n')
    .map((l) => l.match(/^\s*\d+:\s+(\d+)x(\d+)\+(\d+)\+(\d+)\s.*srgb\(255,255,255\)/))
    .filter(Boolean)
    .map(([, w, h, x, y]) => ({ w: +w, h: +h, x: +x, y: +y }));
};

// A flood fill can leak through a thin outline and cut one sticker into two
// blobs. Poses on a contact sheet sit well apart, so anything this close
// overlap belong to the same animal: union them until nothing else touches.
const merge = (boxes, gap = 0) => {
  const hit = (a, b) =>
    a.x - gap < b.x + b.w && b.x - gap < a.x + a.w &&
    a.y - gap < b.y + b.h && b.y - gap < a.y + a.h;
  const out = [];
  for (const box of boxes) {
    let cur = box;
    for (let i = out.length - 1; i >= 0; i--) {
      if (!hit(cur, out[i])) continue;
      const o = out.splice(i, 1)[0];
      const x = Math.min(cur.x, o.x);
      const y = Math.min(cur.y, o.y);
      cur = {
        x, y,
        w: Math.max(cur.x + cur.w, o.x + o.w) - x,
        h: Math.max(cur.y + cur.h, o.y + o.h) - y,
      };
      i = out.length; // the union may now reach boxes it did not before
    }
    out.push(cur);
  }
  // reading order: rows top to bottom, then left to right within a row
  return out.sort((a, b) => (Math.abs(a.y - b.y) > 120 ? a.y - b.y : a.x - b.x));
};

const FAMILY = join(OUT, 'family');
const HERD = join(OUT, 'herd');
for (const dir of [FAMILY, HERD]) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

const files = [];

// ---------- 1. the species sheets ----------
const sheets = readdirSync(SRC).filter((f) => /\.png$/i.test(f)).sort();

for (const sheet of sheets) {
  const src = join(SRC, sheet);
  const species = basename(sheet, '.png').toLowerCase();
  const found = merge(blobs(src));
  found.forEach((b, i) => {
    // pad the crop a little so the white sticker outline is never clipped
    const pad = 6;
    const file = `${species}-${i + 1}.webp`;
    magick([
      src, ...KEY,
      '-crop', `${b.w + pad * 2}x${b.h + pad * 2}+${Math.max(0, b.x - pad)}+${Math.max(0, b.y - pad)}`,
      '+repage', '-trim', '+repage',
      '-resize', `x${HEIGHT}`,
      '-quality', String(QUALITY),
      join(FAMILY, file),
    ]);
    files.push(`family/${file}`);
  });
  console.log(`${species}: ${found.length}`);
}

// ---------- 2. the game project's animation library ----------
// Every leaf folder is one action; its frames are a loop, so sampling evenly
// across it is what turns 60 near-identical frames into a few real poses.
const leaves = (dir) => {
  const out = [];
  const walk = (d) => {
    const entries = readdirSync(d, { withFileTypes: true });
    if (entries.some((e) => e.isFile() && /\.png$/i.test(e.name))) out.push(d);
    entries.filter((e) => e.isDirectory()).forEach((e) => walk(join(d, e.name)));
  };
  walk(dir);
  return out.sort();
};

const DINO_SRC = join(GAME, 'image/use/dino');
if (existsSync(DINO_SRC)) {
  for (const dir of leaves(DINO_SRC)) {
    const frames = readdirSync(dir).filter((f) => /\.png$/i.test(f)).sort(nat);
    if (frames.length < PER) continue;          // too short to hold PER poses
    const action = dir.slice(DINO_SRC.length + 1).replace(/[\\/]/g, '-');
    let kept = PER;
    for (let i = 0; i < PER; i++) {
      // spread the picks across the loop, skipping the ends where most
      // actions sit in the same neutral rest frame
      const at = Math.round(((i + 0.5) / PER) * (frames.length - 1));
      const file = `${action}-${i + 1}.webp`;
      const dest = join(HERD, file);
      magick([
        join(dir, frames[at]), '-trim', '+repage',
        '-resize', `x${HEIGHT}`, '-quality', String(QUALITY), dest,
      ]);
      // some actions (peep) spend frames almost entirely off-canvas and trim
      // down to a sliver — no use as a sticker
      const [w, h] = magick(['identify', '-format', '%w %h', dest]).split(' ').map(Number);
      if (w / h < 0.35) { rmSync(dest); kept--; continue; }
      files.push(`herd/${file}`);
    }
    console.log(`${action}: ${kept} of ${frames.length}`);
  }
} else {
  console.log(`(no game project at ${DINO_SRC} — family stickers only)`);
}

writeFileSync(MANIFEST,
  '// Generated by tools/dino-stickers.mjs — do not hand-edit.\n' +
  `window.SOWHAT_DINOS = ${JSON.stringify(files, null, 1)};\n`);

console.log(`\n${files.length} stickers -> ${OUT}`);
