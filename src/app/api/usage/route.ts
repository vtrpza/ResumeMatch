import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { setRoute } from "@/lib/sentry";
import { getUsage, getUsageForIdentity } from "@/lib/db";
import { isFullAppEnabled, isDatabaseAvailable } from "@/lib/feature-config";
import { getIdentityFromCookie, IDENTITY_COOKIE_NAME } from "@/lib/identity-auth";

export async function GET(request: NextRequest) {
  setRoute("api_usage");
  try {
    if (isFullAppEnabled() && !isDatabaseAvailable()) {
      return NextResponse.json(
        { error: "Usage service unavailable" },
        { status: 503 }
      );
    }

    const fullApp = isFullAppEnabled();
    const dbAvailable = isDatabaseAvailable();

    // Full app: usage is keyed by verified identity (cookie), not client sessionId
    if (fullApp && dbAvailable) {
      const token = request.cookies.get(IDENTITY_COOKIE_NAME)?.value;
      const identity = await getIdentityFromCookie(token);
      if (!identity) {
        return NextResponse.json(
          { requiresVerification: true },
          { status: 401 }
        );
      }
      const usage = await getUsageForIdentity(identity.id);
      if (usage === null) {
        return NextResponse.json(
          { error: "Usage service unavailable" },
          { status: 503 }
        );
      }
      return NextResponse.json(usage);
    }

    // Legacy: client-supplied sessionId (when full app is off)
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    if (sessionId) {
      const usage = await getUsage(sessionId);
      if (fullApp && usage === null) {
        return NextResponse.json(
          { error: "Usage service unavailable" },
          { status: 503 }
        );
      }
      if (usage) {
        return NextResponse.json(usage);
      }
    }
    return NextResponse.json({
      scanCount: 0,
      purchasedScans: 0,
    });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "Usage check failed" },
      { status: 500 }
    );
  }
}
