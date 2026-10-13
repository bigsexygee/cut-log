export const metadata = { title: "Cut Log · Personal fitness tracker" };

export default function About() {
  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <div className="panel stack" style={{ gap: 14 }}>
        <div className="lbl">Personal fitness tracker</div>
        <h1>Cut Log</h1>
        <p className="note">Cut Log is a private fitness tracker for one person's fat-loss cut. It brings meals, workouts, steps and weigh-ins together on one dashboard and tracks progress toward a goal weight and body-fat percentage.</p>
        <h2>What it does</h2>
        <ul className="note">
          <li>Log food by scanning a barcode or searching the USDA food database, with calories, protein, carbs and fat worked out for the amount eaten.</li>
          <li>Log workouts and weigh-ins, and see calorie, protein and step targets for the day.</li>
          <li>With the owner's permission, read daily steps, weight and body fat from Google Health, so data from a Fitbit and a smart scale appears automatically. Access is read-only.</li>
          <li>Works on desktop and installs to a phone's home screen, with both showing the same log.</li>
        </ul>
        <p className="note">Cut Log is not a public service and does not accept sign-ups. It is used only by its owner.</p>
        <div className="btns">
          <a className="btn" href="/login">Sign in</a>
          <a className="btn ghost" href="/privacy">Privacy policy</a>
          <a className="btn ghost" href="/terms">Terms of service</a>
        </div>
      </div>
    </main>
  );
}
