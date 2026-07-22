"use server";

// =============================================================================
// BLACKLINE FITNESS — Medical Conditions server actions
// Owner: backend-api.
//
// RBAC rules:
//   - listMyMedicalConditions        → CLIENT (own records)
//   - listClientMedicalConditions    → TRAINER with ACTIVE TrainerClient link
//   - saveMyMedicalConditions        → CLIENT (own records, full replace)
//   - markMedicalPromptShown         → CLIENT (own profile, idempotent)
//   - needsMedicalPrompt             → CLIENT (own profile, read-only)
//
// All mutating operations use prisma.$transaction and write an AuditLog entry
// per affected MedicalCondition row. Input is validated with Zod before any
// DB operation.
// =============================================================================

import { headers } from "next/headers";

import { prisma } from "@/server/db";
import { requireClient, requireUser } from "@/server/guards";
import { tryCatch } from "@/lib/result";
import { ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { logInfo, logError } from "@/lib/logger";

import {
  saveMedicalConditionsInput,
  type SaveMedicalConditionsInput,
} from "@/lib/validation/medical-conditions.schema";

import type { ActionResult } from "@/types/api";
import type { MedicalCondition, ParqStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Extract IP and User-Agent from the current request for audit logging. */
async function getRequestMeta(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  try {
    const h = await headers();
    const ipAddress =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    const userAgent = h.get("user-agent") ?? null;
    return { ipAddress, userAgent };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}

// =============================================================================
// listMyMedicalConditions
// =============================================================================

/**
 * Return the authenticated client's non-deleted medical conditions.
 * Only the owning CLIENT may call this.
 */
export async function listMyMedicalConditions(): Promise<
  ActionResult<MedicalCondition[]>
> {
  return tryCatch(async () => {
    const client = await requireClient();

    const conditions = await prisma.medicalCondition.findMany({
      where: {
        clientUserId: client.id,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
    });

    logInfo("medicalConditions.listed", {
      clientUserId: client.id,
      count: conditions.length,
    });

    return conditions;
  });
}

// =============================================================================
// listClientMedicalConditions
// =============================================================================

/**
 * Return a client's non-deleted medical conditions as seen by their trainer.
 *
 * RBAC:
 *   - Caller must be TRAINER (role check via requireUser + role assertion).
 *   - Caller must have an ACTIVE TrainerClient row linking them to clientUserId.
 *   - If either condition fails → ForbiddenError (FORBIDDEN).
 */
export async function listClientMedicalConditions(
  clientUserId: string,
): Promise<ActionResult<MedicalCondition[]>> {
  return tryCatch(async () => {
    const actor = await requireUser();

    if (!clientUserId?.trim()) {
      throw new ValidationError(
        "CLIENT_USER_ID_REQUIRED",
        "ID de cliente requerido",
      );
    }

    // Enforce TRAINER role
    if (actor.role !== "TRAINER") {
      throw new ForbiddenError(
        "FORBIDDEN",
        "Solo los entrenadores pueden consultar las condiciones médicas de sus clientes.",
      );
    }

    // Verify the ACTIVE link: trainer must own this client
    const activeLink = await prisma.trainerClient.findFirst({
      where: {
        trainerId: actor.id,
        clientId: clientUserId,
        status: "ACTIVE",
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!activeLink) {
      throw new ForbiddenError(
        "FORBIDDEN",
        "No tenés acceso activo a este cliente.",
      );
    }

    const conditions = await prisma.medicalCondition.findMany({
      where: {
        clientUserId,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
    });

    logInfo("medicalConditions.trainerListed", {
      trainerId: actor.id,
      clientUserId,
      count: conditions.length,
    });

    return conditions;
  });
}

// =============================================================================
// saveMyMedicalConditions
// =============================================================================

/**
 * Replace the authenticated client's medical condition list atomically.
 *
 * Strategy (full replace within one transaction):
 *   1. Validate input with Zod.
 *   2. Soft-delete any existing rows whose id is NOT present in the new list.
 *   3. Update rows that carry a known id.
 *   4. Create rows that have no id (new items).
 *   5. Set ClientProfile.medicalConditionsReviewedAt = now().
 *   6. Write one AuditLog entry per affected row (CREATE / UPDATE / DELETE).
 */
export async function saveMyMedicalConditions(
  input: SaveMedicalConditionsInput,
): Promise<ActionResult<{ saved: number; deleted: number }>> {
  return tryCatch(async () => {
    const client = await requireClient();

    // Validate before touching DB
    const parsed = saveMedicalConditionsInput.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "MEDICAL_CONDITIONS_INPUT",
        parsed.error.issues[0]?.message ?? "Datos de condiciones médicas inválidos",
        parsed.error,
      );
    }

    const { items } = parsed.data;
    const now = new Date();
    const { ipAddress, userAgent } = await getRequestMeta();

    // Build sets for upsert logic
    const incomingIds = new Set(
      items.filter((i) => i.id != null).map((i) => i.id as string),
    );

    // Fetch current non-deleted conditions to identify rows to soft-delete
    const existingConditions = await prisma.medicalCondition.findMany({
      where: { clientUserId: client.id, deletedAt: null },
      select: { id: true },
    });

    const idsToDelete = existingConditions
      .map((c) => c.id)
      .filter((id) => !incomingIds.has(id));

    let savedCount = 0;
    let deletedCount = 0;

    await prisma.$transaction(async (tx) => {
      // ── 1. Soft-delete removed rows ────────────────────────────────────────
      for (const id of idsToDelete) {
        await tx.medicalCondition.update({
          where: { id },
          data: { deletedAt: now },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: client.id,
            action: "DELETE",
            entityType: "MedicalCondition",
            entityId: id,
            ipAddress,
            userAgent,
            metadata: { reason: "removed_from_list" },
          },
        });

        deletedCount++;
      }

      // ── 2. Update existing rows / Create new rows ──────────────────────────
      for (const item of items) {
        if (item.id) {
          // Update — verify ownership before updating to prevent cross-user writes
          const existing = await tx.medicalCondition.findUnique({
            where: { id: item.id },
            select: { id: true, clientUserId: true },
          });

          if (!existing) {
            throw new NotFoundError(
              "MEDICAL_CONDITION_NOT_FOUND",
              "Una de las condiciones médicas no existe.",
            );
          }

          if (existing.clientUserId !== client.id) {
            throw new ForbiddenError(
              "FORBIDDEN",
              "No podés modificar condiciones médicas de otro cliente.",
            );
          }

          await tx.medicalCondition.update({
            where: { id: item.id },
            data: {
              kind: item.kind,
              label: item.label,
              detail: item.detail ?? null,
              severity: item.severity ?? null,
              startedAt: item.startedAt ?? null,
              isActive: item.isActive,
              deletedAt: null, // un-delete if it was soft-deleted
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: client.id,
              action: "UPDATE",
              entityType: "MedicalCondition",
              entityId: item.id,
              ipAddress,
              userAgent,
              metadata: { kind: item.kind, label: item.label },
            },
          });
        } else {
          // Create
          const created = await tx.medicalCondition.create({
            data: {
              clientUserId: client.id,
              kind: item.kind,
              label: item.label,
              detail: item.detail ?? null,
              severity: item.severity ?? null,
              startedAt: item.startedAt ?? null,
              isActive: item.isActive,
            },
            select: { id: true },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: client.id,
              action: "CREATE",
              entityType: "MedicalCondition",
              entityId: created.id,
              ipAddress,
              userAgent,
              metadata: { kind: item.kind, label: item.label },
            },
          });
        }

        savedCount++;
      }

      // ── 3. Update review timestamp on ClientProfile ────────────────────────
      await tx.clientProfile.update({
        where: { userId: client.id },
        data: { medicalConditionsReviewedAt: now },
      });
    });

    logInfo("medicalConditions.saved", {
      clientUserId: client.id,
      savedCount,
      deletedCount,
    });

    return { saved: savedCount, deleted: deletedCount };
  });
}

// =============================================================================
// markMedicalPromptShown
// =============================================================================

/**
 * Set ClientProfile.medicalPromptShownAt = now() for the authenticated client.
 * Idempotent — does nothing if the timestamp is already set.
 * Writes an optional audit log entry on first call.
 */
export async function markMedicalPromptShown(): Promise<
  ActionResult<{ marked: boolean }>
> {
  return tryCatch(async () => {
    const client = await requireClient();

    const profile = client.clientProfile;

    // Already marked — idempotent, return without a DB write
    if (profile.medicalPromptShownAt !== null) {
      return { marked: false };
    }

    const now = new Date();
    const { ipAddress, userAgent } = await getRequestMeta();

    await prisma.$transaction(async (tx) => {
      await tx.clientProfile.update({
        where: { userId: client.id },
        data: { medicalPromptShownAt: now },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: client.id,
          action: "UPDATE",
          entityType: "ClientProfile",
          entityId: profile.id,
          ipAddress,
          userAgent,
          metadata: { field: "medicalPromptShownAt" },
        },
      });
    });

    logInfo("medicalConditions.promptMarkedShown", { clientUserId: client.id });

    return { marked: true };
  });
}

// =============================================================================
// needsMedicalPrompt
// =============================================================================

/**
 * Return whether the medical conditions prompt should be shown to the
 * authenticated client and include their current PAR-Q status.
 *
 * shouldShow is true when ClientProfile.medicalPromptShownAt is null
 * (the client has never dismissed/seen the prompt).
 */
export async function needsMedicalPrompt(): Promise<
  ActionResult<{ shouldShow: boolean; parqStatus: ParqStatus }>
> {
  return tryCatch(async () => {
    const client = await requireClient();

    const profile = client.clientProfile;

    const shouldShow = profile.medicalPromptShownAt === null;

    return {
      shouldShow,
      parqStatus: profile.parqStatus,
    };
  });
}
