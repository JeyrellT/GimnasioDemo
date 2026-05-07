// DEMO MODE — consent actions are no-ops in the static demo.
// "use server" removed: no server runtime in static export.

import { ok } from "@/lib/result";
import type { ActionResult, ConsentItem } from "@/types/api";

const DEMO_CONSENTS: ConsentItem[] = [];

export async function grantConsent(_raw: unknown): Promise<ActionResult<ConsentItem>> {
  return ok({
    type: "TERMS_AND_PRIVACY",
    granted: true,
    version: "1.0",
    grantedAt: new Date(),
    revokedAt: null,
  });
}

export async function revokeConsent(_raw: unknown): Promise<ActionResult<ConsentItem>> {
  return ok({
    type: "TERMS_AND_PRIVACY",
    granted: false,
    version: "1.0",
    grantedAt: new Date(),
    revokedAt: new Date(),
  });
}

export async function getMyConsents(): Promise<ActionResult<ConsentItem[]>> {
  return ok(DEMO_CONSENTS);
}

export async function grantMultipleConsents(_raw: unknown): Promise<ActionResult<ConsentItem[]>> {
  return ok(DEMO_CONSENTS);
}

// Alias used by onboarding consent pages
export const submitConsents = grantMultipleConsents;
