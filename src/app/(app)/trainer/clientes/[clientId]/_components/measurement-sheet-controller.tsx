"use client";

// =============================================================================
// FORJA — MeasurementSheetMount
// Owner: frontend-react.
//
// Mounted once per profile page. Reads open/close state from the global
// measurement sheet store and renders the actual sheet. The trigger button
// lives elsewhere (ClientHeroCard) and dispatches via the same store.
// =============================================================================

import * as React from "react";
import { MeasurementSheet } from "@/components/forms/measurement-sheet";
import { useMeasurementSheetStore } from "@/stores/measurement-sheet-store";

interface Props {
  /** Default clientId to use when the trigger doesn't provide one. */
  clientId: string;
}

export function MeasurementSheetController({ clientId }: Props) {
  const isOpen = useMeasurementSheetStore((s) => s.isOpen);
  const storeClientId = useMeasurementSheetStore((s) => s.clientId);
  const setOpen = useMeasurementSheetStore((s) => s.setOpen);

  return (
    <MeasurementSheet
      clientId={storeClientId ?? clientId}
      open={isOpen}
      onOpenChange={setOpen}
    />
  );
}
