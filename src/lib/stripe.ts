import Stripe from "stripe";

/** Stripe API version for all server-side calls (checkout, webhooks). */
export const STRIPE_API_VERSION = "2026-02-25.clover";

const secret = process.env.STRIPE_SECRET_KEY;
export const stripe = secret
  ? new Stripe(secret, {
      apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
    })
  : null;

export const STRIPE_PRICE_SCAN = process.env.STRIPE_PRICE_SCAN ?? "";
