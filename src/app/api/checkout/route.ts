import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { setRoute } from "@/lib/sentry";

export async function POST(request: Request) {
  setRoute("api_checkout");
  try {
    const body = await request.json();
    const { sessionId } = body as { sessionId: string };
    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error:
          "Checkout not configured. Set up Stripe and STRIPE_PRICE_SCAN for $2 per scan.",
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
