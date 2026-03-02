import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { setRoute } from "@/lib/sentry";
import {
  consumeVerificationToken,
  createIdentitySession,
} from "@/lib/db";
import { IDENTITY_COOKIE_NAME } from "@/lib/identity-auth";

function getBaseUrl(request: NextRequest): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return new URL(request.url).origin;
}

const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // 1 year

export async function GET(request: NextRequest) {
  setRoute("api_verify_email");
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      const baseUrl = getBaseUrl(request);
      return NextResponse.redirect(`${baseUrl}/scan?verify=missing`);
    }

    const identityId = await consumeVerificationToken(token);
    if (!identityId) {
      const baseUrl = getBaseUrl(request);
      return NextResponse.redirect(`${baseUrl}/scan?verify=expired`);
    }

    const sessionToken = await createIdentitySession(identityId);
    if (!sessionToken) {
      Sentry.captureMessage("createIdentitySession failed after consumeVerificationToken");
      const baseUrl = getBaseUrl(request);
      return NextResponse.redirect(`${baseUrl}/scan?verify=error`);
    }

    const baseUrl = getBaseUrl(request);
    const redirect = NextResponse.redirect(`${baseUrl}/scan`);
    redirect.cookies.set(IDENTITY_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE_SECONDS,
      path: "/",
    });
    return redirect;
  } catch (err) {
    Sentry.captureException(err);
    const baseUrl = getBaseUrl(request);
    return NextResponse.redirect(`${baseUrl}/scan?verify=error`);
  }
}
