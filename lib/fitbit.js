// Steps from the Google Health API (replaced the Fitbit Web API in 2026).
// Same Fitbit/Google account data; OAuth runs through Google.
import * as store from "./store";

const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const STEPS = "https://health.googleapis.com/v4/users/me/dataTypes/steps/dataPoints:dailyRollUp";
export const SCOPES = "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly";

export const clientId = () => process.env.GOOGLE_CLIENT_ID || process.env.FITBIT_CLIENT_ID;
const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET || process.env.FITBIT_CLIENT_SECRET;
export const configured = () => !!(clientId() && clientSecret());

export function redirectUri(req) {
  return process.env.GOOGLE_REDIRECT_URI || `${req.nextUrl.origin}/api/fitbit/callback`;
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
    response_type: "code", client_id: clientId(), scope: SCOPES, redirect_uri: redirectUri(req),
    access_type: "offline", prompt: "consent", include_granted_scopes: "true",
    code_challenge: challenge, code_challenge_method: "S256", state,
  });
  return `${AUTH}?${q}`;
}

async function tokenRequest(params) {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), ...params }),
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(j.error_description || j.error || `Google sign-in failed (${res.status}).`);
    e.code = j.error;
    throw e;
  }
  const prev = (await store.get("fitbit:tokens")) || {};
  // Google only sends a refresh token on first consent; keep the old one otherwise.
  const tokens = { access: j.access_token, refresh: j.refresh_token || prev.refresh, expiresAt: Date.now() + ((j.expires_in || 3600) - 60) * 1000 };
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
  if (!t.refresh) return null;
  try {
    return (await tokenRequest({ grant_type: "refresh_token", refresh_token: t.refresh })).access;
  } catch (e) {
    if (e.code === "invalid_grant") { await store.del("fitbit:tokens"); return null; }
    throw e;
  }
}

const iso = d => d.toISOString().slice(0, 10);
const civil = s => { const [year, month, day] = s.split("-").map(Number); return { date: { year, month, day } }; };
const pad = n => String(n).padStart(2, "0");

// Pull daily step totals for the last `days` days into fitbit:steps.
// `today` is the phone's local date (YYYY-MM-DD) when the app asks; the daily cron uses UTC.
export async function syncSteps(days = 30, today) {
  const token = await accessToken();
  if (!token) return { connected: false };
  const end = new Date(`${/^\d{4}-\d{2}-\d{2}$/.test(today || "") ? today : iso(new Date())}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);               // exclusive end: tomorrow
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - days);
  const res = await fetch(STEPS, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ range: { start: civil(iso(start)), end: civil(iso(end)) }, windowSizeDays: 1 }),
    cache: "no-store",
  });
  if (res.status === 401) { await store.del("fitbit:tokens"); return { connected: false, error: "Google Health access ended. Connect again." }; }
  if (res.status === 429) return { connected: true, error: "Google Health's rate limit was hit. Try again later." };
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    return { connected: true, error: `Google Health returned ${res.status}${j.error?.message ? ": " + j.error.message : ""}` };
  }
  const j = await res.json();
  const steps = (await store.get("fitbit:steps")) || {};
  let n = 0;
  for (const pt of j.rollupDataPoints || []) {
    const d = pt.civilStartTime?.date;
    const v = pt.steps?.countSum;
    if (!d || v == null) continue;
    steps[`${d.year}-${pad(d.month)}-${pad(d.day)}`] = Number(v);
    n++;
  }
  await store.set("fitbit:steps", steps);
  const lastSync = new Date().toISOString();
  await store.set("fitbit:lastSync", lastSync);
  return { connected: true, lastSync, days: n };
}
