"use server";

// =============================================================================
// BLACKLINE FITNESS — Branding Server Actions
// Owner: backend-api.
// Persist trainer branding (palette, logos, business name) to the database.
// =============================================================================

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/server/db";
import { requireTrainer, requireUser } from "@/server/guards";
import { tryCatch } from "@/lib/result";
import { ValidationError } from "@/lib/errors";
import { logInfo } from "@/lib/logger";
import type { ActionResult } from "@/types/api";

// ---------------------------------------------------------------------------
// Types shared with client
// ---------------------------------------------------------------------------

export interface TrainerBrandingData {
  paletteId: string;
  businessName: string;
  logoFull: string | null;
  logoMark: string | null;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const updateBrandingSchema = z.object({
  paletteId: z.string().min(1).max(30).optional(),
  businessName: z.string().max(40).optional(),
  logoFull: z.string().max(700_000).nullable().optional(), // base64 ~500KB
  logoMark: z.string().max(700_000).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Helper: extract IP + UA for audit
// ---------------------------------------------------------------------------

async function getRequestMeta(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    const userAgent = h.get("user-agent") ?? null;
    return { ipAddress, userAgent };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}

// =============================================================================
// getTrainerBranding — for the trainer themselves
// =============================================================================

export async function getTrainerBranding(): Promise<
  ActionResult<TrainerBrandingData>
> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const profile = await prisma.trainerProfile.findUnique({
      where: { userId: user.id },
      select: {
        brandPaletteId: true,
        brandBusinessName: true,
        brandLogoFull: true,
        brandLogoMark: true,
      },
    });

    return {
      paletteId: profile?.brandPaletteId ?? "blue",
      businessName: profile?.brandBusinessName ?? "",
      logoFull: profile?.brandLogoFull ?? null,
      logoMark: profile?.brandLogoMark ?? null,
    };
  });
}

// =============================================================================
// getClientTrainerBranding — for a client, fetch their active trainer's branding
// =============================================================================

export async function getClientTrainerBranding(): Promise<
  ActionResult<TrainerBrandingData>
> {
  return tryCatch(async () => {
    const user = await requireUser();

    // Find the client's active trainer
    const link = await prisma.trainerClient.findFirst({
      where: {
        clientId: user.id,
        status: "ACTIVE",
        deletedAt: null,
      },
      select: { trainerId: true },
      orderBy: { startedAt: "desc" },
    });

    if (!link) {
      // No active trainer — return defaults
      return {
        paletteId: "blue",
        businessName: "",
        logoFull: null,
        logoMark: null,
      };
    }

    const profile = await prisma.trainerProfile.findUnique({
      where: { userId: link.trainerId },
      select: {
        brandPaletteId: true,
        brandBusinessName: true,
        brandLogoFull: true,
        brandLogoMark: true,
      },
    });

    return {
      paletteId: profile?.brandPaletteId ?? "blue",
      businessName: profile?.brandBusinessName ?? "",
      logoFull: profile?.brandLogoFull ?? null,
      logoMark: profile?.brandLogoMark ?? null,
    };
  });
}

// =============================================================================
// updateTrainerBranding — trainer only
// =============================================================================

export async function updateTrainerBranding(
  input: Partial<TrainerBrandingData>,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const parsed = updateBrandingSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "BRANDING_INPUT",
        parsed.error.issues[0]?.message ?? "Datos de branding inválidos",
        parsed.error,
      );
    }

    const data = parsed.data;
    if (Object.keys(data).length === 0) {
      return { updated: true };
    }

    const { ipAddress, userAgent } = await getRequestMeta();

    await prisma.$transaction(async (tx) => {
      await tx.trainerProfile.update({
        where: { userId: user.id },
        data: {
          ...(data.paletteId !== undefined ? { brandPaletteId: data.paletteId } : {}),
          ...(data.businessName !== undefined ? { brandBusinessName: data.businessName } : {}),
          ...(data.logoFull !== undefined ? { brandLogoFull: data.logoFull } : {}),
          ...(data.logoMark !== undefined ? { brandLogoMark: data.logoMark } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "UPDATE",
          entityType: "TrainerProfile",
          entityId: user.id,
          ipAddress,
          userAgent,
          metadata: { fields: Object.keys(data), context: "branding" },
        },
      });
    });

    logInfo("trainer.branding_updated", { userId: user.id });

    return { updated: true };
  });
}
