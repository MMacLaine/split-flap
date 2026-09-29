// Connections' values, sealed before they reach D1 (0.9.2). AES-GCM with CONN_KEY, a
// Worker secret of 32 random bytes in base64. Each value gets its own random 96-bit IV,
// kept in front of the ciphertext, and the account and connection ids are bound in as
// additional data, so a sealed value copied to another row or another account will not
// open. "v1:" names the key's version, so CONN_KEY can be rotated later.
//
// It protects against a leak of the database (an export, a backup, a Time Travel
// restore, someone reading it in the dashboard). It does not protect against a Worker
// that has been taken over, which holds the key; nothing kept on a server could.
// Values are never logged, never in the failure line, never in an error.

const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = u8 => btoa(String.fromCharCode(...u8));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

let cached = null, cachedFor = null;
// The key, imported once per Worker instance, or null if CONN_KEY is missing or not 32 bytes.
export async function sealKey(env) {
  const raw = env && env.CONN_KEY;
  if (!raw) return null;
  if (cachedFor === raw) return cached;
  let bytes;
  try { bytes = unb64(raw.trim()); } catch { return null; }
  if (bytes.length !== 32) return null;
  cached = await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
  cachedFor = raw;
  return cached;
}
const aad = (user, id) => enc.encode(`${user}\u0000${id}`);

export async function seal(key, user, id, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(user, id) }, key, enc.encode(String(value))));
  const out = new Uint8Array(iv.length + ct.length); out.set(iv); out.set(ct, iv.length);
  return 'v1:' + b64(out);
}
// The value, or null if it does not open (another row, another account, another key).
export async function unseal(key, user, id, sealed) {
  if (typeof sealed !== 'string' || !sealed.startsWith('v1:')) return null;
  try {
    const all = unb64(sealed.slice(3)), iv = all.slice(0, 12), ct = all.slice(12);
    return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad(user, id) }, key, ct));
  } catch { return null; }
}
