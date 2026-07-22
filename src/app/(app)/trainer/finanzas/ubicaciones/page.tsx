"use client";

// =============================================================================
// BLACKLINE FITNESS — /trainer/finanzas/ubicaciones
// Fetches trainer's locations + renders LocationsList (client).
// =============================================================================

import * as React from "react";
import { MapPin } from "lucide-react";
import { listLocations } from "@/app/actions/finance";
import type { TrainerLocationDTO } from "@/types/finance";
import { LocationsList } from "./_components/locations-list";

function LocationsSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-[#18181B]" />
      ))}
    </div>
  );
}

export default function UbicacionesPage() {
  const [locations, setLocations] = React.useState<TrainerLocationDTO[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    listLocations().then((result) => {
      if (result.ok) setLocations(result.value.locations as unknown as TrainerLocationDTO[]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/15">
          <MapPin className="h-5 w-5 text-brand-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#FAFAFA] leading-tight">Ubicaciones</h1>
          <p className="text-xs text-[#71717A]">Lugares donde entrenás y su costo de visita</p>
        </div>
      </div>

      {/* List + actions */}
      {loading ? <LocationsSkeleton /> : <LocationsList locations={locations} />}
    </div>
  );
}
