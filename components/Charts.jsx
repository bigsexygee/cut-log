import { BASELINE, addDays, parse, iso, fmt, totals, stepsOf } from "./util";

export function WeightChart({ wi, plan }) {
  const W = 520, H = 240, L = 40, R = 12, T = 14, B = 28;
  const pts = wi.length ? wi : [{ d: BASELINE.date, w: BASELINE.weight }];
  const weeks = (BASELINE.weight - plan.goal) / plan.rate;
  const goalD = addDays(BASELINE.date, Math.round(weeks * 7));
  const lastD = pts[pts.length - 1].d;
  const endD = lastD > goalD ? lastD : goalD;
  const t0 = parse(BASELINE.date).getTime(), t1 = parse(endD).getTime();
  const ws = pts.map(p => p.w).concat([BASELINE.weight, plan.goal]);
  const lo = Math.floor((Math.min(...ws) - 3) / 5) * 5, hi = Math.ceil((Math.max(...ws) + 2) / 5) * 5;
  const x = d => L + (parse(d).getTime() - t0) / (t1 - t0 || 1) * (W - L - R);
  const y = w => T + (hi - w) / (hi - lo) * (H - T - B);
  const ticks = []; for (let v = lo; v <= hi; v += 5) ticks.push(v);
  const months = []; const m = parse(BASELINE.date); m.setDate(1); m.setMonth(m.getMonth() + 1);
  while (m.getTime() <= t1) { months.push(iso(m)); m.setMonth(m.getMonth() + 1); }
  const e = pts[pts.length - 1];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weight trend against plan">
      {ticks.map(v => <g key={v}><line className="gl" x1={L} x2={W - R} y1={y(v)} y2={y(v)} /><text x={L - 6} y={y(v) + 4} textAnchor="end">{v}</text></g>)}
      {months.map(d => <text key={d} x={x(d)} y={H - 8} textAnchor="middle">{parse(d).toLocaleDateString(undefined, { month: "short" })}</text>)}
      <line x1={L} x2={W - R} y1={y(plan.goal)} y2={y(plan.goal)} stroke="var(--good)" strokeWidth="1.5" />
      <text x={L + 6} y={y(plan.goal) - 6} style={{ fill: "var(--good)" }}>goal {plan.goal}</text>
      <line x1={x(BASELINE.date)} y1={y(BASELINE.weight)} x2={x(goalD)} y2={y(plan.goal)} stroke="var(--ink-3)" strokeDasharray="4 4" strokeWidth="1.5" />
      {pts.length > 1 && <polyline fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" points={pts.map(p => `${x(p.d)},${y(p.w)}`).join(" ")} />}
      {pts.map((p, i) => <circle key={p.d} cx={x(p.d)} cy={y(p.w)} r={i === pts.length - 1 ? 5 : 3} fill="var(--accent)" stroke="var(--surface)" strokeWidth={i === pts.length - 1 ? 2 : 0} />)}
      <text x={Math.min(x(e.d) + 8, W - R - 40)} y={y(e.w) - 8} style={{ fill: "var(--ink)" }}>{e.w.toFixed(1)}</text>
    </svg>
  );
}

export function WeekChart({ days, last7, plan }) {
  const W = 520, H = 240, L = 46, R = 50, T = 14, B = 28;
  const steps = last7.map(d => stepsOf(days[d]) || 0), kc = last7.map(d => totals(days[d]).k);
  const sMax = Math.max(plan.steps * 1.3, ...steps), kMax = Math.max(plan.kcal * 1.3, ...kc);
  const bw = (W - L - R) / 7;
  const ys = v => T + (1 - v / sMax) * (H - T - B), yk = v => T + (1 - v / kMax) * (H - T - B);
  const kp = last7.map((d, i) => kc[i] ? [L + bw * i + bw / 2, yk(kc[i])] : null).filter(Boolean);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Steps and calories for the last seven days">
      {[0, .5, 1].map(f => { const v = Math.round(sMax * f / 1000) * 1000; return <g key={f}><line className="gl" x1={L} x2={W - R} y1={ys(v)} y2={ys(v)} /><text x={L - 6} y={ys(v) + 4} textAnchor="end">{v / 1000}k</text></g>; })}
      {[0, .5, 1].map(f => { const v = Math.round(kMax * f / 100) * 100; return <text key={f} x={W - R + 6} y={yk(v) + 4}>{fmt(v)}</text>; })}
      <line x1={L} x2={W - R} y1={ys(plan.steps)} y2={ys(plan.steps)} stroke="var(--good)" strokeDasharray="3 3" />
      <line x1={L} x2={W - R} y1={yk(plan.kcal)} y2={yk(plan.kcal)} stroke="var(--protein)" strokeDasharray="3 3" />
      {last7.map((d, i) => {
        const cx = L + bw * i + bw / 2;
        return <g key={d}>
          {steps[i] > 0 && <rect x={cx - bw * .3} y={ys(steps[i])} width={bw * .6} height={H - B - ys(steps[i])} rx="3" fill="var(--good)" opacity=".75" />}
          <text x={cx} y={H - 8} textAnchor="middle">{parse(d).toLocaleDateString(undefined, { weekday: "short" })}</text>
        </g>;
      })}
      {kp.length > 1 && <polyline fill="none" stroke="var(--protein)" strokeWidth="2" points={kp.map(p => p.join(",")).join(" ")} />}
      {kp.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="var(--protein)" stroke="var(--surface)" strokeWidth="1.5" />)}
    </svg>
  );
}
