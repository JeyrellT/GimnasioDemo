// =============================================================================
// Health check endpoint — TEMPLATE
// Copiar a src/app/api/health/route.ts en cada proyecto Next.js.
//
// Railway llama a este endpoint para saber si el servicio está vivo.
// Si devuelve 200 → "running". Si timeout o != 200 → auto-restart.
//
// MANTENERLO LIGERO: no hagas queries a DB ni llames APIs externas.
// =============================================================================

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      // RAILWAY_GIT_COMMIT_SHA es inyectado por Railway en cada deploy
      version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    },
    { status: 200 },
  );
}
