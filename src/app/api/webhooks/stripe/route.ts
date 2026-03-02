import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { creditPurchaseIfNew, creditPurchaseForIdentityIfNew } from "@/lib/db";
import { setRoute } from "@/lib/sentry";
import { captureCheckoutCompletedServer } from "@/lib/analytics-server";

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
      const stripeSessionId = session.id;
      const identityId = session.metadata?.identity_id;
      const appSessionId = session.metadata?.session_id;
      if (stripeSessionId) {
        if (identityId && typeof identityId === "string") {
          await creditPurchaseForIdentityIfNew(stripeSessionId, identityId);
          await captureCheckoutCompletedServer(identityId, { source: "webhook" });
        } else if (appSessionId && typeof appSessionId === "string") {
          await creditPurchaseIfNew(stripeSessionId, appSessionId);
          await captureCheckoutCompletedServer(appSessionId, { source: "webhook" });
        }
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
