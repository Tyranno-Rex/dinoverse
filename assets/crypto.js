// Shared client-side crypto: PBKDF2 (SHA-256) key derivation + AES-GCM encryption.
// The same routines are mirrored in tools/generate.mjs so CLI and browser produce
// interchangeable blobs. No external dependencies — Web Crypto only.

const PBKDF2_ITER = 250000;
const _enc = new TextEncoder();
const _dec = new TextDecoder();

function _b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function _unb64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

async function _deriveKey(password, salt, iterations) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    _enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypts a JSON-serializable value with a password. Returns a self-describing blob.
async function encryptJSON(obj, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await _deriveKey(password, salt, PBKDF2_ITER);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    _enc.encode(JSON.stringify(obj))
  );
  return { v: 1, iter: PBKDF2_ITER, salt: _b64(salt), iv: _b64(iv), ct: _b64(ct) };
}

// Decrypts a blob. Throws if the password is wrong (AES-GCM auth tag fails).
async function decryptJSON(blob, password) {
  const salt = _unb64(blob.salt);
  const iv = _unb64(blob.iv);
  const key = await _deriveKey(password, salt, blob.iter || PBKDF2_ITER);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    _unb64(blob.ct)
  );
  return JSON.parse(_dec.decode(pt));
}
