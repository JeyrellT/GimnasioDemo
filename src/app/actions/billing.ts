"use server";
// =============================================================================
// BLACKLINE FITNESS — Billing server actions (public surface for UI)
// Owner: frontend-react / backend-api.
//
// Re-exports from the canonical implementation in src/server/actions/billing.actions.ts
// and adds the UI-specific wrappers (saveTrainerBillingData, saveTrainerPricingDefaults,
// markChargePaid, generateInvoiceXml, getMyTrainerInvoices) that the onboarding
// and facturacion pages depend on.
//
// BREAKING CHANGE from demo stub:
//   - All functions now call real Prisma / server actions instead of returning
//     DEMO_MODE errors.
//   - requireTrainer() comes from @/server/guards (real auth), not the demo stub.
// =============================================================================

import { prisma } from "@/server/db";
import { requireTrainer } from "@/server/guards";
import { tryCatch } from "@/lib/result";
import { ValidationError } from "@/lib/errors";
import type { ActionResult } from "@/types/api";
import type { InvoiceListItem } from "@/types/api";

// Async wrappers — Next.js "use server" files require all exports to be async functions.
import {
  createCharge as _createCharge,
  generateMonthlyCharges as _generateMonthlyCharges,
  waiveCharge as _waiveCharge,
  cancelCharge as _cancelCharge,
  listCharges as _listCharges,
  getMySubscription as _getMySubscription,
  listInvoices as _listInvoices,
} from "@/server/actions/billing.actions";
export async function createCharge(...args: Parameters<typeof _createCharge>) {
  return _createCharge(...args);
}
export async function generateMonthlyCharges(...args: Parameters<typeof _generateMonthlyCharges>) {
  return _generateMonthlyCharges(...args);
}
export async function waiveCharge(...args: Parameters<typeof _waiveCharge>) {
  return _waiveCharge(...args);
}
export async function cancelCharge(...args: Parameters<typeof _cancelCharge>) {
  return _cancelCharge(...args);
}
export async function listCharges(...args: Parameters<typeof _listCharges>) {
  return _listCharges(...args);
}
export async function getMySubscription(...args: Parameters<typeof _getMySubscription>) {
  return _getMySubscription(...args);
}
export async function listInvoices(...args: Parameters<typeof _listInvoices>) {
  return _listInvoices(...args);
}

// =============================================================================
// getMyTrainerInvoices
// Convenience wrapper used by /trainer/facturacion page.
// Returns InvoiceListItem[] directly (unwrapped), gracefully returning []
// on error so the Server Component page renders the empty state instead of
// crashing.
// =============================================================================

export async function getMyTrainerInvoices(): Promise<InvoiceListItem[]> {
  const { listInvoices } = await import(
    "@/server/actions/billing.actions"
  );
  const result = await listInvoices();
  if (!result.ok) return [];
  return result.value.invoices;
}

// =============================================================================
// markChargePaid
// Manually mark a PENDING / OVERDUE charge as PAID (trainer-side confirmation).
// Used when payment is received offline (cash, transfer, etc.).
// =============================================================================

export async function markChargePaid(
  chargeId: string,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const charge = await prisma.clientCharge.findUnique({
      where: { id: chargeId },
      select: { id: true, trainerUserId: true, status: true },
    });

    if (!charge) {
      throw new ValidationError("CHARGE_NOT_FOUND", "Cobro no encontrado.");
    }

    if (charge.trainerUserId !== trainer.id) {
      throw new ValidationError(
        "CHARGE_NOT_OWNED",
        "No tenés permiso para modificar este cobro.",
      );
    }

    if (charge.status === "PAID") {
      throw new ValidationError(
        "CHARGE_ALREADY_PAID",
        "El cobro ya está marcado como pagado.",
      );
    }

    if (charge.status === "CANCELLED" || charge.status === "WAIVED") {
      throw new ValidationError(
        "CHARGE_TERMINAL",
        "No se puede marcar como pagado un cobro cancelado o anulado.",
      );
    }

    await prisma.clientCharge.update({
      where: { id: chargeId },
      data: { status: "PAID", paidAt: new Date() },
    });

    return { updated: true };
  });
}

// =============================================================================
// generateInvoiceXml
// Stub for V1.1 — Hacienda XML generation is not wired in MVP.
// Returns a DRAFT invoice record so the UI has something to show.
// The actual XML build + signing lives in src/lib/billing/hacienda-xml.ts.
// =============================================================================

export async function generateInvoiceXml(
  _chargeId: string,
): Promise<ActionResult<{ invoiceId: string; status: "DRAFT" }>> {
  return tryCatch(async () => {
    await requireTrainer();
    // Full Hacienda XML generation (signing + ATV submission) is gated behind
    // BILLING_LIVE flag and not available in MVP. Return a typed result so
    // callers that already handle both arms continue to work.
    throw new ValidationError(
      "BILLING_NOT_LIVE",
      "La generación de facturas electrónicas estará disponible en V1.1.",
    );
  });
}

// =============================================================================
// saveTrainerBillingData
// Persist fiscal identification data collected in the onboarding step.
// Input shape matches the entrenador/facturacion onboarding form.
// =============================================================================

interface BillingDataInput {
  cedulaType: "FISICA" | "JURIDICA";
  cedulaNumber: string;
  haciendaId?: string | "";
  address: string;
}

export async function saveTrainerBillingData(
  data: BillingDataInput,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const fiscalIdType = data.cedulaType === "FISICA" ? "FISICA" : "JURIDICA";

    await prisma.trainerProfile.update({
      where: { userId: trainer.id },
      data: {
        fiscalIdType,
        fiscalIdNumber: data.cedulaNumber.trim(),
        haciendaUsername: data.haciendaId?.trim() || null,
        fiscalAddress: data.address.trim(),
      },
    });

    return { updated: true };
  });
}

// =============================================================================
// saveTrainerPricingDefaults
// Persist the trainer's default monthly client price, collected in onboarding.
// =============================================================================

interface PricingDefaultsInput {
  defaultMonthlyPriceCRC: number;
}

export async function saveTrainerPricingDefaults(
  data: PricingDefaultsInput,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    if (
      !Number.isFinite(data.defaultMonthlyPriceCRC) ||
      data.defaultMonthlyPriceCRC < 0
    ) {
      throw new ValidationError(
        "INVALID_PRICE",
        "El precio mensual debe ser un número mayor o igual a cero.",
      );
    }

    await prisma.trainerProfile.update({
      where: { userId: trainer.id },
      data: {
        defaultMonthlyPriceCRC: data.defaultMonthlyPriceCRC,
      },
    });

    return { updated: true };
  });
}
