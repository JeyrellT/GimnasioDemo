// Webhook stub — acknowledges receipt so the upstream provider (Tilopay) does
// not retry indefinitely. Replace with HMAC-verified handler before BILLING_LIVE.
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json({ received: true }, { status: 200 });
}
