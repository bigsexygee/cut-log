import { NextResponse } from "next/server";
import { exchangeCode, syncSteps, redirectUri } from "@/lib/fitbit";

export async function GET(req) {
  const q = req.nextUrl.searchParams;
  let saved = {};
  try { saved = JSON.parse(req.cookies.get("fitbit_pkce")?.value || "{}"); } catch {}
  const back = status => {
    const res = NextResponse.redirect(new URL(`/?fitbit=${status}#plan`, req.url));
    res.cookies.delete("fitbit_pkce");
    return res;
  };
  if (q.get("error") || !q.get("code")) return back("cancelled");
  if (!saved.s || saved.s !== q.get("state")) return back("expired");
  try {
    await exchangeCode(req, q.get("code"), saved.v);
    await syncSteps(30);
    return back("connected");
  } catch (e) {
    console.error("Google Health connect failed", { redirectUri: redirectUri(req), error: e.message });
    return back("failed");
  }
}
