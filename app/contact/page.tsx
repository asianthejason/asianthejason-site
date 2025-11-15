// app/contact/page.tsx
export default function ContactPage() {
  return (
    <main className="site">
      <section className="panel-section">
        <div className="tabs-shell" style={{ maxWidth: 900, padding: "20px 22px" }}>
          <h1 style={{ marginTop: 0 }}>Contact</h1>

          <p>
            Have feedback on <strong>WWIII — Endless Defense</strong>, found a bug, or want to talk
            about tutoring, games, or STEM projects?
          </p>

          <p>You can reach me at:</p>

          <ul>
            <li>
              <strong>Email:</strong>{" "}
              <a href="mailto:your-email@example.com">your-email@example.com</a>
              {/* TODO: replace with your real contact email */}
            </li>
          </ul>

          <p>
            When you contact me, any information you provide (like your name and email address) will
            only be used to respond to your message, in line with the{" "}
            <a href="/privacy-policy">Privacy Policy</a>.
          </p>

          <p>
            I read all serious feedback and suggestions, even if I can&apos;t reply to every single
            message.
          </p>
        </div>
      </section>
    </main>
  );
}
