// =============================================================================
// VIZION — Email transport health check
// Owner: backend-api.
//
// GET /api/health/email
//
// Verifies that the SMTP transport is correctly configured AND reachable
// (auth + handshake succeed) without actually sending an email.
//
// Auth: requires a TRAINER session — any authenticated trainer can check this
// (useful for self-diagnosing why a client invitation wasn't received).
//
// Does NOT leak credentials, hostnames or ports in the response. Returns only
// a coarse status + error class so a malicious actor cannot probe internals.
// =============================================================================

import { NextResponse } from "next/server";
import { requireTrainer } from "@/server/guards";
import { verifyEmailTransport } from "@/lib/email/client";
import { logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  // Trainer auth — anyone else gets 401 from requireTrainer.
  let trainerId: string;
  try {
    const trainer = await requireTrainer();
    trainerId = trainer.id;
  } catch {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const health = await verifyEmailTransport();

  logInfo("email.health_checked", {
    trainerId,
    configured: health.configured,
    reachable: health.reachable,
    errorClass: health.errorClass,
  });

  return NextResponse.json(
    {
      status: health.reachable ? "ok" : "error",
      configured: health.configured,
      reachable: health.reachable,
      ...(health.errorClass ? { errorClass: health.errorClass } : {}),
      ...(health.errorMessage ? { errorMessage: health.errorMessage } : {}),
      checkedAt: new Date().toISOString(),
    },
    { status: health.reachable ? 200 : 503 },
  );
}
