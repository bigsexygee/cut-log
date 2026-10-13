import { NextResponse } from "next/server";
import { pkce, authorizeUrl, configured } from "@/lib/fitbit";

export async function GET(req) {
  if (!configured())
    return NextResponse.redirect(new URL("/?fitbit=not-configured#plan", req.url));
  const p = await pkce();
  const res = NextResponse.redirect(authorizeUrl(req, p));
  res.cookies.set("fitbit_pkce", JSON.stringify({ v: p.verifier, s: p.state }), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
