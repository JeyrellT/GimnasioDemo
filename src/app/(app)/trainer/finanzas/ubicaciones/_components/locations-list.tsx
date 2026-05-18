"use client";

// =============================================================================
// BLACKLINE FITNESS — LocationsList
// Grid of location cards with edit + delete (Dialog confirm). Client Component.
// =============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Loader2, Plus, MapPin, Car } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { LocationForm } from "./location-form";
import { deleteLocation } from "@/app/actions/finance";
import type { TrainerLocationDTO } from "@/types/finance";

// ── Helpers ───────────────────────────────────────────────────────────────────

const KIND_LABELS: Record<string, string> = {
  GYM:         "Blackline Fitness",
  STUDIO:      "Estudio",
  CLIENT_HOME: "Casa del cliente",
  OUTDOOR:     "Exteriores",
  HOME:        "Mi casa",
  OTHER:       "Otro",
};

function formatCRC(n: number): string {
  return new Intl.NumberFormat("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function costSummary(loc: TrainerLocationDTO): string {
  if (loc.costModel === "FLAT" && loc.costPerVisitCRC) {
    return `₡${formatCRC(loc.costPerVisitCRC)} / visita`;
  }
  if (loc.costModel === "PER_KM" && loc.costPerKmCRC) {
    return `₡${formatCRC(loc.costPerKmCRC)} / km`;
  }
  if (loc.costModel === "HYBRID") {
    const parts: string[] = [];
    if (loc.costPerVisitCRC) parts.push(`₡${formatCRC(loc.costPerVisitCRC)} visita`);
    if (loc.costPerKmCRC) parts.push(`₡${formatCRC(loc.costPerKmCRC)}/km`);
    return parts.join(" + ");
  }
  return "Sin costo definido";
}

// ── Location card ─────────────────────────────────────────────────────────────

function LocationCard({
  location,
  onEdit,
  onDelete,
}: {
  location: TrainerLocationDTO;
  onEdit: (loc: TrainerLocationDTO) => void;
  onDelete: (loc: TrainerLocationDTO) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-4 flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#FAFAFA] text-sm truncate">{location.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-[#71717A] rounded-full bg-[#27272A] px-2 py-0.5">
              {KIND_LABELS[location.kind] ?? location.kind}
            </span>
            {location.address && (
              <span className="text-[11px] text-[#52525B] flex items-center gap-0.5">
                <MapPin className="h-2.5 w-2.5" aria-hidden="true" />
                {location.address}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(location)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#52525B] hover:text-[#A1A1AA] hover:bg-[#27272A] transition-colors"
            aria-label={`Editar ${location.name}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(location)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#52525B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
            aria-label={`Eliminar ${location.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Cost + stats row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-[#FF6A1A]">
          <Car className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold">{costSummary(location)}</span>
        </div>
        <div className="ml-auto flex items-center gap-3 text-[11px] text-[#71717A]">
          <span>{location.visitCount} {location.visitCount === 1 ? "visita" : "visitas"}</span>
          {location.totalSpentCRC > 0 && (
            <span className="text-[#A1A1AA]">₡{formatCRC(location.totalSpentCRC)} total</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface LocationsListProps {
  locations: TrainerLocationDTO[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LocationsList({ locations: initial }: LocationsListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TrainerLocationDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrainerLocationDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(loc: TrainerLocationDTO) {
    setEditTarget(loc);
    setFormOpen(true);
  }

  function handleFormSuccess() {
    setFormOpen(false);
    setEditTarget(null);
    startTransition(() => router.refresh());
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteLocation(deleteTarget.id);
    setDeleting(false);

    if (!result.ok) {
      toast.error(result.error.message ?? "No se pudo eliminar la ubicación.");
      return;
    }

    toast.success(`"${deleteTarget.name}" eliminada.`);
    setDeleteTarget(null);
    startTransition(() => router.refresh());
  }

  return (
    <>
      {/* Add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#71717A]">
          {initial.length === 0
            ? "Sin ubicaciones registradas"
            : `${initial.length} ${initial.length === 1 ? "ubicación" : "ubicaciones"}`}
        </p>
        <Button
          type="button"
          onClick={openCreate}
          className="gap-2 bg-[#FF6A1A] hover:bg-[#E55A0E] text-white text-sm h-9"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nueva ubicación
        </Button>
      </div>

      {/* Grid */}
      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#3F3F46] bg-[#18181B]/50 py-12 text-center">
          <MapPin className="mx-auto mb-3 h-8 w-8 text-[#3F3F46]" aria-hidden="true" />
          <p className="text-sm text-[#52525B]">Agregá tu primera ubicación para comenzar a registrar costos de visita.</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 text-sm font-semibold text-[#FF6A1A] hover:underline underline-offset-2"
          >
            Crear ubicación
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {initial.map((loc) => (
              <LocationCard
                key={loc.id}
                location={loc}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) { setFormOpen(false); setEditTarget(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar ubicación" : "Nueva ubicación"}</DialogTitle>
            <DialogDescription className="text-[#71717A] text-sm">
              {editTarget
                ? "Modificá los datos de esta ubicación."
                : "Registrá un lugar donde entrenás para llevar control de costos de visita."}
            </DialogDescription>
          </DialogHeader>
          <LocationForm
            initial={editTarget ?? undefined}
            onSuccess={handleFormSuccess}
            onCancel={() => { setFormOpen(false); setEditTarget(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar ubicación</DialogTitle>
            <DialogDescription className="text-[#71717A] text-sm">
              ¿Eliminar <span className="font-semibold text-[#FAFAFA]">"{deleteTarget?.name}"</span>?
              Las visitas registradas quedarán en los gastos del historial.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="border-[#3F3F46] text-[#A1A1AA] hover:border-[#FF6A1A]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
