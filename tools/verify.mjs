// Round-trip check for the per-app data model: open apps carry plaintext files,
// locked apps decrypt only with their own code. Uses the same WebCrypto the site uses.
import { readFileSync } from 'node:fs';

const dec = new TextDecoder();
const unb64 = (s) => Uint8Array.from(Buffer.from(s, 'base64'));

async function decryptJSON(blob, password) {
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: unb64(blob.salt), iterations: blob.iter || 250000, hash: 'SHA-256' },
    baseKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv) }, key, unb64(blob.ct));
  return JSON.parse(dec.decode(pt));
}

const src = readFileSync('data.js', 'utf8');
const win = {};
new Function('window', src)(win);
const D = win.DINO_DATA;

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log('  ✓', m)) : (fail++, console.log('  ✗', m)));

ok(Array.isArray(D.apps) && D.apps.length === 3, `apps list is public (${D.apps.length} apps)`);

const open = D.apps.find((a) => a.id === 'flowdesk');
ok(open.lock === 'open' && Array.isArray(open.files) && open.files.length >= 1, 'open app (flowdesk) has plaintext files, no code');

const own = D.apps.find((a) => a.id === 'brachy');
ok(own.lock === 'own' && own.enc && !own.files, 'locked app (brachy) hides files behind enc');

const dt = await decryptJSON(own.enc, 'brachy-2026');
ok(dt.files.length >= 1, 'locked app decrypts with its own code');

let rejected = false;
try { await decryptJSON(own.enc, 'wrong'); } catch { rejected = true; }
ok(rejected, 'wrong app code is rejected');

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'}: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
