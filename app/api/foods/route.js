import { NextResponse } from "next/server";
import * as store from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ recent: (await store.get("foods:recent")) || [] });
}
