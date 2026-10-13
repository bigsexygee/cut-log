"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { api, fmt, SLOTS } from "./util";

const Scanner = dynamic(() => import("./Scanner"), { ssr: false });
const r1 = v => Math.round(v * 10) / 10;

function per(food) {
  // Macros per 1 gram/ml, from per-100 values or from a serving with a known size.
  if (food.per100) return { k: food.per100.k / 100, p: food.per100.p / 100, c: food.per100.c / 100, f: food.per100.f / 100 };
  if (food.serving?.qty) { const s = food.serving; return { k: s.k / s.qty, p: s.p / s.qty, c: s.c / s.qty, f: s.f / s.qty }; }
  return null;
}

function Amount({ food, slot, setSlot, onAdd, onBack, busy }) {
  const perUnit = per(food);
  const unit = food.unit100 || "g";
  const [mode, setMode] = useState(food.serving ? "serving" : "g");
  const [amt, setAmt] = useState(food.serving ? "1" : "100");
  const n = Math.max(0, parseFloat(amt) || 0);
  const m = mode === "serving"
    ? { k: food.serving.k * n, p: food.serving.p * n, c: food.serving.c * n, f: food.serving.f * n }
    : { k: perUnit.k * n, p: perUnit.p * n, c: perUnit.c * n, f: perUnit.f * n };
  const label = mode === "serving" ? `${n} × ${food.serving.label}` : `${n} ${unit}`;
  return (
    <div className="stack">
      <button type="button" className="btn ghost sm" onClick={onBack}>← Back</button>
      <div>
        <div className="tag">{food.source === "off" ? "Open Food Facts" : food.source === "usda" ? `USDA ${food.kind || ""}` : "Recent"}</div>
        <h3 style={{ textTransform: "none", fontSize: "1.3rem" }}>{food.name}</h3>
        {food.brand && <div className="muted small">{food.brand}</div>}
      </div>
      <div className="row">
        <label>Amount<input id="amt" type="number" inputMode="decimal" step="any" min="0" value={amt} onChange={e => setAmt(e.target.value)} autoFocus /></label>
        <label>Unit
          <select id="amtUnit" value={mode} onChange={e => { const v = e.target.value; setMode(v); setAmt(v === "serving" ? "1" : String(food.serving?.qty || 100)); }}>
            {food.serving && <option value="serving">serving ({food.serving.label})</option>}
            {perUnit && <option value="g">{unit === "ml" ? "milliliters" : "grams"}</option>}
          </select>
        </label>
        <label>Meal<select id="slot" value={slot} onChange={e => setSlot(e.target.value)}>{SLOTS.map(s => <option key={s}>{s}</option>)}</select></label>
      </div>
      <div className="macro-row">
        <div><b>{fmt(m.k)}</b><span className="lbl">kcal</span></div>
        <div><b>{r1(m.p)}</b><span className="lbl">protein</span></div>
        <div><b>{r1(m.c)}</b><span className="lbl">carbs</span></div>
        <div><b>{r1(m.f)}</b><span className="lbl">fat</span></div>
      </div>
      <button className="btn" disabled={busy || n <= 0} onClick={() => onAdd({
        name: food.name, brand: food.brand, amount: label, slot,
        k: Math.round(m.k), p: r1(m.p), c: r1(m.c), f: r1(m.f), source: food.source, food,
      })}>{busy ? "Adding…" : `Add to ${slot.toLowerCase()}`}</button>
    </div>
  );
}

export default function FoodPicker({ date, initialSlot, onClose, onAdd }) {
  const [mode, setMode] = useState("search");
  const [slot, setSlot] = useState(initialSlot);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [recent, setRecent] = useState(null);
  const [picked, setPicked] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const timer = useRef();

  useEffect(() => { api("/api/foods").then(j => setRecent(j.recent)).catch(() => setRecent([])); }, []);
  useEffect(() => {
    const k = e => e.key === "Escape" && onClose();
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [onClose]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (mode !== "search" || q.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setMsg("Searching…");
      try { const j = await api(`/api/food/search?q=${encodeURIComponent(q.trim())}`); setResults(j.results); setMsg(j.results.length ? "" : "No matches. Try fewer words."); }
      catch (e) { setMsg(e.message); }
    }, 350);
  }, [q, mode]);

  const lookup = useCallback(async (c) => {
    setMsg(`Looking up ${c}…`); setCode(c);
    try { const j = await api(`/api/food/barcode/${c}`); setMsg(""); setPicked(j.food); }
    catch (e) { setMsg(e.message); setMode("manual"); }
  }, []);

  async function add(meal) {
    setBusy(true);
    try { await onAdd(date, meal); onClose(); } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  const [man, setMan] = useState({ name: "", k: "", p: "", c: "", f: "" });
  const body = picked ? <Amount food={picked} slot={slot} setSlot={setSlot} onAdd={add} onBack={() => setPicked(null)} busy={busy} /> : (
    <>
      {mode === "search" && <>
        <input id="foodSearch" type="search" placeholder="Search foods: chicken breast, Chobani, oats…" value={q} onChange={e => setQ(e.target.value)} autoFocus />
        <ul className="results">
          {results.map(f => (
            <li key={f.id}><button type="button" onClick={() => setPicked(f)}>
              <span style={{ minWidth: 0 }}><span className="nm">{f.name}</span><br /><span className="meta">{[f.brand, f.serving?.label].filter(Boolean).join(" · ") || "per 100 g"}</span></span>
              <span className="meta mono">{f.serving ? `${fmt(f.serving.k)} kcal · ${Math.round(f.serving.p)}p` : `${fmt(f.per100.k)} kcal/100g · ${Math.round(f.per100.p)}p`}</span>
            </button></li>
          ))}
        </ul>
        <p className="note small">Food data from the USDA FoodData Central database.</p>
      </>}
      {mode === "scan" && <>
        <Scanner onCode={lookup} />
        <form onSubmit={e => { e.preventDefault(); const c = code.replace(/\D/g, ""); if (c) lookup(c); }}>
          <div className="row" style={{ alignItems: "flex-end" }}>
            <label>Barcode number<input id="barcode" inputMode="numeric" value={code} onChange={e => setCode(e.target.value)} placeholder="012345678905" /></label>
            <button className="btn ghost">Look up</button>
          </div>
        </form>
      </>}
      {mode === "recent" && (recent == null ? <p className="empty">Loading…</p> : recent.length === 0 ? <p className="empty">Foods you log will show up here for one-tap re-logging.</p> :
        <ul className="results">{recent.map(r => (
          <li key={r.key}><button type="button" onClick={() => r.food ? setPicked(r.food) : add({ name: r.name, brand: r.brand, amount: r.amount, slot, k: r.k, p: r.p, c: r.c, f: r.f, source: "recent" })}>
            <span style={{ minWidth: 0 }}><span className="nm">{r.name}</span><br /><span className="meta">{[r.brand, r.amount].filter(Boolean).join(" · ")}</span></span>
            <span className="meta mono">{fmt(r.k)} kcal · {Math.round(r.p)}p</span>
          </button></li>
        ))}</ul>)}
      {mode === "manual" && (
        <form onSubmit={e => { e.preventDefault(); add({ ...man, slot, source: "manual", amount: undefined }); }}>
          <label>Food<input id="manName" required value={man.name} onChange={e => setMan({ ...man, name: e.target.value })} placeholder="Homemade chili, 1.5 cups" /></label>
          <div className="row">
            {[["k", "Calories"], ["p", "Protein g"], ["c", "Carbs g"], ["f", "Fat g"]].map(([k, l]) => (
              <label key={k}>{l}<input id={`man-${k}`} type="number" inputMode="decimal" step="any" min="0" required={k === "k"} value={man[k]} onChange={e => setMan({ ...man, [k]: e.target.value })} /></label>
            ))}
          </div>
          <label>Meal<select id="manSlot" value={slot} onChange={e => setSlot(e.target.value)}>{SLOTS.map(s => <option key={s}>{s}</option>)}</select></label>
          <button className="btn" disabled={busy}>{busy ? "Adding…" : "Add food"}</button>
        </form>
      )}
    </>
  );

  return (
    <div className="scrim" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Add food">
        <div className="sheet-head"><h2>Add food · {slot}</h2><button className="x" aria-label="Close" onClick={onClose}>×</button></div>
        {!picked && <div className="seg">
          {[["search", "Search"], ["scan", "Scan barcode"], ["recent", "Recent"], ["manual", "Quick add"]].map(([k, l]) =>
            <button key={k} type="button" aria-pressed={mode === k} onClick={() => { setMode(k); setMsg(""); }}>{l}</button>)}
        </div>}
        <div className="sheet-body">
          {msg && <p className={/fail|not found|busy|couldn|blocked|doesn't/i.test(msg) ? "err" : "note small"}>{msg}</p>}
          {body}
        </div>
      </div>
    </div>
  );
}
