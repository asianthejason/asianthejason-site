// app/page.tsx
export default function HomePage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-5xl aspect-video">
        <iframe
          src="/WWIII/index.html"
          title="WWIII Game"
          className="w-full h-full border-0"
        />
      </div>
    </main>
  );
}
