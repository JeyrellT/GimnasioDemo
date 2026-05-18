"use client";

// =============================================================================
// BLACKLINE FITNESS — FinanceFABLoader
// Client component. Lazily fetches locations + clients when the FAB menu is
// first opened. Shows spinner on the FAB while loading, then renders FinanceFAB.
// =============================================================================

import { useState, useCallback } from "react";
import { Plus, Loader2 } from "lucide-react";
import { FinanceFAB, type FinanceFABProps } from "./finance-fab";
import { listLocations } from "@/app/actions/finance";
import { listMyClients } from "@/app/actions/clients";
import type { VisitLocation } from "./visit-form";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: FinanceFABProps };

export function FinanceFABLoader() {
  const [state, setState] = useState<LoadState>({ status: "idle" });

  const load = useCallback(async () => {
    if (state.status !== "idle") return;
    setState({ status: "loading" });

    const [locResult, clientResult] = await Promise.all([
      listLocations(),
      listMyClients(),
    ]);

    const rawLocations = locResult.ok ? locResult.value.locations : [];
    const rawClients = clientResult.ok ? clientResult.value.clients : [];

    const locations: Array<{ id: string; name: string }> = rawLocations.map((l) => ({
      id: l.id,
      name: l.name,
    }));

    const visitLocations: VisitLocation[] = rawLocations.map((l) => ({
      id: l.id,
      name: l.name,
      costModel: l.costModel,
      costPerVisitCRC: l.costPerVisitCRC,
      costPerKmCRC: l.costPerKmCRC,
      defaultKm: l.defaultKm,
    }));

    const clients: Array<{ id: string; name: string }> = rawClients.map((c) => ({
      id: c.id,
      name: c.name,
    }));

    setState({ status: "ready", data: { locations, visitLocations, clients } });
  }, [state.status]);

  // Not yet loaded: show stub FAB that triggers load on first tap
  if (state.status === "idle") {
    return (
      <button
        type="button"
        onClick={load}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6A1A] text-white shadow-lg shadow-[#FF6A1A]/40 hover:bg-[#E55A0E] active:scale-95 transition-colors sm:hidden"
        aria-label="Abrir menú de acciones financieras"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6A1A] text-white shadow-lg shadow-[#FF6A1A]/40 sm:hidden">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando..." />
      </div>
    );
  }

  // Loaded: hand off to the real FAB with all data
  return <FinanceFAB {...state.data} />;
}
