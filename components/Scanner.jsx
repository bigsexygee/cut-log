"use client";
import { useEffect, useRef, useState } from "react";

// Live camera barcode scanner (UPC/EAN). Uses the phone's back camera.
export default function Scanner({ onCode }) {
  const video = useRef(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let controls = null, stopped = false, done = false;
    (async () => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
        const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.EAN_8]]]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          video.current,
          (result, _e, c) => {
            if (result && !done) {
              done = true; c.stop();
              if (navigator.vibrate) navigator.vibrate(60);
              onCode(result.getText());
            }
          });
        if (stopped) controls.stop();
      } catch (e) {
        setErr(e?.name === "NotAllowedError" ? "Camera access was blocked. Allow the camera for this site in your browser settings, or type the barcode below."
          : "Couldn't start the camera. Type the barcode number below instead.");
      }
    })();
    return () => { stopped = true; controls?.stop(); };
  }, [onCode]);
  return (
    <div className="stack">
      {err ? <p className="err">{err}</p> : (
        <div className="video-box"><video ref={video} muted playsInline autoPlay /><div className="aim" /></div>
      )}
      {!err && <p className="note small">Line the barcode up inside the box. It scans on its own.</p>}
    </div>
  );
}
