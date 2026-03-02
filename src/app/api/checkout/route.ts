import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { plan } = body as { plan: string; sessionId: string };

  return NextResponse.json({
    error: `Checkout for "${plan}" plan is not configured yet. Please set up a payment provider.`,
  }, { status: 501 });
}
