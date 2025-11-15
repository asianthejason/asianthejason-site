// app/terms/page.tsx
import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="site">
      <section className="panel-section">
        <div className="tabs-shell" style={{ maxWidth: 900, padding: "20px 22px" }}>
          <h1 style={{ marginTop: 0 }}>Terms of Use</h1>
          <p style={{ fontSize: 14, opacity: 0.9 }}>Last updated: {new Date().getFullYear()}</p>

          <p>
            By accessing or using this website and playing <strong>WWIII — Endless Defense</strong>,
            you agree to these Terms of Use. If you do not agree, please do not use the site.
          </p>

          <h2>Use of the site</h2>
          <ul>
            <li>This site is provided for entertainment and educational purposes only.</li>
            <li>You agree not to misuse the site, attempt to hack it, or interfere with other users.</li>
            <li>
              You are responsible for any activity that occurs under your account and for keeping your
              login details secure.
            </li>
          </ul>

          <h2>Accounts and content</h2>
          <ul>
            <li>
              When you create an account, you agree to provide accurate information and to follow any
              community guidelines that may be introduced.
            </li>
            <li>
              You are responsible for the content you submit (for example, display names and reviews).
              Do not post offensive, hateful, or illegal content.
            </li>
            <li>
              We may remove content or restrict access to the site at our discretion if we believe
              these terms have been violated.
            </li>
          </ul>

          <h2>Intellectual property</h2>
          <p>
            All game code, artwork, text, branding, and other original content on this site are owned
            by or licensed to AsiantheJason, unless otherwise stated. You may not copy, redistribute,
            or reuse these materials without permission.
          </p>

          <h2>Third-party services</h2>
          <p>
            This site uses third-party services such as Firebase, Google Analytics, and Google
            AdSense. Your use of those services is also subject to their own terms and policies.
          </p>

          <h2>Disclaimer</h2>
          <p>
            The site is provided &quot;as is&quot; without warranties of any kind, either express or
            implied. We do not guarantee uninterrupted or error-free operation, nor do we guarantee
            that the site will meet your requirements.
          </p>

          <h2>Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, AsiantheJason will not be liable for any indirect,
            incidental, special, or consequential damages arising out of your use of the site or
            inability to use the site.
          </p>

          <h2>Changes to these terms</h2>
          <p>
            We may update these Terms of Use from time to time. If we make material changes, we will
            update the &quot;Last updated&quot; date above. Your continued use of the site after any
            changes means you accept the updated terms.
          </p>

          <h2>Contact</h2>
          <p>
            If you have any questions about these Terms, please reach out via the{" "}
            <Link href="/contact">Contact</Link> page.
          </p>
        </div>
      </section>
    </main>
  );
}
