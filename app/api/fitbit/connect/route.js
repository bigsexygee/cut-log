import { NextResponse } from "next/server";
import { pkce, authorizeUrl, configured, appOrigin } from "@/lib/fitbit";

export async function GET(req) {
  if (!configured())
    return NextResponse.redirect(new URL("/?fitbit=not-configured#plan", req.url));
  // Start on the production address so the sign-in cookie and Google's callback share one host.
  const origin = appOrigin(req);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host && new URL(origin).host !== host) return NextResponse.redirect(`${origin}/api/fitbit/connect`);
  const p = await pkce();
  const res = NextResponse.redirect(authorizeUrl(req, p));
  res.cookies.set("fitbit_pkce", JSON.stringify({ v: p.verifier, s: p.state }), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
