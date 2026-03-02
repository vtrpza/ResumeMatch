import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { setRoute } from "@/lib/sentry";

export async function GET() {
  setRoute("api_usage");
  try {
    return NextResponse.json({
      scanCount: 0,
      hasSubscription: false,
    });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "Usage check failed" },
      { status: 500 }
    );
  }
}
