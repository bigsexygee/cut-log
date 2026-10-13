// Fitbit Web API (the same account your Fitbit app and Google Health use).
import * as store from "./store";

const AUTH = "https://www.fitbit.com/oauth2/authorize";
const TOKEN = "https://api.fitbit.com/oauth2/token";
const API = "https://api.fitbit.com";
export const SCOPES = "activity profile";

export function redirectUri(req) {
  return process.env.FITBIT_REDIRECT_URI || `${req.nextUrl.origin}/api/fitbit/callback`;
}
function basic() {
  return "Basic " + Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString("base64");
}
const b64url = buf => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function pkce() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  return { verifier, challenge, state };
}

export function authorizeUrl(req, { challenge, state }) {
  const q = new URLSearchParams({
    response_type: "code", client_id: process.env.FITBIT_CLIENT_ID, scope: SCOPES,
    code_challenge: challenge, code_challenge_method: "S256", state, redirect_uri: redirectUri(req),
  });
  return `${AUTH}?${q}`;
}

async function tokenRequest(params) {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { Authorization: basic(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.FITBIT_CLIENT_ID, ...params }),
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.errors?.[0]?.message || `Fitbit sign-in failed (${res.status}).`);
  const tokens = { access: j.access_token, refresh: j.refresh_token, expiresAt: Date.now() + (j.expires_in - 60) * 1000, user: j.user_id };
  await store.set("fitbit:tokens", tokens);
  return tokens;
}

export function exchangeCode(req, code, verifier) {
  return tokenRequest({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: redirectUri(req) });
}

async function accessToken() {
  const t = await store.get("fitbit:tokens");
  if (!t) return null;
  if (Date.now() < t.expiresAt) return t.access;
  // Refresh tokens are single use, so the new pair is saved straight away.
  return (await tokenRequest({ grant_type: "refresh_token", refresh_token: t.refresh })).access;
}

// Pull daily step totals for the last `days` days into fitbit:steps.
export async function syncSteps(days = 30) {
  const token = await accessToken();
  if (!token) return { connected: false };
  const res = await fetch(`${API}/1/user/-/activities/steps/date/today/${days}d.json`, {
    headers: { Authorization: `Bearer ${token}`, "Accept-Language": "en_US" }, cache: "no-store",
  });
  if (res.status === 401) { await store.del("fitbit:tokens"); return { connected: false, error: "Fitbit access was revoked. Connect again." }; }
  if (res.status === 429) return { connected: true, error: "Fitbit's hourly limit was hit. Try again later." };
  if (!res.ok) return { connected: true, error: `Fitbit returned ${res.status}.` };
  const j = await res.json();
  const steps = (await store.get("fitbit:steps")) || {};
  for (const row of j["activities-steps"] || []) steps[row.dateTime] = +row.value;
  await store.set("fitbit:steps", steps);
  const lastSync = new Date().toISOString();
  await store.set("fitbit:lastSync", lastSync);
  return { connected: true, lastSync, days: (j["activities-steps"] || []).length };
}
