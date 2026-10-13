"use client";
import { useState } from "react";

export default function Login() {
  const [pw, setPw] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr("");
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (res.ok) location.href = "/";
    else { setErr((await res.json().catch(() => ({}))).error || "Sign-in failed."); setBusy(false); }
  }
  return (
    <div className="login panel">
      <form onSubmit={submit}>
        <div className="lbl">Cut Log</div>
        <h1>Sign in</h1>
        <label>Password<input id="pw" type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} autoFocus /></label>
        {err && <p className="err">{err}</p>}
        <button className="btn" disabled={busy || !pw}>Sign in</button>
        <p className="note small">You stay signed in on this device for 6 months. <a href="/about">About</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p>
      </form>
    </div>
  );
}
