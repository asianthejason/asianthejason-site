// app/privacy-policy/page.tsx
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="site">
      <section className="panel-section">
        <div className="tabs-shell" style={{ maxWidth: 900, padding: "20px 22px" }}>
          <h1 style={{ marginTop: 0 }}>Privacy Policy</h1>
          <p style={{ fontSize: 14, opacity: 0.9 }}>Last updated: {new Date().getFullYear()}</p>

          <p>
            This Privacy Policy explains how <strong>AsiantheJason</strong> (&quot;we&quot;, &quot;us&quot;,
            &quot;our&quot;) collects, uses, and protects information when you use this website and play{" "}
            <strong>WWIII — Endless Defense</strong>.
          </p>

          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong>Account information:</strong> When you sign up to save runs or leave reviews, we
              collect your email address and a display name you choose.
            </li>
            <li>
              <strong>Gameplay data:</strong> We store leaderboard and review data such as distance
              travelled, enemies killed, rating, and review text. This is tied to your account ID.
            </li>
            <li>
              <strong>Log &amp; usage data:</strong> Like most sites, we may collect technical data
              such as IP address, browser type, and pages visited for security and analytics.
            </li>
          </ul>

          <h2>Cookies and advertising</h2>
          <p>
            This site uses cookies and similar technologies to keep you signed in, remember your
            preferences, and improve gameplay and site performance.
          </p>
          <p>
            We also use third-party vendors, including Google, to show advertisements on this site.
            These vendors may use cookies to serve ads based on your visits to this and other
            websites.
          </p>
          <p>
            Google&apos;s use of advertising cookies enables it and its partners to serve ads to you
            based on your visit to this site and/or other sites on the Internet. You can learn more
            about how Google uses data from its partners, and how to control ad personalisation, on
            Google&apos;s official help pages.
          </p>

          <h2>How we use your information</h2>
          <ul>
            <li>To run the game, leaderboards, and reviews features.</li>
            <li>To maintain the security and reliability of the website.</li>
            <li>To communicate with you about your account if needed.</li>
            <li>To analyse anonymised usage so we can improve the game and site.</li>
          </ul>

          <h2>Data sharing</h2>
          <p>
            We do not sell your personal information. We may share limited data with trusted
            service providers who help us host the site, store data, or show ads (for example,
            Firebase and Google AdSense). These providers are only allowed to use your data to
            provide services to us.
          </p>

          <h2>Data retention</h2>
          <p>
            We keep account, leaderboard, and review data for as long as your account exists or as
            long as needed to operate the site. You can request that we delete your account data by
            contacting us.
          </p>

          <h2>Your choices</h2>
          <ul>
            <li>You can update your display name through your account/profile page.</li>
            <li>You can sign out at any time and continue to play anonymously (without saving runs).</li>
            <li>
              You can manage cookies and ad personalisation in your browser settings and through
              Google&apos;s ad settings.
            </li>
          </ul>

          <h2>Children&apos;s privacy</h2>
          <p>
            This site is not specifically targeted at children under 13. If you believe we have
            collected personal information from a child without appropriate consent, please contact
            us so we can delete it.
          </p>

          <h2>Contact</h2>
          <p>
            If you have any questions about this Privacy Policy, you can contact us via the{" "}
            <Link href="/contact">Contact</Link> page.
          </p>
        </div>
      </section>
    </main>
  );
}
