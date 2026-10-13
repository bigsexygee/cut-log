import { NextResponse } from "next/server";
import { putDay, validDate, setPlan } from "@/lib/days";

// Bring in the log from the first version of the tracker:
// { days: { "YYYY-MM-DD": {meals, workouts, steps, weight, bf} }, plan: {...} }
export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.days !== "object") return NextResponse.json({ error: "Expected { days: {...} }." }, { status: 400 });
  let n = 0;
  for (const [date, d] of Object.entries(body.days)) {
    if (!validDate(date) || !d) continue;
    const rid = () => Math.random().toString(36).slice(2, 10);
    await putDay(date, {
      meals: (d.meals || []).map(m => ({ id: rid(), source: "import", ...m })),
      workouts: (d.workouts || []).map(w => ({ id: rid(), ...w })),
      ...(d.steps != null ? { steps: +d.steps } : {}),
      ...(d.weight != null ? { weight: +d.weight } : {}),
      ...(d.bf != null ? { bf: +d.bf } : {}),
    });
    n++;
  }
  if (body.plan) await setPlan(body.plan);
  return NextResponse.json({ imported: n });
}
