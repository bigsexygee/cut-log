import { NextResponse } from "next/server";
import { setPlan } from "@/lib/days";
export async function PUT(req) {
  return NextResponse.json({ plan: await setPlan(await req.json()) });
}
