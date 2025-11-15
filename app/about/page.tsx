// app/about/page.tsx
export default function AboutPage() {
  return (
    <main className="site">
      <section className="panel-section">
        <div className="tabs-shell" style={{ maxWidth: 900, padding: "20px 22px" }}>
          <h1 style={{ marginTop: 0 }}>About AsiantheJason</h1>

          <p>
            Hi, I&apos;m <strong>Jason Huang</strong>, the person behind{" "}
            <strong>AsiantheJason</strong>. I build games and tools that mix problem-solving,
            strategy, and a bit of chaos — the same mindset I bring to teaching math, computer
            science, and robotics.
          </p>

          <p>
            <strong>WWIII — Endless Defense</strong> started as a side project: a fast-paced survival
            game where you push your distance record while managing ammo, upgrades, and timing.
            Over time it grew into a full web experience with online leaderboards, player reviews,
            and more polish than I initially planned.
          </p>

          <p>
            Outside of game development, I&apos;ve taught hundreds of students in a university-prep
            environment, coached competitive math and programming, and worked on educational
            platforms that make STEM more approachable. This site is a small place where those
            worlds overlap: games built with care, backed by real engineering.
          </p>

          <p>
            If you enjoy the game or have ideas for improvements, I&apos;d love to hear from you.
            Check out the <strong>Leaderboard</strong>, leave a <strong>Review</strong>, and come
            back after future updates — there&apos;s more on the way.
          </p>
        </div>
      </section>
    </main>
  );
}
