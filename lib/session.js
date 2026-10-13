// Single-user sign-in: a password (APP_PASSWORD) unlocks a signed cookie.
// Uses Web Crypto so it works in middleware (edge) and in API routes.
const enc = new TextEncoder();
export const COOKIE = "cutlog_session";
const MAX_AGE = 60 * 60 * 24 * 180; // 180 days

function secret() {
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || "dev-secret";
}
async function hmac(msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export async function makeToken() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  return `${exp}.${await hmac(String(exp))}`;
}
export async function verifyToken(t) {
  if (!t) return false;
  const [exp, sig] = t.split(".");
  if (!exp || !sig || +exp < Date.now() / 1000) return false;
  const good = await hmac(exp);
  if (good.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < good.length; i++) diff |= good.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE };
