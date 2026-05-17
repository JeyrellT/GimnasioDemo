// =============================================================================
// VIZION — Health check endpoint for Railway
// Returns 200 if the app is alive. Used by Railway's healthcheck probe.
// =============================================================================

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    },
    { status: 200 },
  );
}
