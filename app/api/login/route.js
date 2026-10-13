import { NextResponse } from "next/server";
import { COOKIE, makeToken, cookieOptions } from "@/lib/session";

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  const expected = process.env.APP_PASSWORD;
  if (!expected) return NextResponse.json({ error: "APP_PASSWORD isn't set on the server yet." }, { status: 500 });
  if (password !== expected) {
    await new Promise(r => setTimeout(r, 600));
    return NextResponse.json({ error: "That password didn't match." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await makeToken(), cookieOptions);
  return res;
}
