import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    scanCount: 0,
    hasSubscription: false,
  });
}
