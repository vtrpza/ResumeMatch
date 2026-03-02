import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { incrementPurchasedScans } from "@/lib/db";
import { setRoute } from "@/lib/sentry";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  setRoute("api_webhooks_stripe");
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    Sentry.captureException(e);
    const message = e instanceof Error ? e.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const sessionId = session.metadata?.session_id;
      if (sessionId) {
        await incrementPurchasedScans(sessionId);
      }
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
