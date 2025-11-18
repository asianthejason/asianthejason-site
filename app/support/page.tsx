// app/support/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import Script from "next/script";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";

import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

// Include null so there is no default amount on load
type AmountOption = 3 | 5 | 10 | "custom" | null;

function DonationForm({
  amount,
  onSuccess,
}: {
  amount: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        console.error("Stripe confirmPayment error", error);
        setErrorMessage(error.message || "Payment failed. Please try again.");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Let parent know a donation completed; parent will clear the form.
        onSuccess();
      } else {
        setErrorMessage(
          "Payment processing… if this persists, contact support."
        );
      }
    } catch (err: any) {
      console.error("Stripe payment error", err);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="donation-form">
      <PaymentElement />

      {errorMessage && (
        <div className="auth-message auth-error">{errorMessage}</div>
      )}

      <button
        type="submit"
        className="account-btn primary donation-submit-btn"
        disabled={submitting || !stripe || !elements}
      >
        {submitting ? "Processing…" : `Donate $${amount.toFixed(2)}`}
      </button>
    </form>
  );
}

export default function SupportPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Donation amount state
  const [amountOption, setAmountOption] = useState<AmountOption>(null);
  const [customAmount, setCustomAmount] = useState<string>("");

  // Stripe PaymentIntent state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [piLoading, setPiLoading] = useState(false);
  const [piError, setPiError] = useState<string | null>(null);

  // Donation completion
  const [donationComplete, setDonationComplete] = useState(false);

  // Share button feedback
  const [copied, setCopied] = useState(false);

  // ---------- Auth listener (for header) ----------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as any;

    if (!w.auth && w.firebase?.auth) {
      w.auth = w.firebase.auth();
    }

    const auth = w.auth;
    if (!auth) {
      console.warn("Firebase auth not available on window (support page)");
      return;
    }

    const unsub = auth.onAuthStateChanged((user: any) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
      } else {
        setCurrentUser(null);
      }
      setAuthReady(true);
    });

    return () => unsub();
  }, []);

  const headerUser = currentUser;
  const userLabel =
    headerUser?.displayName || headerUser?.email || "Unknown soldier";

  const handleSignOut = async () => {
    try {
      const w = window as any;
      const auth = w.auth;
      if (!auth) return;
      await auth.signOut();
      window.location.href = "/";
    } catch (err) {
      console.error("Sign out error", err);
    }
  };

  // ---------- Compute numeric amount (in dollars) ----------
  const numericAmount = (() => {
    if (amountOption === "custom") {
      const n = Number(customAmount);
      return isFinite(n) && n > 0 ? n : 0;
    }
    if (amountOption === 3 || amountOption === 5 || amountOption === 10) {
      return amountOption;
    }
    return 0;
  })();

  // ---------- Start payment: create PaymentIntent once ----------
  const handleStartPayment = async () => {
    if (clientSecret) {
      // PaymentIntent already created for this flow
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setPiError("Please choose a valid amount first.");
      return;
    }

    try {
      setPiLoading(true);
      setPiError(null);

      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numericAmount }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create payment intent.");
      }

      setClientSecret(data.clientSecret);
    } catch (err: any) {
      console.error("PI error", err);
      setPiError(err.message || "Could not start donation.");
      setClientSecret(null);
    } finally {
      setPiLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const url =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://asianthejason.com";
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard error", err);
    }
  };

  const handleShareX = () => {
    const url =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://asianthejason.com";
    const text =
      "Check out this indie game project I'm supporting: " + url;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  const handleShareReddit = () => {
    const url =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://asianthejason.com";
    window.open(
      `https://www.reddit.com/submit?url=${encodeURIComponent(
        url
      )}&title=${encodeURIComponent("Indie endless defense shooter")}`,
      "_blank"
    );
  };

  const resetDonationState = () => {
    setAmountOption(null);
    setCustomAmount("");
    setClientSecret(null);
    setPiError(null);
    setPiLoading(false);
  };

  const elementsOptions =
    clientSecret && numericAmount
      ? {
          clientSecret,
          appearance: {
            theme: "night" as const,
          },
        }
      : undefined;

  return (
    <>
      {/* Firebase scripts so the header works */}
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"
        strategy="beforeInteractive"
      />
      <Script
        id="firebase-init-support"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
          const firebaseConfig = {
            apiKey: "AIzaSyAteayH-i26BMMYrTHecwlJF1S4DKmDPXI",
            authDomain: "wwiii-game-af0e7.firebaseapp.com",
            projectId: "wwiii-game-af0e7",
            storageBucket: "wwiii-game-af0e7.appspot.com",
            messagingSenderId: "906432978784",
            appId: "1:906432978784:web:433e23330bef1e6a3ac805"
          };

          if (!window.firebase?.apps?.length) {
            window.firebase.initializeApp(firebaseConfig);
          }
          if (!window.db) {
            window.db = window.firebase.firestore();
          }
          if (!window.auth) {
            window.auth = window.firebase.auth();
          }
        `,
        }}
      />

      <main className="site">
        <SiteHeader
          authReady={authReady}
          user={headerUser}
          userLabel={userLabel}
          onOpenAuth={() => {
            // Send them back to main page auth flow
            window.location.href = "/";
          }}
          onSignOut={handleSignOut}
        />

        <section className="panel-section">
          <div className="support-shell">
            <header className="support-header">
              <span className="support-pill">Support the games</span>
              <h1>Help keep the project online and evolving</h1>
              <p>
                These are solo-dev projects powered by late nights, coffee,
                and player feedback. If you&apos;re enjoying the game and
                want to support future updates, here are two easy ways to
                help.
              </p>
            </header>

            <div className="support-grid">
              {/* Share card */}
              <article className="support-card">
                <h2>1. Share the site</h2>
                <p>
                  The simplest way to support the project is to share it with
                  your friends. More players means more feedback, more
                  leaderboard competition, and more reason to ship updates.
                </p>

                <div className="support-share-actions">
                  <button
                    type="button"
                    className="account-btn subtle"
                    onClick={handleCopyLink}
                  >
                    {copied ? "Link copied!" : "Copy site link"}
                  </button>

                  <button
                    type="button"
                    className="account-btn subtle"
                    onClick={handleShareX}
                  >
                    Share on X / Twitter
                  </button>

                  <button
                    type="button"
                    className="account-btn subtle"
                    onClick={handleShareReddit}
                  >
                    Share on Reddit
                  </button>
                </div>

                <p className="support-note">
                  Tip: posting a clip or screenshot of a wild run with the
                  link attached helps a ton.
                </p>
              </article>

              {/* Donation card */}
              <article className="support-card">
                <h2>2. Donate via Stripe</h2>
                <p>
                  If you&apos;d like to help cover hosting, tools, and dev
                  time directly, you can send a one-time donation via
                  Stripe. Thank you for keeping the lights on 🙏
                </p>

                <div className="donation-amount-picker">
                  <span className="support-label">Choose an amount</span>
                  <div className="donation-amount-buttons">
                    {[3, 5, 10].map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={
                          "donation-chip" +
                          (amountOption === v ? " donation-chip-active" : "")
                        }
                        onClick={() => {
                          setAmountOption(v as AmountOption);
                          setCustomAmount("");
                          setDonationComplete(false);
                          setClientSecret(null);
                          setPiError(null);
                        }}
                      >
                        ${v}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={
                        "donation-chip" +
                        (amountOption === "custom"
                          ? " donation-chip-active"
                          : "")
                      }
                      onClick={() => {
                        setAmountOption("custom");
                        setDonationComplete(false);
                        setClientSecret(null);
                        setPiError(null);
                      }}
                    >
                      Custom
                    </button>
                  </div>

                  {amountOption === "custom" && (
                    <div className="donation-custom-input">
                      <span className="support-label">Custom amount</span>
                      <div className="donation-custom-field">
                        <span className="donation-currency">$</span>
                        <input
                          type="number"
                          min={1}
                          step="0.5"
                          value={customAmount}
                          onChange={(e) => {
                            setCustomAmount(e.target.value);
                            setDonationComplete(false);
                            setClientSecret(null);
                            setPiError(null);
                          }}
                          placeholder="5.00"
                        />
                      </div>
                      <p className="support-hint">
                        Minimum $1.00. Please enter a whole or decimal
                        amount.
                      </p>
                    </div>
                  )}
                </div>

                {piError && (
                  <div className="auth-message auth-error">{piError}</div>
                )}

                {donationComplete && (
                  <div className="auth-message auth-status">
                    Thank you for supporting the project! ❤️
                  </div>
                )}

                {/* If we have a clientSecret, show Stripe form; otherwise show "Continue" button */}
                {elementsOptions && stripePromise && !donationComplete ? (
                  <Elements
                    stripe={stripePromise}
                    options={elementsOptions}
                  >
                    <DonationForm
                      amount={numericAmount}
                      onSuccess={() => {
                        // Clear all state after a successful payment
                        setDonationComplete(true);
                        resetDonationState();
                      }}
                    />
                  </Elements>
                ) : (
                  !donationComplete && (
                    <button
                      type="button"
                      className="account-btn primary donation-submit-btn"
                      disabled={piLoading}
                      onClick={handleStartPayment}
                    >
                      {piLoading
                        ? "Preparing payment…"
                        : numericAmount
                        ? `Continue with $${numericAmount.toFixed(2)}`
                        : "Choose an amount to continue"}
                    </button>
                  )
                )}

                {donationComplete && (
                  <button
                    type="button"
                    className="account-btn subtle donation-submit-btn"
                    onClick={() => {
                      setDonationComplete(false);
                      resetDonationState();
                    }}
                  >
                    Make another donation
                  </button>
                )}

                <p className="support-caption">
                  Payments are processed securely via Stripe. Your card
                  details never hit my server.
                </p>
              </article>
            </div>
          </div>
        </section>

        <footer className="site-footer">
          <span>© {new Date().getFullYear()} AsiantheJason</span>

          <nav className="site-footer-links">
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
          </nav>
        </footer>
      </main>

      <style jsx global>{`
        body {
          margin: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont,
            "SF Pro Text", sans-serif;
          background: radial-gradient(circle at top, #0b1020 0, #02040a 60%);
          color: #f5f5f5;
        }

        .site {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 16px 0 32px;
        }

        .panel-section {
          display: flex;
          justify-content: center;
          margin-top: 24px;
          padding: 0 16px;
        }

        .support-shell {
          width: 100%;
          max-width: 1100px;
          background: rgba(9, 12, 25, 0.96);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.7);
          padding: 24px 24px 22px;
        }

        .support-header h1 {
          margin: 8px 0 6px;
          font-size: 24px;
        }

        .support-header p {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          opacity: 0.9;
        }

        .support-pill {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.85;
        }

        .support-grid {
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .support-card {
          padding: 16px 16px 14px;
          border-radius: 16px;
          background: radial-gradient(circle at top left, #151a31, #060817);
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-size: 14px;
          line-height: 1.6;
        }

        .support-card h2 {
          margin: 0 0 6px;
          font-size: 18px;
        }

        .support-card p {
          margin: 0 0 10px;
          opacity: 0.9;
        }

        .support-note {
          margin-top: 10px;
          font-size: 13px;
          opacity: 0.8;
        }

        .support-hint {
          margin: 6px 0 0;
          font-size: 12px;
          opacity: 0.8;
        }

        .support-caption {
          margin: 8px 0 0;
          font-size: 12px;
          opacity: 0.75;
        }

        .support-share-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 4px;
        }

        .support-label {
          font-size: 12px;
          opacity: 0.8;
        }

        .donation-amount-picker {
          margin-top: 6px;
          margin-bottom: 10px;
          display: grid;
          gap: 6px;
        }

        .donation-amount-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .donation-chip {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          background: rgba(15, 23, 42, 0.9);
          padding: 4px 10px;
          font-size: 13px;
          cursor: pointer;
        }

        .donation-chip-active {
          background: linear-gradient(135deg, #ff784a, #ffb347);
          color: #120b06;
          border-color: #ffb347;
          font-weight: 600;
        }

        .donation-custom-input {
          margin-top: 4px;
        }

        .donation-custom-field {
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 4px 8px;
          background: rgba(5, 8, 20, 0.95);
        }

        .donation-currency {
          font-size: 14px;
          opacity: 0.9;
        }

        .donation-custom-field input {
          border: none;
          background: transparent;
          color: #f5f5f5;
          font-size: 13px;
          width: 100%;
          outline: none;
        }

        .donation-form {
          margin-top: 8px;
          display: grid;
          gap: 10px;
        }

        .donation-submit-btn {
          width: 100%;
          justify-content: center;
          margin-top: 8px;
        }

        .site-footer {
          margin-top: auto;
          padding: 16px 24px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          opacity: 0.7;
          flex-wrap: wrap;
        }

        .site-footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .site-footer-link {
          text-decoration: none;
          color: inherit;
          opacity: 0.85;
        }

        .site-footer-link:hover {
          opacity: 1;
          text-decoration: underline;
        }

        .account-btn {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 6px 12px;
          font-size: 12px;
          background: transparent;
          color: #f5f5f5;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, opacity 0.15s;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .account-btn.subtle {
          border-color: rgba(255, 255, 255, 0.18);
          opacity: 0.85;
        }

        .account-btn.primary {
          border-color: #ff834a;
          background: linear-gradient(135deg, #ff784a, #ffb347);
          color: #120b06;
          font-weight: 600;
        }

        .account-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.06);
        }

        .account-btn.primary:hover:not(:disabled) {
          filter: brightness(1.05);
        }

        .account-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .auth-message {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 8px;
        }

        .auth-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.6);
          color: #fecaca;
        }

        .auth-status {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.6);
          color: #bbf7d0;
        }

        @media (max-width: 900px) {
          .support-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .support-shell {
            padding: 18px 16px 18px;
          }

          .site-footer {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
        }
      `}</style>
    </>
  );
}
