"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BASELINE, SLOTS, addDays, api, fmt, nice, parse, slotNow, stepsOf, today, totals, weighins } from "./util";
import { WeekChart, WeightChart } from "./Charts";
import FoodPicker from "./FoodPicker";
import { ActBtn, ActErr, useAction } from "./Action";

const TABS = [["dash", "Dashboard"], ["log", "Log"], ["hist", "History"], ["plan", "Plan"]];

export default function CutLog() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("dash");
  const [toast, setToast] = useState("");
  const tt = useRef();
  const flash = useCallback(m => { setToast(m); clearTimeout(tt.current); tt.current = setTimeout(() => setToast(""), 2400); }, []);

  const load = useCallback(async () => {
    try { const d = await api("/api/days"); setData(d); setErr(""); return d; } catch (e) { setErr(e.message); return null; }
  }, []);

  // Restore tab from the address (#log) and keep devices in sync by refreshing on focus.
  useEffect(() => {
    const h = location.hash.slice(1); if (TABS.some(t => t[0] === h)) setTab(h);
    const q = new URLSearchParams(location.search).get("fitbit");
    if (q) {
      flash({ connected: "Google Health connected. Steps are syncing.", cancelled: "Google Health connection cancelled.", expired: "That took too long. Try connecting again.", failed: "Google Health connection failed. Check the client ID, secret and redirect URI.", "not-configured": "Add your Google client ID and secret to Vercel first (see Plan)." }[q] || "");
      history.replaceState(null, "", location.pathname + location.hash);
    }
    load();
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    const iv = setInterval(() => document.visibilityState === "visible" && load(), 60000);
    return () => { document.removeEventListener("visibilitychange", onVis); clearInterval(iv); };
  }, [load, flash]);

  // Pull fresh Google Health data when the app opens, at most every 15 minutes.
  // A tap on "Sync now" (force) joins any sync already running and throws on failure,
  // so the button can show the real result.
  const syncing = useRef(null);
  const syncFitbit = useCallback(async (force) => {
    if (!data?.fitbit?.connected) { if (force) throw new Error("Google Health isn't connected."); return null; }
    if (syncing.current) return force ? syncing.current : null;
    if (!force && data.fitbit.lastSync && Date.now() - new Date(data.fitbit.lastSync) < 15 * 60e3) return null;
    const p = (async () => {
      const r = await api(`/api/fitbit/sync?today=${today()}`, { method: "POST" });
      await load();
      if (r.error || !r.connected) throw new Error(r.error || "Google Health is no longer connected. Connect it again.");
      return r;
    })();
    syncing.current = p;
    try { return await p; }
    catch (e) { if (force) throw e; flash(e.message); return null; }
    finally { syncing.current = null; }
  }, [data, load, flash]);
  useEffect(() => { syncFitbit(false); }, [data?.fitbit?.connected]); // eslint-disable-line

  const go = k => { setTab(k); history.replaceState(null, "", "#" + k); };

  const edit = useCallback(async (date, op) => {
    const r = await api(`/api/days/${date}`, { method: "POST", body: op });
    setData(d => {
      const prev = d.days[date] || {}, day = { ...r.day, fitbitSteps: prev.fitbitSteps, synced: prev.synced };
      if (day.weight == null && prev.synced?.weight) { day.weight = prev.synced.weight; day.weightSource = "scale"; if (prev.synced.bf) day.bf = prev.synced.bf; }
      return { ...d, days: { ...d.days, [date]: day } };
    });
    return r.day;
  }, []);

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <div className="lbl">The cut · 224.9 → {data ? data.plan.goal : 195.5} lb · 12% body fat</div>
          <h1>Cut Log</h1>
          <div className="muted small">{parse(today()).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => go(k)}>{l}</button>)}
        </nav>
      </header>
      {err && <div className="panel err">{err} <button className="btn ghost sm" onClick={load}>Retry</button></div>}
      {!data ? <div className="panel muted">Loading your log…</div> : <>
        {tab === "dash" && <Dashboard data={data} />}
        {tab === "log" && <Log data={data} edit={edit} flash={flash} />}
        {tab === "hist" && <History days={data.days} />}
        {tab === "plan" && <Plan data={data} setData={setData} flash={flash} syncFitbit={syncFitbit} load={load} />}
      </>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function Bar({ v, t, cls = "" }) {
  return <div className={`bar ${cls}`}><i style={{ width: `${Math.min(100, t ? v / t * 100 : 0)}%` }} /></div>;
}

function Dashboard({ data }) {
  const { days, plan } = data;
  const t = today();
  const wi = weighins(days);
  const last = wi[wi.length - 1];
  const start = Math.max(wi[0]?.w || BASELINE.weight, BASELINE.weight);
  const cur = last ? last.w : BASELINE.weight;
  const toGo = Math.max(0, cur - plan.goal);
  const lastBf = [...wi].reverse().find(x => x.bf);
  const eta = new Date(); eta.setDate(eta.getDate() + Math.round(toGo / plan.rate * 7));
  const last7 = [...Array(7)].map((_, i) => addDays(t, i - 6));
  const kd = last7.map(d => totals(days[d])).filter(x => x.k > 0);
  const sd = last7.map(d => stepsOf(days[d])).filter(v => v != null);
  const mon = addDays(t, -((parse(t).getDay() + 6) % 7));
  let wk = 0; for (let i = 0; i < 7; i++) wk += (days[addDays(mon, i)]?.workouts || []).filter(w => w.type !== "Walk").length;
  const T = totals(days[t]);
  const left = plan.kcal - T.k;
  return (
    <section className="stack" style={{ gap: 20 }}>
      <div className="panel board">
        <div className="stack" style={{ gap: 10 }}>
          <div className="lbl">Current weight</div>
          <div className="big">{cur.toFixed(1)}<small>lb</small></div>
          <Bar v={start - cur} t={start - plan.goal} />
          <div className="muted small">{last ? `${toGo.toFixed(1)} lb to go to ${plan.goal} lb · last weigh-in ${nice(last.d)}` : "Log a weigh-in to start the trend."}</div>
        </div>
        <div className="stats">
          <div className="stat"><div className="lbl">Lost so far</div><div className="v">{(start - cur).toFixed(1)} lb</div></div>
          <div className="stat"><div className="lbl">Body fat</div><div className="v">{lastBf ? (+lastBf.bf).toFixed(1) + "%" : "—"}</div></div>
          <div className="stat"><div className="lbl">On pace for</div><div className="v">{toGo <= 0 ? "Goal hit" : eta.toLocaleDateString(undefined, { month: "short", year: "numeric" })}</div></div>
          <div className="stat"><div className="lbl">7-day avg kcal</div><div className="v">{kd.length ? fmt(kd.reduce((a, b) => a + b.k, 0) / kd.length) : "—"}</div></div>
          <div className="stat"><div className="lbl">7-day avg steps</div><div className="v">{sd.length ? fmt(sd.reduce((a, b) => a + b, 0) / sd.length) : "—"}</div></div>
          <div className="stat"><div className="lbl">Workouts this week</div><div className="v">{wk} / {plan.workouts}</div></div>
        </div>
      </div>
      <div className="grid g4">
        <div className="panel tile"><div className="lbl">Calories today</div><div className="v">{fmt(T.k)} <span>/ {fmt(plan.kcal)}</span></div><Bar v={T.k} t={plan.kcal} /><span className={`chip ${left >= 0 ? "ok" : "over"}`}>{left >= 0 ? `${fmt(left)} left` : `${fmt(-left)} over`}</span></div>
        <div className="panel tile"><div className="lbl">Protein today</div><div className="v">{fmt(T.p)} <span>/ {plan.protein} g</span></div><Bar v={T.p} t={plan.protein} cls="p" /><span className={`chip ${T.p >= plan.protein ? "ok" : ""}`}>{T.p >= plan.protein ? "Protein hit" : `${fmt(plan.protein - T.p)} g to go`}</span></div>
        <div className="panel tile"><div className="lbl">Steps today{days[t]?.steps == null && days[t]?.fitbitSteps != null ? " · Google Health" : ""}</div><div className="v">{fmt(T.steps || 0)} <span>/ {fmt(plan.steps)}</span></div><Bar v={T.steps || 0} t={plan.steps} cls="s" /><span className={`chip ${T.steps >= plan.steps ? "ok" : ""}`}>{T.steps == null ? "Not synced yet" : T.steps >= plan.steps ? "Goal hit" : `${fmt(plan.steps - T.steps)} to go`}</span></div>
        <div className="panel tile"><div className="lbl">Training today</div><div className="v">{T.mins} <span>min</span></div><div className="muted small">{T.wo.length ? T.wo.map(w => w.type).join(" + ") : "Rest day so far"}</div></div>
      </div>
      <div className="grid g2">
        <div className="panel stack" style={{ gap: 10 }}>
          <div className="btns" style={{ justifyContent: "space-between" }}><h2>Weight vs. plan</h2><span className="lbl">dashed = {plan.rate} lb/week pace</span></div>
          <WeightChart wi={wi} plan={plan} />
        </div>
        <div className="panel stack" style={{ gap: 10 }}>
          <div className="btns" style={{ justifyContent: "space-between" }}><h2>Last 7 days</h2><span className="lbl">bars = steps · dots = kcal</span></div>
          <WeekChart days={days} last7={last7} plan={plan} />
        </div>
      </div>
    </section>
  );
}

function Log({ data, edit, flash }) {
  const [date, setDate] = useState(today());
  const [picker, setPicker] = useState(null);
  const day = data.days[date] || { meals: [], workouts: [] };
  const T = totals(day);
  // Small inline actions (remove, clear) show "…" on the tapped control, then a toast.
  const [pending, setPending] = useState(null);
  const run = async (op, msg, key) => {
    if (pending) return;
    setPending(key || op.op);
    try { await edit(date, op); flash(msg); } catch (e) { flash(e.message); } finally { setPending(null); }
  };
  const woA = useAction(), stA = useAction(), wiA = useAction();
  const [wo, setWo] = useState({ type: "Strength", min: "", name: "" });
  const [st, setSt] = useState("");
  const [wi, setWi] = useState({ w: "", bf: "" });
  const bySlot = SLOTS.map(s => [s, (day.meals || []).filter(m => (m.slot || "Snacks") === s)]);

  return (
    <section className="stack" style={{ gap: 20 }}>
      <div className="panel datebar">
        <span className="lbl">Logging for</span>
        <input id="logDate" type="date" value={date} onChange={e => setDate(e.target.value || today())} />
        <button className="btn ghost sm" onClick={() => setDate(today())}>Today</button>
        <span className="muted small">{fmt(T.k)} kcal · {fmt(T.p)} g protein · {fmt(T.c)} g carbs · {fmt(T.f)} g fat</span>
      </div>

      <div className="panel">
        <div className="btns" style={{ justifyContent: "space-between" }}>
          <h2>Food</h2>
          <button className="btn" onClick={() => setPicker(slotNow())}>Add food</button>
        </div>
        {bySlot.map(([slot, meals]) => (
          <div key={slot}>
            <div className="slot-head">
              <h3>{slot} <span className="muted mono small" style={{ textTransform: "none" }}>{meals.length ? `${fmt(meals.reduce((a, b) => a + b.k, 0))} kcal` : ""}</span></h3>
              <button className="btn ghost sm" onClick={() => setPicker(slot)}>+ Add</button>
            </div>
            <ul className="ledger">
              {meals.map(m => (
                <li key={m.id}>
                  <span style={{ minWidth: 0 }}>{m.name}<br /><span className="sub">{[m.brand, m.amount].filter(Boolean).join(" · ")}</span></span>
                  <span className="mono muted small">{fmt(m.k)} kcal · {Math.round(m.p)}p · {Math.round(m.c)}c · {Math.round(m.f)}f</span>
                  <button className="x" aria-label={`Remove ${m.name}`} disabled={!!pending} onClick={() => run({ op: "removeMeal", id: m.id }, `Removed ${m.name}`, m.id)}>{pending === m.id ? "…" : "×"}</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="grid g2">
        <div className="panel">
          <form onSubmit={e => { e.preventDefault(); woA.run(async () => { await edit(date, { op: "addWorkout", workout: wo }); setWo({ ...wo, min: "", name: "" }); }); }}>
            <h2>Workout</h2>
            <div className="row">
              <label>Type<select id="woType" value={wo.type} onChange={e => setWo({ ...wo, type: e.target.value })}>{["Strength", "Cardio", "HIIT", "Walk", "Sport", "Mobility"].map(x => <option key={x}>{x}</option>)}</select></label>
              <label>Minutes<input id="woMin" type="number" inputMode="numeric" min="1" required value={wo.min} onChange={e => setWo({ ...wo, min: e.target.value })} /></label>
            </div>
            <label>Session<input id="woName" placeholder="Push day: bench 4×8 @ 185" value={wo.name} onChange={e => setWo({ ...wo, name: e.target.value })} /></label>
            <div className="btns"><ActBtn act={woA} type="submit" label="Add workout" busy="Adding…" done="Workout added" /><ActErr act={woA} /></div>
          </form>
          <ul className="ledger" style={{ marginTop: 10 }}>
            {(day.workouts || []).map(w => (
              <li key={w.id}><span><b>{w.type}</b> {w.name}</span><span className="mono muted small">{w.min} min</span><button className="x" aria-label="Remove workout" disabled={!!pending} onClick={() => run({ op: "removeWorkout", id: w.id }, "Workout removed", w.id)}>{pending === w.id ? "…" : "×"}</button></li>
            ))}
          </ul>
        </div>
        <div className="stack" style={{ gap: 16 }}>
          <div className="panel">
            <form onSubmit={e => { e.preventDefault(); stA.run(async () => { await edit(date, { op: "setSteps", steps: st }); setSt(""); }); }}>
              <h2>Steps</h2>
              <p className="note small">
                {day.fitbitSteps != null ? `Google Health: ${fmt(day.fitbitSteps)} steps.` : "No Google Health steps for this day yet."}
                {day.steps != null && <> You set {fmt(day.steps)} by hand, which overrides Google Health. <button type="button" className="btn ghost sm" disabled={!!pending} onClick={() => run({ op: "setSteps", steps: null }, "Now using Google Health steps", "useGH")}>{pending === "useGH" ? "Switching…" : "Use Google Health"}</button></>}
              </p>
              <div className="row" style={{ alignItems: "flex-end" }}>
                <label>Enter steps by hand<input id="steps" type="number" inputMode="numeric" min="0" required value={st} onChange={e => setSt(e.target.value)} /></label>
                <ActBtn act={stA} type="submit" className="btn ghost" label="Save" busy="Saving…" done="Saved" />
              </div>
              <ActErr act={stA} />
            </form>
          </div>
          <div className="panel">
            <form onSubmit={e => { e.preventDefault(); wiA.run(async () => { await edit(date, { op: "setWeight", weight: wi.w, bf: wi.bf }); setWi({ w: "", bf: "" }); }); }}>
              <h2>Weigh-in</h2>
              {day.weight && (day.weightSource === "scale"
                ? <p className="note small">From your scale via Google Health: {(+day.weight).toFixed(1)} lb{day.bf ? ` · ${day.bf}%` : ""}. Saving one here overrides it.</p>
                : <p className="note small">Saved: {(+day.weight).toFixed(1)} lb{day.bf ? ` · ${day.bf}%` : ""}. <button type="button" className="btn ghost sm" disabled={!!pending} onClick={() => run({ op: "setWeight", weight: null }, "Weigh-in cleared", "clearW")}>{pending === "clearW" ? "Clearing…" : "Clear"}</button></p>)}
              <div className="row">
                <label>Weight lb<input id="wiW" type="number" step="0.1" inputMode="decimal" min="80" required value={wi.w} onChange={e => setWi({ ...wi, w: e.target.value })} /></label>
                <label>Body fat %<input id="wiB" type="number" step="0.1" inputMode="decimal" min="3" max="60" value={wi.bf} onChange={e => setWi({ ...wi, bf: e.target.value })} /></label>
              </div>
              <div className="btns"><ActBtn act={wiA} type="submit" label="Save weigh-in" busy="Saving…" done="Weigh-in saved" /><ActErr act={wiA} /></div>
            </form>
          </div>
        </div>
      </div>
      {picker && <FoodPicker date={date} initialSlot={picker} onClose={() => setPicker(null)}
        onAdd={async (d, meal) => { await edit(d, { op: "addMeal", meal }); flash(`Added to ${meal.slot.toLowerCase()}`); }} />}
    </section>
  );
}

function History({ days }) {
  const ds = Object.keys(days).sort().reverse();
  return (
    <section className="panel">
      <h2 style={{ marginBottom: 10 }}>Daily history</h2>
      <div className="scroll"><table>
        <thead><tr><th>Date</th><th>Weight</th><th>BF %</th><th>kcal</th><th>Protein</th><th>Steps</th><th>Training</th></tr></thead>
        <tbody>
          {ds.length ? ds.map(d => { const x = days[d], T = totals(x); return (
            <tr key={d}><td>{nice(d)}</td><td>{x.weight ? (+x.weight).toFixed(1) : "—"}</td><td>{x.bf || "—"}</td><td>{T.k ? fmt(T.k) : "—"}</td><td>{T.p ? fmt(T.p) + " g" : "—"}</td><td>{T.steps != null ? fmt(T.steps) : "—"}</td><td>{T.mins ? T.mins + " min" : "—"}</td></tr>
          ); }) : <tr><td colSpan="7" className="empty">Your days will show up here as you log them.</td></tr>}
        </tbody>
      </table></div>
    </section>
  );
}

function Plan({ data, setData, flash, syncFitbit, load }) {
  const [p, setP] = useState(data.plan);
  const [imp, setImp] = useState("");
  const f = data.fitbit;
  const field = (k, l, extra = {}) => <label>{l}<input id={`plan-${k}`} type="number" step="any" value={p[k]} onChange={e => setP({ ...p, [k]: e.target.value })} {...extra} /></label>;
  const syncA = useAction(5000), discA = useAction(), saveA = useAction(), impA = useAction(5000), outA = useAction();
  const [justOff, setJustOff] = useState(false);
  const [opening, setOpening] = useState(false);
  useEffect(() => { const r = () => setOpening(false); addEventListener("pageshow", r); return () => removeEventListener("pageshow", r); }, []);
  const when = t => new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const time = t => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const save = e => { e.preventDefault(); saveA.run(async () => { const r = await api("/api/plan", { method: "PUT", body: p }); setData(d => ({ ...d, plan: r.plan })); setP(r.plan); }); };
  const sync = () => syncA.run(async () => { const r = await syncFitbit(true); return `Synced ${time(r?.lastSync || Date.now())}`; });
  // Only show "Disconnected" once the server confirms the link is gone.
  const disconnect = () => discA.run(async () => {
    await api("/api/fitbit/disconnect", { method: "POST" });
    const d = await load();
    if (!d) throw new Error("Couldn't confirm. Check your connection and try again.");
    if (d.fitbit.connected) throw new Error("Still connected. Try again.");
    setJustOff(true);
  });
  const doImport = () => impA.run(async () => { const r = await api("/api/import", { method: "POST", body: imp }); setImp(""); await load(); return `Imported ${r.imported} days`; });
  const signOut = () => outA.run(async () => { await api("/api/logout", { method: "POST" }); location.href = "/login"; return "Signed out"; });
  return (
    <section className="grid g2">
      <div className="stack" style={{ gap: 16 }}>
        <div className="panel stack">
          <h2>Google Health</h2>
          {!f.configured ? <p className="note">Google keys aren't set on the server yet. Add <span className="mono">GOOGLE_CLIENT_ID</span> and <span className="mono">GOOGLE_CLIENT_SECRET</span> in Vercel, then redeploy.</p>
            : f.connected ? <>
              <div className="status on"><i />Connected{f.lastSync ? ` · last synced ${when(f.lastSync)}` : " · not synced yet"}</div>
              <p className="note">Steps, weight and body fat sync when you open the app and every morning.</p>
              <div className="btns">
                <ActBtn act={syncA} label="Sync now" busy="Syncing…" done="Synced" disabled={discA.st === "busy"} onClick={sync} />
                <ActBtn act={discA} className="btn ghost" label="Disconnect" busy="Disconnecting…" done="Disconnected" disabled={syncA.st === "busy"} onClick={disconnect} />
              </div>
              <ActErr act={syncA} /><ActErr act={discA} />
            </> : <>
              <div className="status off"><i />{justOff ? "✓ Disconnected" : "Not connected"}</div>
              <p className="note">{justOff ? "The app no longer reads from Google Health. Steps and weigh-ins you already synced stay in your log." : "Sign in with the Google account your Fitbit syncs to. Your steps, plus weigh-ins from a scale that syncs to Fitbit, come in on their own."}</p>
              <ActErr act={syncA} />
              <a className="btn" href="/api/fitbit/connect" aria-busy={opening} onClick={() => setOpening(true)}>{opening ? "Opening Google…" : justOff ? "Reconnect Google Health" : "Connect Google Health"}</a>
            </>}
        </div>
        <div className="panel">
          <form onSubmit={save}>
            <h2>Targets</h2>
            <div className="row">{field("kcal", "Calories")}{field("protein", "Protein g")}</div>
            <div className="row">{field("steps", "Steps")}{field("workouts", "Workouts / week")}</div>
            <div className="row">{field("goal", "Goal weight lb")}{field("rate", "Weekly loss lb")}</div>
            <div className="btns"><ActBtn act={saveA} type="submit" label="Save targets" busy="Saving…" done="Targets saved" /><ActErr act={saveA} /></div>
          </form>
        </div>
      </div>
      <div className="stack" style={{ gap: 16 }}>
        <div className="panel stack">
          <h2>How the targets were set</h2>
          <p className="note">Starting point from your scale on Oct 7, 2026: 224.9 lb, 23.5% body fat, 172.0 lb lean mass, BMR 2,054 kcal.</p>
          <p className="note"><b>Goal weight ≈ 195 lb.</b> Keeping 172 lb of lean mass at 12% body fat: 172 ÷ 0.88 = 195.5 lb.</p>
          <p className="note"><b>Calories 2,300/day.</b> BMR 2,054 × ~1.4 for training and 10k steps puts maintenance near 2,900. A ~600 kcal deficit is about 1.2 lb a week.</p>
          <p className="note"><b>Protein 225 g/day</b> to hold muscle while cutting. That's 900 kcal; fat ~70 g, and carbs fill the rest (~190 g).</p>
          <p className="note">If weight stalls for two weeks, drop 150 kcal or add 2,000 steps. Weigh in the morning under the same conditions and trust the weekly trend.</p>
        </div>
        <div className="panel stack">
          <details>
            <summary className="lbl" style={{ cursor: "pointer" }}>Import from the first tracker</summary>
            <div className="stack" style={{ marginTop: 10 }}>
              <textarea id="import" rows="4" value={imp} onChange={e => setImp(e.target.value)} placeholder='{"days": {...}}' />
              <div className="btns"><ActBtn act={impA} className="btn ghost sm" label="Import" busy="Importing…" done="Imported" disabled={!imp.trim() && impA.st !== "done"} onClick={doImport} /><ActErr act={impA} /></div>
            </div>
          </details>
          <div className="btns"><ActBtn act={outA} className="btn ghost sm" label="Sign out of this device" busy="Signing out…" done="Signed out" onClick={signOut} /><ActErr act={outA} /></div>
          {data.storage === "file" && <p className="err small">Storage isn't connected, so data won't sync between devices. Add the Upstash Redis integration in Vercel.</p>}
        </div>
      </div>
    </section>
  );
}
