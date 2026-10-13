// Steps from the Google Health API (replaced the Fitbit Web API in 2026).
// Same Fitbit/Google account data; OAuth runs through Google.
import * as store from "./store";

const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const ROLLUP = type => `https://health.googleapis.com/v4/users/me/dataTypes/${type}/dataPoints:dailyRollUp`;
// Steps, plus weight and body fat (a smart scale that syncs to Fitbit/Google Health shows up here).
export const SCOPES = [
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
].join(" ");

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

async function rollup(token, type, range) {
  const res = await fetch(ROLLUP(type), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ range, windowSizeDays: 1 }),
    cache: "no-store",
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    const e = new Error(`Google Health returned ${res.status} for ${type}${j.error?.message ? ": " + j.error.message : ""}`);
    e.status = res.status;
    throw e;
  }
  const out = {};
  for (const pt of (await res.json()).rollupDataPoints || []) {
    const d = pt.civilStartTime?.date;
    if (d) out[`${d.year}-${pad(d.month)}-${pad(d.day)}`] = pt;
  }
  return out;
}

// Pull the last `days` days of steps, weight and body fat.
// `today` is the phone's local date (YYYY-MM-DD) when the app asks; the daily cron uses UTC.
export async function syncSteps(days = 30, today) {
  const token = await accessToken();
  if (!token) return { connected: false };
  const end = new Date(`${/^\d{4}-\d{2}-\d{2}$/.test(today || "") ? today : iso(new Date())}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);               // exclusive end: tomorrow
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - days);
  const range = { start: civil(iso(start)), end: civil(iso(end)) };

  const [st, wt, bf] = await Promise.allSettled([rollup(token, "steps", range), rollup(token, "weight", range), rollup(token, "body-fat", range)]);
  if ([st, wt, bf].some(r => r.status === "rejected" && r.reason.status === 401)) {
    await store.del("fitbit:tokens");
    return { connected: false, error: "Google Health access ended. Connect again." };
  }
  const errors = [];
  if (st.status === "fulfilled") {
    const steps = (await store.get("fitbit:steps")) || {};
    for (const [date, pt] of Object.entries(st.value)) if (pt.steps?.countSum != null) steps[date] = Number(pt.steps.countSum);
    await store.set("fitbit:steps", steps);
  } else errors.push(st.reason.message);

  // Weight arrives in grams; the app works in pounds.
  if (wt.status === "fulfilled" || bf.status === "fulfilled") {
    const body = (await store.get("health:body")) || {};
    if (wt.status === "fulfilled") for (const [date, pt] of Object.entries(wt.value)) {
      const g = Number(pt.weight?.weightGramsAvg);
      if (g > 0) body[date] = { ...body[date], weight: Math.round(g / 453.59237 * 10) / 10 };
    }
    if (bf.status === "fulfilled") for (const [date, pt] of Object.entries(bf.value)) {
      const p = Number(pt.bodyFat?.bodyFatPercentageAvg);
      if (p > 0) body[date] = { ...body[date], bf: Math.round(p * 10) / 10 };
    }
    await store.set("health:body", body);
  }
  if (wt.status === "rejected" && wt.reason.status !== 403) errors.push(wt.reason.message);
  const needsReconnect = wt.status === "rejected" && wt.reason.status === 403;

  const lastSync = new Date().toISOString();
  await store.set("fitbit:lastSync", lastSync);
  return {
    connected: true, lastSync,
    error: needsReconnect ? "Reconnect Google Health to allow weight and body fat." : errors[0],
  };
}
