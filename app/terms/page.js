export const metadata = { title: "Terms of Service · Cut Log" };

const UPDATED = "October 13, 2026";

export default function Terms() {
  const contact = process.env.PRIVACY_CONTACT;
  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <div className="panel stack" style={{ gap: 14 }}>
        <div className="lbl">Cut Log</div>
        <h1>Terms of Service</h1>
        <p className="note">Last updated {UPDATED}</p>

        <h2>Who can use it</h2>
        <p className="note">Cut Log is a personal app run by its owner for their own use. It is password-protected and does not offer accounts to the public. By using it you agree to these terms.</p>

        <h2>Not medical advice</h2>
        <p className="note">Cut Log is a tracking tool. Calorie, protein, weight and body-fat figures, including targets and projections, are estimates for general fitness purposes only and are not medical, nutritional or diagnostic advice. Talk to a doctor or registered dietitian before making significant changes to diet or exercise.</p>

        <h2>Accuracy of data</h2>
        <p className="note">Nutrition facts come from the USDA FoodData Central database and Open Food Facts, and steps, weight and body fat come from Google Health and connected devices. These sources can contain errors, and Cut Log does not guarantee that any figure is accurate or complete.</p>

        <h2>Connected services</h2>
        <p className="note">Connecting Google Health is optional and can be undone at any time from the app or at myaccount.google.com/permissions. Use of Google services is also governed by Google's own terms. How data is handled is described in the <a href="/privacy">privacy policy</a>.</p>

        <h2>No warranty</h2>
        <p className="note">Cut Log is provided as is, without warranties of any kind, and may change or stop working at any time. To the extent the law allows, its owner is not liable for any loss arising from its use.</p>

        <h2>Changes and contact</h2>
        <p className="note">If these terms change, the date at the top will change.{contact ? <> Questions can be sent to <span className="mono">{contact}</span>.</> : null}</p>
      </div>
    </main>
  );
}
