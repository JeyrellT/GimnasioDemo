// =============================================================================
// TEMPORARY — One-time seed endpoint for creating a test trainer user.
// DELETE THIS FILE after the first user is created.
// Protected by a one-time bearer token.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { hashPassword } from "@/lib/crypto/passwords";

export const dynamic = "force-dynamic";

const SEED_TOKEN = "vizion-seed-2026-05-17-one-time";

export async function POST(req: NextRequest) {
  // Verify bearer token
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${SEED_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: "admin@vizion.app" },
    });

    if (existing) {
      return NextResponse.json({
        ok: true,
        message: "User already exists",
        userId: existing.id,
      });
    }

    // Hash the password
    const passwordHash = await hashPassword("Vizion2026!");

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Create user + trainer profile + subscription in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: "admin@vizion.app",
          name: "Admin Vizion",
          passwordHash,
          role: "TRAINER",
          emailVerified: now,
        },
      });

      await tx.trainerProfile.create({
        data: {
          userId: newUser.id,
          tradeName: "Vizion Fitness",
          specialty: "Entrenamiento funcional",
          bio: "Cuenta de prueba para desarrollo.",
        },
      });

      await tx.trainerSubscription.create({
        data: {
          trainerUserId: newUser.id,
          planTier: "SOLO",
          status: "TRIAL",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt: trialEnd,
        },
      });

      return newUser;
    });

    return NextResponse.json({
      ok: true,
      message: "Test trainer created successfully",
      userId: user.id,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to create user", details: String(error) },
      { status: 500 },
    );
  }
}
