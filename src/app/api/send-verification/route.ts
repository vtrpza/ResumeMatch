import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";
import { setRoute } from "@/lib/sentry";
import {
  getOrCreateIdentity,
  createVerificationToken,
} from "@/lib/db";
import { isFullAppEnabled, isDatabaseAvailable } from "@/lib/feature-config";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function getBaseUrl(request: NextRequest): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return new URL(request.url).origin;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  setRoute("api_send_verification");
  try {
    if (!isFullAppEnabled() || !isDatabaseAvailable()) {
      return NextResponse.json(
        { error: "Verification is not available." },
        { status: 503 }
      );
    }

    if (!resend) {
      return NextResponse.json(
        { error: "Email service is not configured." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    const identity = await getOrCreateIdentity(email);
    if (!identity) {
      return NextResponse.json(
        { error: "Could not create verification. Try again later." },
        { status: 500 }
      );
    }

    const token = await createVerificationToken(identity.id);
    if (!token) {
      return NextResponse.json(
        { error: "Could not create verification. Try again later." },
        { status: 500 }
      );
    }

    const baseUrl = getBaseUrl(request);
    const verifyUrl = `${baseUrl}/api/verify-email?token=${encodeURIComponent(token)}`;

    const from =
      process.env.RESEND_FROM?.trim() || "Resume Match <onboarding@resend.dev>";

    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: "Verify your email for Resume Match",
      html: `
        <p>Click the link below to verify your email and run your free resume scan.</p>
        <p><a href="${verifyUrl}">Verify email</a></p>
        <p>This link expires in 24 hours. If you didn't request this, you can ignore this email.</p>
      `,
    });

    if (error) {
      Sentry.captureException(new Error(`Resend send failed: ${JSON.stringify(error)}`));
      return NextResponse.json(
        { error: "Failed to send verification email. Try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
