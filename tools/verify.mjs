// Round-trip check: decrypt the generated data.js using the SAME PBKDF2+AES-GCM
// the browser uses. Proves admin/CLI output is readable by the site.
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

// load data.js by evaluating the window.DINO_DATA assignment
const src = readFileSync('data.js', 'utf8');
const win = {};
new Function('window', src)(win);
const D = win.DINO_DATA;

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log('  ✓', m)) : (fail++, console.log('  ✗', m)));

const list = await decryptJSON(D.list, 'dino');
ok(Array.isArray(list) && list.length === 3, `page code unlocks list (${list.length} apps)`);

const flow = await decryptJSON(D.downloads.flowdesk, 'dino');         // lock: page
ok(flow.files.length >= 1, 'flowdesk (page-locked) decrypts with page code');

const brachy = await decryptJSON(D.downloads.brachy, 'brachy-2026');  // lock: own
ok(brachy.files.length >= 1, 'brachy (app-locked) decrypts with its own code');

let rejected = false;
try { await decryptJSON(D.list, 'wrong'); } catch { rejected = true; }
ok(rejected, 'wrong code is rejected');

let rejected2 = false;
try { await decryptJSON(D.downloads.brachy, 'dino'); } catch { rejected2 = true; }
ok(rejected2, 'app-locked app does NOT open with page code');

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'}: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
