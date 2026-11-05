// DINOVERSE — the jam hall. A 3D game jam floor: one aisle, the app booths along its left,
// the game booths along its right, the teaser booth at the far end. You walk a capsule down it
// (WASD or the arrow keys; a joystick circle on touch screens), seen from behind in third person.
// Step up to a booth and the camera turns to it while its card (line, downloads, app code) opens
// beside it. Cards come from app.js (buildPanel / buildGamePanel / buildComingSoonPanel), so
// unlocking and downloads work exactly as before.
import * as THREE from './vendor/three.module.min.js';

const section = document.getElementById('hall');
const DATA = window.DINO_DATA || {};
const APPS = Array.isArray(DATA.apps) ? DATA.apps : [];
const GAMES = Array.isArray(window.DINO_GAMES) ? window.DINO_GAMES : [];
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = window.matchMedia('(pointer: coarse)').matches;
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const COLORS = { ink: '#0c0c0c', paper: '#eceae1', blue: '#2b46ff', lime: '#ccff00' };

// the hall's layout, in metres: the aisle runs from the entrance (z > 0) towards -z
const AISLE = 4.4; // half its width: how far the player may step to either side
const BOOTH = { w: 6, d: 4, h: 3 }; // a booth's width along the aisle, its depth, its walls
const pad = (i) => String(i).padStart(2, '0');

/* ---------- textures drawn on canvases ---------- */
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// a sign: the word in heavy capitals, as large as fits; a hidden name is drawn as coarse blocks
function signTexture(text, { bg, fg, mosaic = false }) {
  return canvasTexture(1024, 192, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const line = text.replace(/\n/g, ' ').toUpperCase();
    let size = 150;
    g.font = `900 ${size}px ${FONT}`;
    while (g.measureText(line).width > w - 80 && size > 40) { size -= 4; g.font = `900 ${size}px ${FONT}`; }
    g.fillStyle = fg; g.textBaseline = 'middle';
    if (!mosaic) { g.fillText(line, 40, h / 2 + size * 0.04); return; }
    const block = Math.max(18, Math.round(size / 3.5)); // drawn small, then blown up block by block: coarse enough to stay unreadable
    const s = document.createElement('canvas');
    s.width = Math.ceil(w / block); s.height = Math.ceil(h / block);
    const sg = s.getContext('2d');
    sg.font = `900 ${size / block}px ${FONT}`; sg.fillStyle = fg; sg.textBaseline = 'middle';
    sg.fillText(line, 40 / block, h / 2 / block);
    g.imageSmoothingEnabled = false;
    g.drawImage(s, 0, 0, w, h);
  });
}

function wrap(g, text, maxW) {
  const lines = []; let line = '';
  text.split(/\s+/).forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > maxW && line) { lines.push(line); line = word; } else line = next;
  });
  if (line) lines.push(line);
  return lines;
}

// the booth's back wall: its number big at the top right, its line set heavy at the left
function wallTexture(num, line, { bg, fg, accent }) {
  return canvasTexture(1024, 512, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.textBaseline = 'top';
    g.font = `900 210px ${FONT}`;
    g.textAlign = 'right'; g.fillText(num, w - 36, 22);
    g.textAlign = 'left';
    if (!line) return;
    let size = 46;
    let lines;
    for (;;) {
      g.font = `900 ${size}px ${FONT}`;
      lines = wrap(g, line, 560);
      if (lines.length * size * 1.12 < h - 120 || size < 26) break;
      size -= 2;
    }
    g.fillStyle = accent;
    lines.forEach((l, k) => g.fillText(l, 40, 60 + k * size * 1.12));
  });
}

function gridTexture() {
  const t = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#d9d5c7'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.09)'; g.lineWidth = 3;
    g.strokeRect(0, 0, w, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const blob = canvasTexture(128, 128, (g, w, h) => {
  const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  r.addColorStop(0, 'rgba(0,0,0,0.42)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, h);
});

const loader = new THREE.TextureLoader();
function imageTexture(src) {
  const t = loader.load(src);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
// the icon on a dark screen, as a texture for the monitor
function screenTexture(src) {
  const t = canvasTexture(512, 320, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.6);
    r.addColorStop(0, '#1d2a7a'); r.addColorStop(1, '#070915');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
  if (src) {
    const img = new Image();
    img.onload = () => {
      const g = t.image.getContext('2d');
      const s = Math.min((t.image.width * 0.6) / img.width, (t.image.height * 0.72) / img.height);
      g.drawImage(img, (t.image.width - img.width * s) / 2, (t.image.height - img.height * s) / 2, img.width * s, img.height * s);
      t.needsUpdate = true;
    };
    img.src = src;
  }
  return t;
}

/* ---------- scene pieces ---------- */
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.02, ...extra });

function box(w, h, d, materials, at) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials);
  m.position.set(...at);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function blobShadow(size) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.012;
  return m;
}

// a capsule: a game engine's placeholder player, plain grey, a dark visor showing which way it faces
const CAPSULE = new THREE.CapsuleGeometry(0.34, 1.0, 8, 20);
const CAPSULE_MAT = mat(0xcfcfd3, { roughness: 0.45 });
const VISOR = new THREE.BoxGeometry(0.42, 0.14, 0.12);
function capsule({ marker = false } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(CAPSULE, CAPSULE_MAT);
  body.position.y = 0.84; body.castShadow = true;
  const visor = new THREE.Mesh(VISOR, mat(0x1b1b20, { roughness: 0.3 }));
  visor.position.set(0, 1.3, -0.29);
  g.add(body, visor, blobShadow(1.1));
  if (marker) { // the player: a lime ring on the floor around it
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 40), new THREE.MeshBasicMaterial({ color: COLORS.lime }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.015;
    g.add(ring);
  }
  g.userData.body = body;
  return g;
}

// mascots and stickers stand as cut-outs that turn to face the camera
const billboards = [];
function cutout(src, height, at) {
  const tex = imageTexture(src);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide }));
  m.scale.set(height, height, 1); // until the picture says how wide it is
  const img = new Image(); img.onload = () => { m.scale.set(height * (img.width / img.height), height, 1); }; img.src = src;
  m.position.set(at[0], height / 2, at[1]);
  const shadow = blobShadow(height * 0.7); shadow.position.set(at[0], 0.012, at[1]);
  const g = new THREE.Group(); g.add(m, shadow);
  billboards.push(m);
  return g;
}

/* ---------- a booth ---------- */
// side: -1 on the left of the aisle (opening towards +x), 1 on the right, 0 at the far end
function booth({ side, z, num, name, mosaic, line, palette, screen, mascot, extras = [] }) {
  const { w, d, h } = BOOTH;
  const g = new THREE.Group();
  const wall = mat(palette.wall), trim = mat(palette.trim);
  // carpet
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(palette.carpet));
  carpet.rotation.x = -Math.PI / 2; carpet.position.y = 0.01; carpet.receiveShadow = true;
  g.add(carpet);
  // back wall with the number and the line on it, a sign with the name on top
  const wallTex = wallTexture(num, line, { bg: palette.wallHex, fg: palette.numHex, accent: palette.lineHex });
  g.add(box(w, h, 0.2, [wall, wall, trim, wall, mat(0xffffff, { map: wallTex }), wall], [0, h / 2, -d / 2]));
  const sign = signTexture(name, { bg: palette.signHex, fg: palette.signFg, mosaic });
  g.add(box(w, 0.95, 0.22, [trim, trim, trim, trim, mat(0xffffff, { map: sign }), trim], [0, h + 0.5, -d / 2 + 0.05]));
  // low side partitions
  g.add(box(0.14, 2.2, d, wall, [-w / 2, 1.1, 0]), box(0.14, 2.2, d, wall, [w / 2, 1.1, 0]));
  // the demo table and the monitor on it
  const top = mat(0x1c1c22), drape = mat(palette.table);
  g.add(box(2.6, 0.95, 1.1, [drape, drape, top, top, drape, drape], [1.1, 0.475, 0.1]));
  const frame = mat(0x0e0e10);
  g.add(box(1.4, 0.86, 0.08, [frame, frame, frame, frame, new THREE.MeshBasicMaterial({ map: screenTexture(screen) }), frame], [1.1, 1.5, -0.1]));
  g.add(box(0.12, 0.12, 0.12, frame, [1.1, 1.01, -0.1]));
  // someone minding the booth
  const staff = capsule(); staff.position.set(1.1, 0, -0.95); staff.userData.idle = Math.random() * 6;
  g.add(staff); idlers.push(staff);
  // the mascot as a cut-out, stickers by the table
  if (mascot) g.add(cutout(mascot, 1.9, [-1.9, 1.1]));
  extras.forEach((src, k) => g.add(cutout(src, 0.8, [[-0.6, 1.45], [2.5, 1.5]][k] || [0, 1.5])));

  if (side === 0) { g.position.set(0, 0, z); }
  else { g.position.set(side * (AISLE + 0.4 + d / 2), 0, z); g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; }
  g.updateMatrixWorld(true);
  return g;
}

/* ---------- the scene ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  renderer = null;
}
const idlers = [];
const booths = [];

if (!renderer) {
  // no WebGL: the cards stand one under another
  section.classList.add('hall--flat');
  const list = document.createElement('div');
  list.className = 'hall-list';
  APPS.forEach((a, i) => list.appendChild(window.buildPanel(a, i).firstElementChild));
  GAMES.forEach((g, k) => list.appendChild(window.buildGamePanel(g, APPS.length + k)));
  list.appendChild(window.buildComingSoonPanel(APPS.length + GAMES.length + 1));
  section.appendChild(list);
  window.mosaicNames && window.mosaicNames();
} else {
  start();
}

function start() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, TOUCH ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !TOUCH;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'hall-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  section.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0c0c);
  scene.fog = new THREE.Fog(0x0c0c0c, 22, 60);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f66, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(9, 16, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 50 });
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);

  // the hall floor and its edges
  const floorTex = gridTexture(); floorTex.repeat.set(20, 40);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 80), mat(0xffffff, { map: floorTex }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = -22; floor.receiveShadow = true;
  scene.add(floor);
  const aisle = new THREE.Mesh(new THREE.PlaneGeometry(AISLE * 2, 60), mat(0xc9c4b4));
  aisle.rotation.x = -Math.PI / 2; aisle.position.set(0, 0.005, -22); aisle.receiveShadow = true;
  scene.add(aisle);

  // corner signs at the start of each side
  const corner = (word, x, palette) => {
    const sign = signTexture(word, { bg: palette.signHex, fg: palette.signFg });
    const post = mat(0x1a1a1a);
    const s = box(5.2, 1.2, 0.2, [post, post, post, post, mat(0xffffff, { map: sign }), post], [x, 4.6, -2.6]);
    scene.add(s, box(0.12, 4.0, 0.12, post, [x - 2.3, 2.0, -2.6]), box(0.12, 4.0, 0.12, post, [x + 2.3, 2.0, -2.6]));
  };
  const APP_PAL = {
    wall: 0x2b46ff, trim: 0x1a2fbf, carpet: 0x1d2fb8, table: 0xccff00,
    wallHex: COLORS.blue, numHex: COLORS.paper, lineHex: COLORS.paper, signHex: COLORS.ink, signFg: COLORS.paper,
  };
  const GAME_PAL = {
    wall: 0xccff00, trim: 0x8fb300, carpet: 0x23232a, table: 0x2b46ff,
    wallHex: COLORS.lime, numHex: COLORS.ink, lineHex: COLORS.ink, signHex: COLORS.ink, signFg: COLORS.lime,
  };
  const SOON_PAL = { ...APP_PAL, wall: 0x2a2a30, trim: 0x15151a, carpet: 0x18181c, table: 0xccff00, wallHex: '#2a2a30' };
  corner('APPS', -(AISLE + 2.4), APP_PAL);
  corner('GAMES', AISLE + 2.4, GAME_PAL);

  // the booths, each with its card ready beside the view
  const panel = section.querySelector('.booth-panel');
  const add = (spec, card) => {
    const g = booth(spec);
    scene.add(g);
    card.classList.add('booth-card');
    card.hidden = true;
    panel.appendChild(card);
    const front = new THREE.Vector3(0, 0, BOOTH.d / 2 + 1.2).applyMatrix4(g.matrixWorld);
    booths.push({ group: g, card, front });
  };
  const spacing = BOOTH.w + 1.6;
  APPS.forEach((a, i) => {
    const card = window.buildPanel(a, i).firstElementChild;
    add({ side: -1, z: -6 - i * spacing, num: pad(i + 1), name: (a.name || a.id), line: a.description, palette: APP_PAL, screen: a.icon, mascot: a.image }, card);
  });
  GAMES.forEach((gm, k) => {
    const card = window.buildGamePanel(gm, APPS.length + k);
    add({ side: 1, z: -6 - k * spacing, num: pad(APPS.length + k + 1), name: gm.name || gm.id, mosaic: !!gm.mosaic, line: gm.description, palette: GAME_PAL, screen: gm.icon, mascot: gm.image, extras: gm.stickers || [] }, card);
  });
  const farZ = -6 - Math.max(APPS.length, GAMES.length) * spacing - 3;
  add({ side: 0, z: farZ, num: pad(APPS.length + GAMES.length + 1), name: 'MORE TO COME', line: 'More is on the way.', palette: SOON_PAL }, window.buildComingSoonPanel(APPS.length + GAMES.length + 1));
  const minZ = farZ + BOOTH.d / 2 + 0.8, maxZ = 7;

  // the player, and visitors wandering the aisle
  const player = capsule({ marker: true });
  player.position.set(0, 0, 5);
  scene.add(player);
  const visitors = [];
  for (let i = 0; i < 6; i++) {
    const v = capsule();
    v.position.set((Math.random() * 2 - 1) * (AISLE - 0.8), 0, minZ + Math.random() * (maxZ - minZ - 4));
    v.userData.goal = v.position.clone(); v.userData.wait = Math.random() * 3;
    scene.add(v); visitors.push(v);
  }

  /* ---------- input: WASD and the arrows; a joystick circle on touch ---------- */
  const keys = new Set();
  const KEYMAP = { KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
  let active = false; // the hall fills most of the window: the keys walk instead of scroll
  window.addEventListener('keydown', (e) => {
    const k = KEYMAP[e.code];
    if (!k || !active || e.target.closest('input, textarea')) return;
    e.preventDefault(); keys.add(k);
  });
  window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) keys.delete(k); });
  window.addEventListener('blur', () => keys.clear());

  const stick = { x: 0, y: 0 };
  const joy = section.querySelector('.joystick');
  if (TOUCH && joy) {
    joy.hidden = false;
    const knob = joy.querySelector('.joystick-knob');
    let id = null;
    const move = (e) => {
      const r = joy.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const max = r.width / 2, len = Math.hypot(dx, dy);
      if (len > max) { dx *= max / len; dy *= max / len; }
      stick.x = dx / max; stick.y = dy / max;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    joy.addEventListener('pointerdown', (e) => { id = e.pointerId; joy.setPointerCapture(id); move(e); e.preventDefault(); });
    joy.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    const end = () => { id = null; stick.x = stick.y = 0; knob.style.transform = ''; };
    joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
  }

  // a handle for checking the hall from a test page: where the player is, and moving it
  window.DINO_HALL = { player, booths };

  /* ---------- the loop ---------- */
  const camPos = new THREE.Vector3(0, 4.6, 12.5), camLook = new THREE.Vector3(0, 1, 0);
  camera.position.copy(camPos);
  let focused = null, visible = false, last = performance.now();
  const tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3();

  const io = new IntersectionObserver((entries) => {
    const r = entries[0].intersectionRatio;
    visible = r > 0; active = r > 0.55;
    if (!active) keys.clear();
    if (visible) { last = performance.now(); requestAnimationFrame(frame); }
  }, { threshold: [0, 0.55, 1] });
  io.observe(section);

  function resize() {
    const w = section.clientWidth, h = section.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 68 : 50; // a portrait screen needs a wider lens to see both sides of the aisle
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  function focus(b) {
    if (b === focused) return;
    if (focused) { focused.card.hidden = true; }
    focused = b;
    panel.classList.toggle('open', !!b);
    section.classList.toggle('hall--focus', !!b);
    if (b) { b.card.hidden = false; window.mosaicNames && window.mosaicNames(); }
    // on a phone the joystick moves up above the card
    if (joy) joy.style.bottom = b && section.clientWidth < 760 ? `${panel.offsetHeight + 24}px` : '';
  }

  function frame(now) {
    if (!visible) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;

    // walk: screen-relative, the camera always looks down the aisle
    let mx = stick.x, mz = stick.y;
    if (keys.has('l')) mx -= 1; if (keys.has('r')) mx += 1;
    if (keys.has('u')) mz -= 1; if (keys.has('d')) mz += 1;
    const len = Math.hypot(mx, mz);
    if (len > 0.05) {
      const speed = 4.6 * Math.min(1, len);
      player.position.x = THREE.MathUtils.clamp(player.position.x + (mx / len) * speed * dt, -AISLE, AISLE);
      player.position.z = THREE.MathUtils.clamp(player.position.z + (mz / len) * speed * dt, minZ, maxZ);
      const want = Math.atan2(-mx, -mz);
      let d = want - player.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
      player.rotation.y += d * Math.min(1, dt * 12);
      player.userData.body.position.y = 0.84 + Math.abs(Math.sin(now / 95)) * 0.06;
    } else player.userData.body.position.y += (0.84 - player.userData.body.position.y) * 0.2;

    // the nearest booth within reach takes the camera
    let near = null, best = 3.0;
    booths.forEach((b) => { const dd = Math.hypot(b.front.x - player.position.x, b.front.z - player.position.z); if (dd < best) { best = dd; near = b; } });
    if (focused && !near) { const dd = Math.hypot(focused.front.x - player.position.x, focused.front.z - player.position.z); if (dd < 3.8) near = focused; }
    focus(near);

    if (focused) {
      // stand in front of the booth, a little off its centre so the card beside it leaves it in view
      const narrow = section.clientWidth < 760;
      // high enough that the player standing in front of it sits below the booth, not across it
      // on a phone the card covers the lower half, so the booth is framed in the upper half
      tmpPos.set(narrow ? 0.4 : 0.9, narrow ? 9.5 : 5.6, narrow ? 10.5 : 7.6).applyMatrix4(focused.group.matrixWorld);
      tmpLook.set(narrow ? 0.4 : 1.9, narrow ? -2.6 : 1.0, narrow ? 2.4 : -0.6).applyMatrix4(focused.group.matrixWorld);
    } else {
      // third person: behind the player and above, looking down the aisle past it
      const back = section.clientWidth < section.clientHeight ? 8.6 : 7.2;
      tmpPos.set(player.position.x * 0.85, back * 0.6, player.position.z + back);
      tmpLook.set(player.position.x * 0.9, 1.1, player.position.z - 3.5);
    }
    const k = 1 - Math.exp(-dt * (REDUCED ? 30 : 4));
    camPos.lerp(tmpPos, k); camLook.lerp(tmpLook, k);
    camera.position.copy(camPos); camera.lookAt(camLook);
    sun.position.set(player.position.x + 9, 16, player.position.z + 8);
    sun.target.position.set(player.position.x, 0, player.position.z - 4);

    // visitors stroll from spot to spot; the people minding the booths shift their weight
    if (!REDUCED) {
      visitors.forEach((v) => {
        const u = v.userData;
        if (u.wait > 0) { u.wait -= dt; return; }
        const dx = u.goal.x - v.position.x, dz = u.goal.z - v.position.z, dd = Math.hypot(dx, dz);
        if (dd < 0.2) {
          u.goal.set((Math.random() * 2 - 1) * (AISLE - 0.8), 0, THREE.MathUtils.clamp(v.position.z + (Math.random() * 2 - 1) * 12, minZ, maxZ - 2));
          u.wait = 0.5 + Math.random() * 3; return;
        }
        v.position.x += (dx / dd) * 1.3 * dt; v.position.z += (dz / dd) * 1.3 * dt;
        v.rotation.y = Math.atan2(-dx, -dz);
        v.userData.body.position.y = 0.84 + Math.abs(Math.sin(now / 110 + v.id)) * 0.05;
      });
      idlers.forEach((s) => { if (s.userData.body) s.userData.body.position.y = 0.84 + Math.sin(now / 900 + (s.userData.idle || 0)) * 0.025; });
    }
    // cut-outs turn to the camera
    billboards.forEach((m) => {
      m.getWorldPosition(tmpPos);
      const parentRot = m.parent.parent ? m.parent.parent.rotation.y : 0;
      m.rotation.y = Math.atan2(camera.position.x - tmpPos.x, camera.position.z - tmpPos.z) - parentRot;
    });

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
}
