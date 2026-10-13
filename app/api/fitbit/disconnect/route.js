import { NextResponse } from "next/server";
import * as store from "@/lib/store";
export async function POST() {
  await store.del("fitbit:tokens");
  return NextResponse.json({ ok: true });
}
