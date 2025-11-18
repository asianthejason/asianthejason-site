// app/api/create-payment-intent/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn(
    "STRIPE_SECRET_KEY is not set. Payment intent route will fail until this is configured."
  );
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20" as any,
    })
  : null;

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured on the server." },
        { status: 500 }
      );
    }

    const { amount } = await req.json();
    const numericAmount = Number(amount);

    if (!numericAmount || !isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid donation amount." },
        { status: 400 }
      );
    }

    // Frontend sends whole dollar amount, convert to cents for Stripe
    const amountInCents = Math.round(numericAmount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "cad",
      description: "Donation to AsiantheJason game project",

      // 🔒 Only allow card payments, no Klarna / Affirm / Link, etc.
      payment_method_types: ["card"],
      automatic_payment_methods: {
        enabled: false,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err: any) {
    console.error("Stripe PI server error", err);
    return NextResponse.json(
      { error: "Could not create payment intent." },
      { status: 500 }
    );
  }
}
