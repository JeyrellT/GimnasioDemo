"use server";

// =============================================================================
// VIZION — Consent Server Actions
// Owner: backend-api.
//
// Ley 8968 (LPDP) requires granular, versioned, revocable consents for:
//   TERMS_AND_PRIVACY, HEALTH_DATA, AI_PROCESSING, MARKETING
//
// Design:
//   - Upsert semantics: granting an existing consent updates it in place.
//   - All mutations create an AuditLog entry (CONSENT_GRANT / CONSENT_REVOKE).
//   - IP and User-Agent are captured from the request for legal traceability.
//   - grantMultipleConsents runs all upserts in a single DB transaction.
//   - TERMS_AND_PRIVACY and HEALTH_DATA are mandatory at onboarding (validated
//     by grantMultipleConsentsSchema at the boundary).
// =============================================================================

import { headers } from "next/headers";

import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { tryCatch } from "@/lib/result";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { logInfo } from "@/lib/logger";

import {
  grantConsentSchema,
  revokeConsentSchema,
  grantMultipleConsentsSchema,
} from "@/lib/validation/consent.schema";

import type { ActionResult } from "@/types/api";
import type { ConsentItem } from "@/types/api";
import type { ConsentType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Extract IP and User-Agent from the current request for legal audit. */
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

/** Map a Prisma Consent row to the ConsentItem API shape. */
function toConsentItem(row: {
  type: ConsentType;
  granted: boolean;
  version: string;
  grantedAt: Date | null;
  revokedAt: Date | null;
}): ConsentItem {
  return {
    type: row.type,
    granted: row.granted,
    version: row.version,
    grantedAt: row.grantedAt,
    revokedAt: row.revokedAt,
  };
}

// =============================================================================
// grantConsent
// =============================================================================

/**
 * Grant (or re-grant) a single consent type.
 * Upserts the Consent row: sets granted=true, grantedAt=now, revokedAt=null.
 */
export async function grantConsent(
  formData: FormData,
): Promise<ActionResult<ConsentItem>> {
  return tryCatch(async () => {
    const user = await requireUser();

    const parsed = grantConsentSchema.safeParse({
      type: formData.get("type"),
      version: formData.get("version"),
    });

    if (!parsed.success) {
      throw new ValidationError(
        "CONSENT_GRANT_INPUT",
        parsed.error.issues[0]?.message ?? "Datos de consentimiento inválidos",
        parsed.error,
      );
    }

    const { type, version } = parsed.data;
    const { ipAddress, userAgent } = await getRequestMeta();
    const now = new Date();

    const consent = await prisma.$transaction(async (tx) => {
      // Find existing consent record for this user+type (if any)
      const existing = await tx.consent.findFirst({
        where: { userId: user.id, type, deletedAt: null },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      });

      let row;

      if (existing) {
        row = await tx.consent.update({
          where: { id: existing.id },
          data: {
            granted: true,
            version,
            grantedAt: now,
            revokedAt: null,
            ipAddress,
            userAgent,
          },
          select: {
            type: true,
            granted: true,
            version: true,
            grantedAt: true,
            revokedAt: true,
          },
        });
      } else {
        row = await tx.consent.create({
          data: {
            userId: user.id,
            type,
            granted: true,
            version,
            grantedAt: now,
            revokedAt: null,
            ipAddress,
            userAgent,
          },
          select: {
            type: true,
            granted: true,
            version: true,
            grantedAt: true,
            revokedAt: true,
          },
        });
      }

      // Audit — CONSENT_GRANT
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "CONSENT_GRANT",
          entityType: "Consent",
          entityId: `${user.id}:${type}`,
          ipAddress,
          userAgent,
          metadata: { type, version },
        },
      });

      return row;
    });

    logInfo("consent.granted", { userId: user.id, type });

    return toConsentItem(consent);
  });
}

// =============================================================================
// revokeConsent
// =============================================================================

/**
 * Revoke a previously granted consent.
 * Sets granted=false, revokedAt=now.
 * Does NOT hard-delete — the record is kept for legal audit trail.
 */
export async function revokeConsent(
  formData: FormData,
): Promise<ActionResult<ConsentItem>> {
  return tryCatch(async () => {
    const user = await requireUser();

    const parsed = revokeConsentSchema.safeParse({
      type: formData.get("type"),
    });

    if (!parsed.success) {
      throw new ValidationError(
        "CONSENT_REVOKE_INPUT",
        parsed.error.issues[0]?.message ?? "Tipo de consentimiento inválido",
        parsed.error,
      );
    }

    const { type } = parsed.data;
    const { ipAddress, userAgent } = await getRequestMeta();
    const now = new Date();

    // Find the most recent consent record for this type
    const existing = await prisma.consent.findFirst({
      where: { userId: user.id, type, deletedAt: null },
      select: { id: true, granted: true, version: true },
      orderBy: { createdAt: "desc" },
    });

    if (!existing) {
      throw new NotFoundError(
        "CONSENT_NOT_FOUND",
        "No se encontró el consentimiento a revocar.",
      );
    }

    const consent = await prisma.$transaction(async (tx) => {
      const row = await tx.consent.update({
        where: { id: existing.id },
        data: {
          granted: false,
          revokedAt: now,
          ipAddress,
          userAgent,
        },
        select: {
          type: true,
          granted: true,
          version: true,
          grantedAt: true,
          revokedAt: true,
        },
      });

      // Audit — CONSENT_REVOKE
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "CONSENT_REVOKE",
          entityType: "Consent",
          entityId: `${user.id}:${type}`,
          ipAddress,
          userAgent,
          metadata: { type, version: existing.version },
        },
      });

      return row;
    });

    logInfo("consent.revoked", { userId: user.id, type });

    return toConsentItem(consent);
  });
}

// =============================================================================
// getMyConsents
// =============================================================================

/**
 * Return all consent records for the authenticated user.
 * One row per ConsentType (the most recent upserted record).
 */
export async function getMyConsents(): Promise<ActionResult<ConsentItem[]>> {
  return tryCatch(async () => {
    const user = await requireUser();

    // Fetch all consent records for this user, dedup by type (latest per type)
    const rows = await prisma.consent.findMany({
      where: { userId: user.id, deletedAt: null },
      select: {
        type: true,
        granted: true,
        version: true,
        grantedAt: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Deduplicate: keep only the most recent row per type
    const seen = new Set<ConsentType>();
    const unique: typeof rows = [];
    for (const row of rows) {
      if (!seen.has(row.type)) {
        seen.add(row.type);
        unique.push(row);
      }
    }

    logInfo("consents.fetched", { userId: user.id, count: unique.length });

    return unique.map(toConsentItem);
  });
}

// =============================================================================
// grantMultipleConsents
// =============================================================================

/**
 * Batch-grant consents in a single DB transaction.
 * Used during onboarding where the user accepts multiple consents at once.
 *
 * Validation enforces that TERMS_AND_PRIVACY and HEALTH_DATA must be granted=true.
 * MARKETING can be granted or not (optional).
 *
 * Expects formData to contain a JSON-encoded array under the key "consents":
 *   [{ type: "TERMS_AND_PRIVACY", version: "1.0", granted: true }, ...]
 */
export async function grantMultipleConsents(
  formData: FormData,
): Promise<ActionResult<ConsentItem[]>> {
  return tryCatch(async () => {
    const user = await requireUser();

    // Parse the JSON-encoded consents array from formData
    const rawConsents = formData.get("consents");
    if (typeof rawConsents !== "string") {
      throw new ValidationError(
        "BATCH_CONSENT_INPUT",
        "Se requiere un array de consentimientos.",
      );
    }

    let consentsRaw: unknown;
    try {
      consentsRaw = JSON.parse(rawConsents);
    } catch {
      throw new ValidationError(
        "BATCH_CONSENT_JSON",
        "El formato de los consentimientos es inválido.",
      );
    }

    const parsed = grantMultipleConsentsSchema.safeParse({ consents: consentsRaw });
    if (!parsed.success) {
      throw new ValidationError(
        "BATCH_CONSENT_VALIDATION",
        parsed.error.issues[0]?.message ??
          "Los consentimientos enviados son inválidos.",
        parsed.error,
      );
    }

    const { consents } = parsed.data;
    const { ipAddress, userAgent } = await getRequestMeta();
    const now = new Date();

    const results = await prisma.$transaction(async (tx) => {
      const updated: ConsentItem[] = [];

      for (const item of consents) {
        // Upsert: find latest record for this type and update, or create
        const existing = await tx.consent.findFirst({
          where: { userId: user.id, type: item.type, deletedAt: null },
          select: { id: true },
          orderBy: { createdAt: "desc" },
        });

        let row;

        if (existing) {
          row = await tx.consent.update({
            where: { id: existing.id },
            data: {
              granted: item.granted,
              version: item.version,
              grantedAt: item.granted ? now : null,
              revokedAt: !item.granted ? now : null,
              ipAddress,
              userAgent,
            },
            select: {
              type: true,
              granted: true,
              version: true,
              grantedAt: true,
              revokedAt: true,
            },
          });
        } else {
          row = await tx.consent.create({
            data: {
              userId: user.id,
              type: item.type,
              granted: item.granted,
              version: item.version,
              grantedAt: item.granted ? now : null,
              revokedAt: !item.granted ? now : null,
              ipAddress,
              userAgent,
            },
            select: {
              type: true,
              granted: true,
              version: true,
              grantedAt: true,
              revokedAt: true,
            },
          });
        }

        updated.push(toConsentItem(row));

        // Audit each consent action individually for traceability
        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: item.granted ? "CONSENT_GRANT" : "CONSENT_REVOKE",
            entityType: "Consent",
            entityId: `${user.id}:${item.type}`,
            ipAddress,
            userAgent,
            metadata: { type: item.type, version: item.version, batch: true },
          },
        });
      }

      return updated;
    });

    logInfo("consents.batch_granted", {
      userId: user.id,
      count: results.length,
    });

    return results;
  });
}

// =============================================================================
// Alias export (used by onboarding flow)
// =============================================================================

/** Alias for grantMultipleConsents — used by the onboarding wizard. */
export const submitConsents = grantMultipleConsents;
