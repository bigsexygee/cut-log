import { NextResponse } from "next/server";
import { allDays, getPlan } from "@/lib/days";
import * as store from "@/lib/store";
import { configured } from "@/lib/fitbit";

export const dynamic = "force-dynamic";

// Everything the app needs on load: all days, targets, Google Health status.
export async function GET() {
  const [days, plan, fitbit] = await Promise.all([allDays(), getPlan(), store.get("fitbit:tokens")]);
  return NextResponse.json({
    days, plan,
    fitbit: { configured: configured(), connected: !!fitbit, lastSync: (await store.get("fitbit:lastSync")) || null },
    storage: store.hasRedis ? "redis" : "file",
  });
}
