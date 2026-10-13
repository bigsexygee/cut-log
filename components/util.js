export const BASELINE = { date: "2026-10-07", weight: 224.9, bf: 23.5, lean: 172.0 };

export const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const today = () => iso(new Date());
export const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const nice = s => parse(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const fmt = n => Math.round(n || 0).toLocaleString();

export const SLOTS = ["Breakfast", "Lunch", "Dinner", "Snacks"];
export function slotNow() {
  const h = new Date().getHours();
  return h < 10 ? "Breakfast" : h < 15 ? "Lunch" : h < 20 ? "Dinner" : "Snacks";
}

export function stepsOf(day) {
  if (!day) return null;
  if (day.steps != null) return +day.steps;
  if (day.fitbitSteps != null) return +day.fitbitSteps;
  return null;
}

export function totals(day) {
  const m = day?.meals || [], w = day?.workouts || [];
  const sum = k => m.reduce((a, b) => a + (+b[k] || 0), 0);
  return { k: sum("k"), p: sum("p"), c: sum("c"), f: sum("f"), steps: stepsOf(day), mins: w.reduce((a, b) => a + (+b.min || 0), 0), wo: w };
}

export function weighins(days) {
  return Object.keys(days).sort().filter(d => days[d]?.weight).map(d => ({ d, w: +days[d].weight, bf: days[d].bf }));
}

export async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: opts.body && typeof opts.body !== "string" ? JSON.stringify(opts.body) : opts.body,
  });
  if (res.status === 401) { location.href = "/login"; throw new Error("Sign in first."); }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `Request failed (${res.status}).`);
  return j;
}
