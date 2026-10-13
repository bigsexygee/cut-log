import { NextResponse } from "next/server";
import { applyOp, validDate } from "@/lib/days";

export async function POST(req, { params }) {
  const { date } = await params;
  if (!validDate(date)) return NextResponse.json({ error: "Bad date." }, { status: 400 });
  try {
    const day = await applyOp(date, await req.json());
    return NextResponse.json({ date, day });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Couldn't save." }, { status: 400 });
  }
}
