import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "../globals.css";
import "./globals.css";
import HeaderWithAuth from "../components/HeaderWithAuth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alberta Power Trader",
  description: "Alberta power trading dashboard built by AsiantheJason.",
};

export default function PowerTraderRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentYear = new Date().getFullYear();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="site">
          <HeaderWithAuth />

          {children}

          <footer className="site-footer">
            <span>© {currentYear} AsiantheJason</span>
            <div className="site-footer-links">
              <Link href="/about" className="site-footer-link">
                About
              </Link>
              <Link href="/privacy-policy" className="site-footer-link">
                Privacy Policy
              </Link>
              <Link href="/terms" className="site-footer-link">
                Terms
              </Link>
              <Link href="/contact" className="site-footer-link">
                Contact
              </Link>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
