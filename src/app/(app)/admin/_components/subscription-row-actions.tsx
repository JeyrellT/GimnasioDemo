"use client";

// =============================================================================
// SUPER_ADMIN — SubscriptionRowActions
// Inline actions per subscription row: extend trial + force cancel.
// =============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Clock, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  extendTrial,
  forceCancelSubscription,
} from "@/server/actions/admin.actions";

interface SubscriptionRowActionsProps {
  subscriptionId: string;
  trainerUserId: string;
  status: string;
}

type ModalType = "extend" | "cancel" | null;

export function SubscriptionRowActions({
  subscriptionId,
  trainerUserId,
  status,
}: SubscriptionRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<ModalType>(null);
  const [days, setDays] = useState(7);
  const [cancelReason, setCancelReason] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const isTrialEligible = status === "TRIAL";
  const isCancelEligible = status !== "CANCELLED";

  // ── Extend trial ────────────────────────────────────────────────────────

  const handleExtendTrial = () => {
    setFieldError(null);
    if (days < 1 || days > 90) {
      setFieldError("Los días deben estar entre 1 y 90.");
      return;
    }
    startTransition(async () => {
      const result = await extendTrial({ trainerUserId, days });
      if (result.ok) {
        toast.success(`Trial extendido ${days} días.`);
        setModal(null);
        router.refresh();
      } else {
        setFieldError(result.error.message);
      }
    });
  };

  // ── Force cancel ─────────────────────────────────────────────────────────

  const handleForceCancel = () => {
    setFieldError(null);
    if (!cancelReason.trim()) {
      setFieldError("El motivo es requerido.");
      return;
    }
    if (
      !confirm(
        "¿Estás seguro de cancelar esta suscripción? Esta acción es irreversible.",
      )
    )
      return;
    startTransition(async () => {
      const result = await forceCancelSubscription({
        subscriptionId,
        reason: cancelReason.trim(),
      });
      if (result.ok) {
        toast.success("Suscripción cancelada.");
        setModal(null);
        setCancelReason("");
        router.refresh();
      } else {
        setFieldError(result.error.message);
      }
    });
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {isTrialEligible && (
          <button
            type="button"
            onClick={() => {
              setDays(7);
              setFieldError(null);
              setModal("extend");
            }}
            disabled={isPending}
            title="Extender trial"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-2.5 py-1.5 text-xs font-medium text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors disabled:opacity-50 min-h-[36px]"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Extender
          </button>
        )}

        {isCancelEligible && (
          <button
            type="button"
            onClick={() => {
              setCancelReason("");
              setFieldError(null);
              setModal("cancel");
            }}
            disabled={isPending}
            title="Cancelar suscripción"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/5 px-2.5 py-1.5 text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors disabled:opacity-50 min-h-[36px]"
          >
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Cancelar
          </button>
        )}
      </div>

      {/* ── Extend trial modal ───────────────────────────────────────────── */}
      <Dialog
        open={modal === "extend"}
        onOpenChange={(open) => !open && setModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extender período de trial</DialogTitle>
            <DialogDescription>
              Indicá cuántos días adicionales querés agregar al trial de este
              trainer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label
              htmlFor="extend-days"
              className="text-xs font-medium text-[#A1A1AA] uppercase tracking-widest"
            >
              Días a extender (1–90)
            </label>
            <input
              id="extend-days"
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A]"
            />
            {fieldError && (
              <p className="text-xs text-[#EF4444]">{fieldError}</p>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setModal(null)}
              className="rounded-lg border border-[#3F3F46] px-4 py-2 text-sm text-[#A1A1AA] hover:bg-[#27272A] transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExtendTrial}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-[#FF6A1A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E55A0E] transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {isPending && (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
              )}
              Extender {days} día{days !== 1 ? "s" : ""}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Force cancel modal ──────────────────────────────────────────── */}
      <Dialog
        open={modal === "cancel"}
        onOpenChange={(open) => !open && setModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar suscripción</DialogTitle>
            <DialogDescription>
              Esta acción cancela la suscripción de inmediato. Indicá el motivo
              para el log de auditoría.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label
              htmlFor="cancel-reason"
              className="text-xs font-medium text-[#A1A1AA] uppercase tracking-widest"
            >
              Motivo
            </label>
            <textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Describí el motivo de la cancelación..."
              rows={3}
              className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A] resize-none"
            />
            {fieldError && (
              <p className="text-xs text-[#EF4444]">{fieldError}</p>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setModal(null)}
              className="rounded-lg border border-[#3F3F46] px-4 py-2 text-sm text-[#A1A1AA] hover:bg-[#27272A] transition-colors min-h-[44px]"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={handleForceCancel}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-semibold text-white hover:bg-[#DC2626] transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {isPending && (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
              )}
              Confirmar cancelación
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
