// app/api/contact/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      subject,
      message,
      userAgent,
    }: {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
      userAgent?: string | null;
    } = body || {};

    if (!subject || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing subject or message" },
        { status: 400 }
      );
    }

    const safeName = name?.trim() || "Unknown player";
    const safeEmail = email?.trim() || "not provided";

    const html = `
      <div>
        <h2>New contact form message</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br />")}</p>
        ${
          userAgent
            ? `<hr /><p style="font-size:12px;color:#555;">
                 User agent: ${userAgent}
               </p>`
            : ""
        }
      </div>
    `;

    const toAddress =
      process.env.CONTACT_TO_EMAIL || "asianthejason@gmail.com";

    const sendResult = await resend.emails.send({
      from: "onboarding@resend.dev", // safe default from Resend docs
      to: [toAddress],
      subject: subject || "New contact form message",
      reply_to: email || undefined,
      html,
    });

    if (sendResult.error) {
      console.error("Resend error:", sendResult.error);
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to send email via Resend",
          details: sendResult.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact route error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
