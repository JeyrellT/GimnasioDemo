// Webhook stub — acknowledges receipt so the upstream provider (Resend) does
// not retry indefinitely. Replace with signature verification when wiring real
// email-event handling.
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json({ received: true }, { status: 200 });
}
