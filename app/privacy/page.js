export const metadata = { title: "Privacy Policy · Cut Log" };

const UPDATED = "October 13, 2026";

export default function Privacy() {
  const contact = process.env.PRIVACY_CONTACT;
  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <div className="panel stack" style={{ gap: 14 }}>
        <div className="lbl">Cut Log</div>
        <h1>Privacy Policy</h1>
        <p className="note">Last updated {UPDATED}</p>

        <p className="note">Cut Log is a personal fitness tracker run by one person for their own use. It is not a commercial service, it has no other users, and it does not sell, rent, share or advertise with anyone's data. This policy explains what the app stores and why.</p>

        <h2>What Cut Log stores</h2>
        <ul className="note">
          <li><b>What you log:</b> meals and their calories and macros, workouts, steps entered by hand, weigh-ins and body-fat readings, and your targets.</li>
          <li><b>Google Health data (only if you connect it):</b> daily step totals, weight and body-fat percentage. Cut Log reads these with read-only access and does not write anything to your Google account.</li>
          <li><b>Sign-in tokens:</b> the access and refresh tokens Google issues when you connect, so the app can sync without asking you to sign in every time.</li>
          <li><b>A sign-in cookie</b> that keeps your device signed in to Cut Log. There are no analytics, advertising or tracking cookies.</li>
        </ul>

        <h2>How it is used</h2>
        <p className="note">Data is used only to show your dashboard, history and progress toward your goals inside Cut Log. It is not used for advertising, profiling, or training AI or machine-learning models, and no person reads it except the app's owner.</p>

        <h2>Google user data</h2>
        <p className="note">Cut Log's use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements. Google Health data is requested only with the read-only scopes for activity and fitness and for health metrics and measurements, is used only to fill in steps, weight and body fat in the app, and is never transferred to anyone else.</p>

        <h2>Where data is kept</h2>
        <p className="note">Data is stored in a private database (Upstash Redis) attached to the app's hosting on Vercel, and is sent only over encrypted HTTPS connections. Access requires the owner's password. These providers host the data on the owner's behalf and do not use it for their own purposes.</p>

        <h2>Other services the app talks to</h2>
        <p className="note">When you search for a food or scan a barcode, the search text or barcode number is sent to the USDA FoodData Central database or Open Food Facts to look up nutrition facts. No personal information is sent with these lookups.</p>

        <h2>Keeping and deleting data</h2>
        <p className="note">Data is kept until you delete it. Any entry can be removed in the app. <b>Plan → Disconnect</b> removes the stored Google tokens, and you can also revoke Cut Log's access at any time at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">myaccount.google.com/permissions</a>. Deleting the app's database removes everything.</p>

        <h2>Children</h2>
        <p className="note">Cut Log is not meant for anyone under 13 and does not knowingly collect their data.</p>

        <h2>Changes and contact</h2>
        <p className="note">If this policy changes, the date at the top will change.{contact ? <> Questions can be sent to <span className="mono">{contact}</span>.</> : null}</p>
      </div>
    </main>
  );
}
