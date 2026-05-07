// DEMO MODE — billing is not available in demo.
// All actions return a DEMO_MODE error so pages degrade gracefully.
import { err } from "@/lib/result";
import { ValidationError } from "@/lib/errors";
import type { Result } from "@/lib/result";
import type { InvoiceListItem } from "@/types/api";
import type { AppError } from "@/lib/errors";

const demoErr = (_?: unknown) =>
  Promise.resolve(
    err(new ValidationError("DEMO_MODE", "Facturación no disponible en modo demo.")),
  );

export const generateMonthlyCharges = demoErr;
export const markChargePaid = demoErr;
export const generateInvoiceXml = demoErr;
export const getMyTrainerInvoices = (): Promise<Result<InvoiceListItem[], AppError>> =>
  Promise.resolve(err(new ValidationError("DEMO_MODE", "Facturación no disponible en modo demo.")));
export const saveTrainerBillingData = demoErr;
export const saveTrainerPricingDefaults = demoErr;
