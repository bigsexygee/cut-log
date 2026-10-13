import { NextResponse } from "next/server";
import { COOKIE, verifyToken } from "./lib/session";

const OPEN = ["/login", "/api/login", "/manifest.webmanifest", "/sw.js", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/favicon.ico"];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (OPEN.includes(pathname) || pathname.startsWith("/_next")) return NextResponse.next();
  // Vercel Cron calls the sync route with the CRON_SECRET bearer token.
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}` && pathname === "/api/fitbit/sync") return NextResponse.next();
  if (await verifyToken(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const url = req.nextUrl.clone(); url.pathname = "/login"; url.search = "";
  return NextResponse.redirect(url);
}
export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
