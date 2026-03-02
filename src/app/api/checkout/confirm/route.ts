import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { setRoute } from "@/lib/sentry";
import { stripe } from "@/lib/stripe";
import { creditPurchaseIfNew } from "@/lib/db";

export async function POST(request: NextRequest) {
  setRoute("api_checkout_confirm");
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Checkout not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const stripeSessionId = (body?.stripeSessionId ?? body?.session_id) as string | undefined;
    if (!stripeSessionId || typeof stripeSessionId !== "string") {
      return NextResponse.json(
        { error: "Missing stripeSessionId" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(stripeSessionId, {
      expand: [],
    });

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    const appSessionId = session.metadata?.session_id;
    if (!appSessionId || typeof appSessionId !== "string") {
      return NextResponse.json(
        { error: "Invalid session metadata" },
        { status: 400 }
      );
    }

    const credited = await creditPurchaseIfNew(stripeSessionId, appSessionId);
    return NextResponse.json({ ok: true, credited });
  } catch (err) {
    Sentry.captureException(err);
    const message =
      err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
        ? (err as { message: string }).message
        : "Confirm failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
