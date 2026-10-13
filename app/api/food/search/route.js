import { NextResponse } from "next/server";
import { usdaSearch } from "@/lib/food";

export async function GET(req) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });
  try {
    return NextResponse.json({ results: await usdaSearch(q) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
