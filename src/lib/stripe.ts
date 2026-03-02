import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY;
export const stripe = secret ? new Stripe(secret) : null;

export const STRIPE_PRICE_SCAN = process.env.STRIPE_PRICE_SCAN ?? "";
