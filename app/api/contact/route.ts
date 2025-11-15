// app/api/contact/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    const cleanSubject =
      (subject && subject.trim()) || "New message from contact form";

    await resend.emails.send({
      from: "WWIII Contact <no-reply@asianthejason.com>", // or Resend's sandbox from
      to: "asianthejason@gmail.com",                      // <-- your inbox
      replyTo: email,                                     // so replying goes to them
      subject: `[WWIII] ${cleanSubject}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      // you can also add an HTML version if you want:
      // html: `<p><strong>From:</strong> ${name} (${email})</p><p>${message.replace(/\n/g, "<br />")}</p>`
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error sending contact email", err);
    return NextResponse.json(
      { ok: false, error: "Failed to send message." },
      { status: 500 }
    );
  }
}
