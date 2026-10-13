import { NextResponse } from "next/server";
import { pkce, authorizeUrl } from "@/lib/fitbit";

export async function GET(req) {
  if (!process.env.FITBIT_CLIENT_ID || !process.env.FITBIT_CLIENT_SECRET)
    return NextResponse.redirect(new URL("/?fitbit=not-configured#plan", req.url));
  const p = await pkce();
  const res = NextResponse.redirect(authorizeUrl(req, p));
  res.cookies.set("fitbit_pkce", JSON.stringify({ v: p.verifier, s: p.state }), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
