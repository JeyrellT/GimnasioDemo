// =============================================================================
// BLACKLINE FITNESS — Health check endpoint for Railway
// Returns 200 if app is alive AND can reach the database. Used by Railway's
// healthcheck probe. A 503 here causes Railway to mark the instance unhealthy
// and route traffic away while it restarts.
// =============================================================================

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DB_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("DB_TIMEOUT")), ms),
    ),
  ]);
}

export async function GET() {
  const version = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const timestamp = new Date().toISOString();

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, DB_TIMEOUT_MS);
    return NextResponse.json(
      { status: "ok", db: "ok", timestamp, version },
      { status: 200 },
    );
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { status: "degraded", db: "unreachable", reason, timestamp, version },
      { status: 503 },
    );
  }
}
