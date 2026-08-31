import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { CookieConsent } from "./components/CookieConsent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.asianthejason.com"),
  title: {
    default: "AsiantheJason | Software, Games, Animation and More",
    template: "%s | AsiantheJason",
  },
  description:
    "The official AsiantheJason creator hub for original software, games, animations, tools, products, and independent projects by Jason Huang.",
  applicationName: "AsiantheJason",
  authors: [{ name: "Jason Huang", url: "https://www.asianthejason.com" }],
  creator: "Jason Huang",
  category: "technology",
  keywords: [
    "software development",
    "independent creator",
    "web applications",
    "FTC robotics",
    "Alberta energy",
  ],
  openGraph: {
    type: "website",
    url: "https://www.asianthejason.com",
    siteName: "AsiantheJason",
    title: "AsiantheJason | Software, Games, Animation and More",
    description:
      "Original software, games, animation, tools, and independent creative projects by Jason Huang.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="initial-page-load" suppressHydrationWarning>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              #initial-page-cover {
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                display: grid;
                place-items: center;
                background:
                  radial-gradient(circle at 50% 35%, rgba(34, 211, 238, 0.12), transparent 35%),
                  #030711;
                color: #f5f7ff;
                opacity: 1;
                transition: opacity 140ms ease;
              }
              #initial-page-cover span {
                font: 700 13px/1 Arial, Helvetica, sans-serif;
                letter-spacing: 0.28em;
              }
              html:not(.initial-page-load) #initial-page-cover {
                opacity: 0;
                pointer-events: none;
              }
            `,
          }}
        />
        <noscript>
          <style>{`#initial-page-cover { display: none !important; }`}</style>
        </noscript>
        {/* Google AdSense */}
        <Script
          id="adsense-script"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5384832270143450"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div id="initial-page-cover" aria-hidden="true">
          <span>ASIANTHEJASON</span>
        </div>
        {children}

        {/* Cookie consent banner (shows until user accepts/declines) */}
        <CookieConsent />
        <script
          dangerouslySetInnerHTML={{
            __html: `requestAnimationFrame(function(){requestAnimationFrame(function(){document.documentElement.classList.remove("initial-page-load");});});`,
          }}
        />
      </body>
    </html>
  );
}
