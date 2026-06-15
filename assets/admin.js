// DINOVERSE admin — builds an encrypted data.js the public site can read.
// Uses assets/crypto.js (encryptJSON) so output matches the site's decryptJSON.
// Passwords are NEVER saved to localStorage; only typed at generate time.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const STORE = 'dinoverse-admin-v1';

const SEED = [
  { id: 'flowdesk', name: 'FlowDesk', version: '1.0.0', description: '', platforms: ['win'], publish: true, files: [{ label: 'Windows 설치 (.exe)', url: '', size: '' }] },
  { id: 'brachy', name: 'Brachy', version: '1.0.0', description: '', platforms: ['win'], publish: true, files: [{ label: 'Windows 설치 (.exe)', url: '', size: '' }] },
  { id: 'typedino', name: 'TypeDino', version: '0.1.0', description: '', platforms: ['win'], publish: true, files: [{ label: 'Windows 설치 (.msi)', url: '', size: '' }] },
];

const slug = (s) => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ---------- build file row ---------- */
function addFileRow(filesEl, file = {}) {
  const node = $('#file-tpl').content.cloneNode(true);
  $('.f-flabel', node).value = file.label || '';
  $('.f-furl', node).value = file.url || '';
  $('.f-fsize', node).value = file.size || '';
  $('.rm-file', node).addEventListener('click', (e) => e.target.closest('.file-row').remove());
  filesEl.appendChild(node);
}

/* ---------- build app row ---------- */
function addAppRow(app = {}) {
  const node = $('#app-tpl').content.cloneNode(true);
  const el = $('.app', node);
  el.dataset.id = app.id || '';
  $('.f-name', node).value = app.name || '';
  $('.f-version', node).value = app.version || '';
  $('.f-desc', node).value = app.description || '';
  $('.f-publish', node).checked = app.publish !== false;
  (app.platforms || []).forEach((p) => {
    const cb = $(`.f-plat[value="${p}"]`, node);
    if (cb) cb.checked = true;
  });
  const filesEl = $('.files', node);
  (app.files && app.files.length ? app.files : [{}]).forEach((f) => addFileRow(filesEl, f));
  $('.add-file', node).addEventListener('click', () => addFileRow(filesEl, {}));

  $('.f-publish', node).addEventListener('change', (e) => el.classList.toggle('off', !e.target.checked));
  el.classList.toggle('off', app.publish === false);
  $('.rm-app', node).addEventListener('click', () => el.remove());
  $('.eye-app', node).addEventListener('click', () => {
    const i = $('.f-apppw', el); i.type = i.type === 'password' ? 'text' : 'password';
  });

  $('#apps').appendChild(node);
  // live id label: keep manual id if present, else derive from name
  const realEl = $('#apps').lastElementChild;
  const lbl = $('.id', realEl);
  const name = $('.f-name', realEl);
  const sync = () => { lbl.textContent = 'id: ' + (realEl.dataset.id || slug(name.value) || '—'); };
  name.addEventListener('input', () => { realEl.dataset.id = ''; sync(); });
  sync();
}

/* ---------- collect DOM -> array ---------- */
function collect() {
  return $$('#apps .app').map((el) => ({
    id: el.dataset.id || slug($('.f-name', el).value),
    name: $('.f-name', el).value.trim(),
    version: $('.f-version', el).value.trim(),
    description: $('.f-desc', el).value.trim(),
    platforms: $$('.f-plat', el).filter((c) => c.checked).map((c) => c.value),
    password: $('.f-apppw', el).value,
    publish: $('.f-publish', el).checked,
    files: $$('.file-row', el).map((r) => ({
      label: $('.f-flabel', r).value.trim(),
      url: $('.f-furl', r).value.trim(),
      size: $('.f-fsize', r).value.trim(),
    })).filter((f) => f.url || f.label),
  }));
}

/* ---------- persistence (no passwords) ---------- */
function saveState() {
  const apps = collect().map(({ password, ...rest }) => rest);
  const state = { title: $('#cfg-title').value, hero: $('#cfg-hero').value, apps };
  localStorage.setItem(STORE, JSON.stringify(state));
  setStatus('상태 저장됨 ✓');
}
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE));
    if (s && s.apps) {
      $('#cfg-title').value = s.title || 'DINOVERSE';
      $('#cfg-hero').value = s.hero || '';
      return s.apps;
    }
  } catch {}
  return SEED;
}

function setStatus(msg) {
  const s = $('#status'); s.textContent = msg;
  setTimeout(() => { if (s.textContent === msg) s.textContent = ''; }, 4000);
}

/* ---------- generate data.js ---------- */
async function generate() {
  const apps = collect();
  const ids = {};
  for (const a of apps) {
    if (!a.id) { setStatus('⚠ 이름이 비어있는 앱이 있습니다'); return; }
    if (ids[a.id]) { setStatus(`⚠ 중복 id: ${a.id} (이름을 다르게)`); return; }
    ids[a.id] = 1;
  }
  const published = apps.filter((a) => a.publish);
  if (!published.length) { setStatus('⚠ 배포할 앱이 없습니다'); return; }

  setStatus('생성 중…');
  const out = [];
  for (const a of published) {
    const base = { id: a.id, name: a.name || a.id, description: a.description, version: a.version, platforms: a.platforms };
    if (a.password) {
      out.push({ ...base, lock: 'own', enc: await encryptJSON({ files: a.files, notes: '' }, a.password) });
    } else {
      out.push({ ...base, lock: 'open', files: a.files });
    }
  }
  const data = {
    config: { title: $('#cfg-title').value.trim(), heroSub: $('#cfg-hero').value.trim() },
    apps: out,
  };

  const text = '// AUTO-GENERATED by admin.html. Do not edit by hand.\n' +
    'window.DINO_DATA = ' + JSON.stringify(data, null, 2) + ';\n';
  $('#out').style.display = 'block';
  $('#out-text').value = text;
  $('#btn-dl').style.display = 'inline-block';
  $('#btn-dl').onclick = () => downloadText('data.js', text);
  setStatus(`생성 완료 ✓ (${published.length}개 앱)`);
  $('#out').scrollIntoView({ behavior: 'smooth' });
}

function downloadText(name, text) {
  const blob = new Blob([text], { type: 'text/javascript' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- boot ---------- */
loadState().forEach(addAppRow);
$('#add-app').addEventListener('click', () => addAppRow({ publish: true, files: [{}] }));
$('#btn-gen').addEventListener('click', generate);
$('#btn-save').addEventListener('click', saveState);
$$('[data-eye]').forEach((b) => b.addEventListener('click', () => {
  const i = document.getElementById(b.dataset.eye); i.type = i.type === 'password' ? 'text' : 'password';
}));
