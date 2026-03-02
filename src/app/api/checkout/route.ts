import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { setRoute } from "@/lib/sentry";

export async function POST(request: Request) {
  setRoute("api_checkout");
  try {
    const body = await request.json();
    const { plan } = body as { plan: string; sessionId: string };
    return NextResponse.json(
      {
        error: `Checkout for "${plan}" plan is not configured yet. Please set up a payment provider.`,
      },
      { status: 501 }
    );
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "Checkout request failed" },
      { status: 500 }
    );
  }
}
