import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { setRoute } from "@/lib/sentry";
import { stripe, STRIPE_PRICE_SCAN } from "@/lib/stripe";

const CHECKOUT_NOT_CONFIGURED =
  "Payment is not available. Add a $2 one-time price in Stripe and set STRIPE_PRICE_SCAN in .env.local (see .env.example).";

function getBaseUrl(request: Request): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  setRoute("api_checkout");
  try {
    const body = await request.json();
    const { sessionId } = body as { sessionId: string };
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    if (!stripe || !STRIPE_PRICE_SCAN) {
      return NextResponse.json(
        { error: CHECKOUT_NOT_CONFIGURED },
        { status: 503 }
      );
    }

    const baseUrl = getBaseUrl(request);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: STRIPE_PRICE_SCAN,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/scan?success=1`,
      cancel_url: `${baseUrl}/scan`,
      metadata: {
        session_id: sessionId,
      },
    });

    if (!session.url) {
      Sentry.captureMessage("Stripe session created without url");
      return NextResponse.json(
        { error: "Checkout session error. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "Checkout request failed" },
      { status: 500 }
    );
  }
}
