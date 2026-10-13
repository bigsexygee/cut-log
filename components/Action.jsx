"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// One tap = one visible outcome. A button goes idle → working ("Syncing…", disabled)
// → result ("Synced 3:42 PM") or an error shown in plain words next to it.
export function useAction(doneFor = 3500) {
  const [s, setS] = useState({ st: "idle", msg: "" });
  const busy = useRef(false), t = useRef();
  useEffect(() => () => clearTimeout(t.current), []);
  const run = useCallback(async (fn) => {
    if (busy.current) return;
    busy.current = true; clearTimeout(t.current); setS({ st: "busy", msg: "" });
    try {
      const msg = await fn();
      setS({ st: "done", msg: typeof msg === "string" ? msg : "" });
      t.current = setTimeout(() => setS({ st: "idle", msg: "" }), doneFor);
      return true;
    } catch (e) {
      setS({ st: "error", msg: e?.message || "That didn't work. Try again." });
      t.current = setTimeout(() => setS({ st: "idle", msg: "" }), 8000);
      return false;
    } finally { busy.current = false; }
  }, [doneFor]);
  return { ...s, run };
}

// label: idle text · busy: working text · done: result text (the action can return its own).
export function ActBtn({ act, label, busy, done, className = "btn", type = "button", disabled, onClick, ...rest }) {
  const text = act.st === "busy" ? busy : act.st === "done" ? `✓ ${act.msg || done}` : act.st === "error" ? "Try again" : label;
  return (
    <button type={type} className={`${className}${act.st === "done" ? " done" : ""}`} disabled={disabled || act.st === "busy"}
      aria-busy={act.st === "busy"} onClick={onClick} {...rest}>{text}</button>
  );
}

export function ActErr({ act }) {
  return act.st === "error" ? <span className="err small" role="alert">{act.msg}</span> : null;
}
