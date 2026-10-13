import { NextResponse } from "next/server";
import { syncSteps } from "@/lib/fitbit";
export const dynamic = "force-dynamic";
async function run() {
  try { return NextResponse.json(await syncSteps(30)); }
  catch (e) { return NextResponse.json({ connected: true, error: e.message }, { status: 502 }); }
}
export const GET = run;   // Vercel Cron
export const POST = run;  // the app
