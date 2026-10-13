import * as store from "./store";

export const BASELINE = { date: "2026-10-07", weight: 224.9, bf: 23.5, lean: 172.0 };
export const DEFAULT_PLAN = { kcal: 2300, protein: 225, steps: 10000, workouts: 4, goal: 195.5, rate: 1.2 };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const validDate = d => DATE.test(d || "");

// The list of dates that have a record, kept sorted.
async function index() {
  let idx = await store.get("days:index");
  if (!idx) {
    // First run: seed the Oct 7 scale reading.
    idx = [BASELINE.date];
    await store.set(`day:${BASELINE.date}`, { meals: [], workouts: [], weight: BASELINE.weight, bf: BASELINE.bf });
    await store.set("days:index", idx);
  }
  return idx;
}

export async function allDays() {
  const idx = await index();
  const [docs, fit] = await Promise.all([store.mget(idx.map(d => `day:${d}`)), store.get("fitbit:steps")]);
  const out = {};
  idx.forEach((d, i) => { if (docs[i]) out[d] = docs[i]; });
  for (const [d, n] of Object.entries(fit || {})) {
    out[d] = out[d] || { meals: [], workouts: [] };
    out[d].fitbitSteps = n;
  }
  return out;
}

export async function getDay(date) {
  return (await store.get(`day:${date}`)) || { meals: [], workouts: [] };
}

export async function putDay(date, doc) {
  await store.set(`day:${date}`, doc);
  const idx = await index();
  if (!idx.includes(date)) { idx.push(date); idx.sort(); await store.set("days:index", idx); }
}

const rid = () => Math.random().toString(36).slice(2, 10);
const num = v => (v === "" || v == null || isNaN(+v) ? null : +v);

// Small edit operations so two devices editing the same day don't overwrite each other.
export async function applyOp(date, op) {
  const d = await getDay(date);
  d.meals = d.meals || []; d.workouts = d.workouts || [];
  switch (op.op) {
    case "addMeal": {
      const m = op.meal || {};
      const meal = {
        id: rid(), name: String(m.name || "Food").slice(0, 120), brand: m.brand ? String(m.brand).slice(0, 80) : undefined,
        amount: m.amount ? String(m.amount).slice(0, 60) : undefined, slot: m.slot || undefined,
        k: num(m.k) || 0, p: num(m.p) || 0, c: num(m.c) || 0, f: num(m.f) || 0,
        source: m.source || "manual", at: Date.now(),
      };
      d.meals.push(meal);
      await rememberRecent(meal, m.food);
      break;
    }
    case "removeMeal": d.meals = d.meals.filter(m => m.id !== op.id); break;
    case "addWorkout": {
      const w = op.workout || {};
      d.workouts.push({ id: rid(), type: String(w.type || "Strength").slice(0, 30), name: String(w.name || "").slice(0, 160), min: num(w.min) || 0, at: Date.now() });
      break;
    }
    case "removeWorkout": d.workouts = d.workouts.filter(w => w.id !== op.id); break;
    case "setSteps": if (num(op.steps) == null) delete d.steps; else d.steps = num(op.steps); break;
    case "setWeight":
      if (num(op.weight) == null) { delete d.weight; delete d.bf; }
      else { d.weight = num(op.weight); if (num(op.bf) == null) delete d.bf; else d.bf = num(op.bf); }
      break;
    default: throw new Error("Unknown edit");
  }
  await putDay(date, d);
  return d;
}

// Recently logged foods, for one-tap re-logging.
async function rememberRecent(meal, food) {
  const list = (await store.get("foods:recent")) || [];
  const key = (meal.name + "|" + (meal.brand || "")).toLowerCase();
  const entry = { key, name: meal.name, brand: meal.brand, amount: meal.amount, k: meal.k, p: meal.p, c: meal.c, f: meal.f, food: food || null };
  const next = [entry, ...list.filter(x => x.key !== key)].slice(0, 40);
  await store.set("foods:recent", next);
}

export async function getPlan() {
  return { ...DEFAULT_PLAN, ...((await store.get("plan")) || {}) };
}
export async function setPlan(p) {
  const clean = {};
  for (const k of Object.keys(DEFAULT_PLAN)) if (num(p[k]) != null) clean[k] = num(p[k]);
  const plan = { ...(await getPlan()), ...clean };
  await store.set("plan", plan);
  return plan;
}
