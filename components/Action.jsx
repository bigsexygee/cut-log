"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// One tap = one visible outcome. A button goes idle → working ("Syncing…", disabled)
// → result ("Synced 3:42 PM", green) or an error shown in plain words next to it.
// The green result stays locked in until reset() (or `doneFor` ms when given).
export function useAction(doneFor = 0) {
  const [s, setS] = useState({ st: "idle", msg: "" });
  const busy = useRef(false), t = useRef();
  useEffect(() => () => clearTimeout(t.current), []);
  const run = useCallback(async (fn) => {
    if (busy.current) return;
    busy.current = true; clearTimeout(t.current); setS({ st: "busy", msg: "" });
    try {
      const msg = await fn();
      setS({ st: "done", msg: typeof msg === "string" ? msg : "" });
      if (doneFor) t.current = setTimeout(() => setS({ st: "idle", msg: "" }), doneFor);
      return true;
    } catch (e) {
      setS({ st: "error", msg: e?.message || "That didn't work. Try again." });
      t.current = setTimeout(() => setS({ st: "idle", msg: "" }), 8000);
      return false;
    } finally { busy.current = false; }
  }, [doneFor]);
  const reset = useCallback(() => { if (busy.current) return; clearTimeout(t.current); setS(x => x.st === "idle" ? x : { st: "idle", msg: "" }); }, []);
  return { ...s, run, reset };
}

// label: idle text · busy: working text · done: result text (the action can return its own).
// other: the action(s) this button is the alternative to; once one of them is
// locked in (green), this button turns red.
export function ActBtn({ act, label, busy, done, className = "btn", type = "button", disabled, onClick, other, ...rest }) {
  const text = act.st === "busy" ? busy : act.st === "done" ? `✓ ${act.msg || done}` : act.st === "error" ? "Try again" : label;
  const alt = act.st !== "done" && isDone(other);
  return (
    <button type={type} className={`${className}${act.st === "done" ? " done" : alt ? " alt" : ""}`} disabled={disabled || act.st === "busy"}
      aria-busy={act.st === "busy"} aria-pressed={act.st === "done"} onClick={onClick} {...rest}>{text}</button>
  );
}

export const isDone = o => [].concat(o || []).some(a => a?.st === "done");

export function ActErr({ act }) {
  return act.st === "error" ? <span className="err small" role="alert">{act.msg}</span> : null;
}
