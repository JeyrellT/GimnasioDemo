"use client";

// =============================================================================
// SUPER_ADMIN — LicenseControl
// Unified license-lifecycle UI: activar / desactivar / cambiar plan / extender.
// Two layouts via `mode`:
//   - "row"   : compact button cluster for table rows
//   - "panel" : full card for the user detail page (includes create-if-missing)
// =============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Power,
  PowerOff,
  Pencil,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  activateSubscription,
  deactivateSubscription,
  changeSubscriptionPlan,
  extendSubscriptionPeriod,
} from "@/server/actions/admin.actions";
import type { SubscriptionStatus, SubscriptionTier } from "@prisma/client";

interface LicenseControlProps {
  /** Subscription id; null when the trainer doesn't yet have one. */
  subscriptionId: string | null;
  /** Trainer user id — required for activateSubscription (which can create). */
  trainerUserId: string;
  /** Current status; null when no subscription exists. */
  status: SubscriptionStatus | null;
  /** Current plan tier; null when no subscription exists. */
  planTier: SubscriptionTier | null;
  /** Layout mode. */
  mode: "row" | "panel";
}

type ModalType =
  | "activate"
  | "deactivate"
  | "change-plan"
  | "extend"
  | null;

const PLAN_LABELS: Record<SubscriptionTier, string> = {
  SOLO: "Solo",
  PRO: "Pro",
  STUDIO: "Studio",
};

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: "Activa",
  TRIAL: "Trial",
  PAST_DUE: "Vencida",
  CANCELLED: "Cancelada",
  READ_ONLY: "Solo lectura",
};

export function LicenseControl({
  subscriptionId,
  trainerUserId,
  status,
  planTier,
  mode,
}: LicenseControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<ModalType>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Activate form state
  const [activatePlan, setActivatePlan] = useState<SubscriptionTier>(
    planTier ?? "SOLO",
  );
  const [activateMonths, setActivateMonths] = useState(1);
  const [activateReason, setActivateReason] = useState("");

  // Deactivate form state
  const [deactivateMode, setDeactivateMode] = useState<"READ_ONLY" | "CANCELLED">(
    "READ_ONLY",
  );
  const [deactivateReason, setDeactivateReason] = useState("");

  // Change plan form state
  const [changeTier, setChangeTier] = useState<SubscriptionTier>(
    planTier === "PRO" ? "STUDIO" : "PRO",
  );
  const [changeReason, setChangeReason] = useState("");

  // Extend form state
  const [extendDays, setExtendDays] = useState(30);

  const hasSubscription = subscriptionId !== null && status !== null;
  const canActivate =
    !hasSubscription ||
    status === "CANCELLED" ||
    status === "READ_ONLY" ||
    status === "TRIAL" ||
    status === "PAST_DUE";
  const canDeactivate =
    hasSubscription && (status === "ACTIVE" || status === "TRIAL");
  const canChangePlan = hasSubscription && status !== "CANCELLED";
  const canExtend = hasSubscription;

  function openModal(m: ModalType) {
    setFieldError(null);
    setModal(m);
  }
  function closeModal() {
    setFieldError(null);
    setModal(null);
  }

  // ── Activate ────────────────────────────────────────────────────────────

  const handleActivate = () => {
    setFieldError(null);
    if (!activateReason.trim() || activateReason.trim().length < 5) {
      setFieldError("El motivo debe tener al menos 5 caracteres.");
      return;
    }
    if (activateMonths < 1 || activateMonths > 36) {
      setFieldError("La duración debe estar entre 1 y 36 meses.");
      return;
    }
    startTransition(async () => {
      const result = await activateSubscription({
        trainerUserId,
        planTier: activatePlan,
        durationMonths: activateMonths,
        reason: activateReason.trim(),
      });
      if (result.ok) {
        toast.success(
          `Licencia activada (${PLAN_LABELS[activatePlan]} · ${activateMonths} mes${activateMonths !== 1 ? "es" : ""}).`,
        );
        closeModal();
        setActivateReason("");
        router.refresh();
      } else {
        setFieldError(result.error.message);
      }
    });
  };

  // ── Deactivate ──────────────────────────────────────────────────────────

  const handleDeactivate = () => {
    setFieldError(null);
    if (!subscriptionId) return;
    if (!deactivateReason.trim() || deactivateReason.trim().length < 5) {
      setFieldError("El motivo debe tener al menos 5 caracteres.");
      return;
    }
    if (
      deactivateMode === "CANCELLED" &&
      !confirm(
        "¿Confirmás la cancelación? El trainer pierde acceso de escritura inmediatamente.",
      )
    )
      return;
    startTransition(async () => {
      const result = await deactivateSubscription({
        subscriptionId,
        mode: deactivateMode,
        reason: deactivateReason.trim(),
      });
      if (result.ok) {
        toast.success(
          deactivateMode === "READ_ONLY"
            ? "Licencia pasada a solo lectura."
            : "Licencia cancelada.",
        );
        closeModal();
        setDeactivateReason("");
        router.refresh();
      } else {
        setFieldError(result.error.message);
      }
    });
  };

  // ── Change plan ─────────────────────────────────────────────────────────

  const handleChangePlan = () => {
    setFieldError(null);
    if (!subscriptionId) return;
    if (!changeReason.trim() || changeReason.trim().length < 5) {
      setFieldError("El motivo debe tener al menos 5 caracteres.");
      return;
    }
    if (changeTier === planTier) {
      setFieldError("Elegí un plan distinto al actual.");
      return;
    }
    startTransition(async () => {
      const result = await changeSubscriptionPlan({
        subscriptionId,
        newTier: changeTier,
        reason: changeReason.trim(),
      });
      if (result.ok) {
        toast.success(`Plan cambiado a ${PLAN_LABELS[changeTier]}.`);
        closeModal();
        setChangeReason("");
        router.refresh();
      } else {
        setFieldError(result.error.message);
      }
    });
  };

  // ── Extend ──────────────────────────────────────────────────────────────

  const handleExtend = () => {
    setFieldError(null);
    if (!subscriptionId) return;
    if (extendDays < 1 || extendDays > 365) {
      setFieldError("Los días deben estar entre 1 y 365.");
      return;
    }
    startTransition(async () => {
      const result = await extendSubscriptionPeriod({
        subscriptionId,
        days: extendDays,
      });
      if (result.ok) {
        toast.success(`Período extendido ${extendDays} días.`);
        closeModal();
        router.refresh();
      } else {
        setFieldError(result.error.message);
      }
    });
  };

  // ── Button styles ───────────────────────────────────────────────────────

  const btnBase =
    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 min-h-[36px]";
  const btnPrimary = `${btnBase} border border-[#22C55E]/30 bg-[#22C55E]/5 text-[#22C55E] hover:bg-[#22C55E]/10`;
  const btnDanger = `${btnBase} border border-[#EF4444]/30 bg-[#EF4444]/5 text-[#EF4444] hover:bg-[#EF4444]/10`;
  const btnNeutral = `${btnBase} border border-[#3F3F46] bg-[#27272A]/50 text-[#A1A1AA] hover:bg-[#3F3F46] hover:text-[#FAFAFA]`;

  // ── Render ──────────────────────────────────────────────────────────────

  const buttons = (
    <>
      {canActivate && (
        <button
          type="button"
          onClick={() => openModal("activate")}
          disabled={isPending}
          title={hasSubscription ? "Reactivar licencia" : "Activar licencia"}
          className={btnPrimary}
        >
          {isPending && modal === "activate" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Power className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {hasSubscription ? "Reactivar" : "Activar"}
        </button>
      )}

      {canChangePlan && (
        <button
          type="button"
          onClick={() => openModal("change-plan")}
          disabled={isPending}
          title="Cambiar plan"
          className={btnNeutral}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Cambiar plan
        </button>
      )}

      {canExtend && (
        <button
          type="button"
          onClick={() => openModal("extend")}
          disabled={isPending}
          title="Extender período"
          className={btnNeutral}
        >
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Extender
        </button>
      )}

      {canDeactivate && (
        <button
          type="button"
          onClick={() => openModal("deactivate")}
          disabled={isPending}
          title="Desactivar licencia"
          className={btnDanger}
        >
          <PowerOff className="h-3.5 w-3.5" aria-hidden="true" />
          Desactivar
        </button>
      )}
    </>
  );

  return (
    <>
      {mode === "row" ? (
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          {buttons}
        </div>
      ) : (
        <section className="rounded-xl border border-[#3F3F46]/60 bg-[#18181B] p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A] mb-3">
            Control de licencia
          </h2>
          {hasSubscription ? (
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#71717A]">Plan</span>
                <span className="font-medium text-[#FAFAFA]">
                  {planTier ? PLAN_LABELS[planTier] : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#71717A]">Estado</span>
                <span className="font-medium text-[#FAFAFA]">
                  {status ? STATUS_LABELS[status] : "—"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#71717A] mb-4">
              Este trainer no tiene licencia. Activá una para que pueda usar la
              plataforma.
            </p>
          )}
          <div className="flex flex-col gap-2">{buttons}</div>
        </section>
      )}

      {/* ── Activate modal ─────────────────────────────────────────────── */}
      <Dialog
        open={modal === "activate"}
        onOpenChange={(open) => !open && closeModal()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hasSubscription ? "Reactivar licencia" : "Activar licencia"}
            </DialogTitle>
            <DialogDescription>
              {hasSubscription
                ? "Reactiva la suscripción. El período se reinicia y el estado pasa a ACTIVE."
                : "Crea una suscripción ACTIVE para este trainer. El período empieza ahora."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-widest block mb-1.5">
                Plan
              </label>
              <select
                value={activatePlan}
                onChange={(e) =>
                  setActivatePlan(e.target.value as SubscriptionTier)
                }
                className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A]"
              >
                <option value="SOLO">Solo</option>
                <option value="PRO">Pro</option>
                <option value="STUDIO">Studio</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-widest block mb-1.5">
                Duración (meses, 1–36)
              </label>
              <input
                type="number"
                min={1}
                max={36}
                value={activateMonths}
                onChange={(e) =>
                  setActivateMonths(parseInt(e.target.value, 10) || 1)
                }
                className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-widest block mb-1.5">
                Motivo
              </label>
              <textarea
                value={activateReason}
                onChange={(e) => setActivateReason(e.target.value)}
                placeholder="Pago manual, compensación, alta de prueba interna..."
                rows={2}
                className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A] resize-none"
              />
            </div>

            {fieldError && (
              <p className="text-xs text-[#EF4444]">{fieldError}</p>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-[#3F3F46] px-4 py-2 text-sm text-[#A1A1AA] hover:bg-[#27272A] transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleActivate}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16A34A] transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Activar licencia
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Deactivate modal ───────────────────────────────────────────── */}
      <Dialog
        open={modal === "deactivate"}
        onOpenChange={(open) => !open && closeModal()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar licencia</DialogTitle>
            <DialogDescription>
              Elegí cómo desactivar. Solo lectura es reversible; cancelación
              cierra el ciclo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <label className="flex items-start gap-3 rounded-lg border border-[#3F3F46] bg-[#27272A]/50 p-3 cursor-pointer hover:bg-[#27272A]">
                <input
                  type="radio"
                  name="deactivate-mode"
                  value="READ_ONLY"
                  checked={deactivateMode === "READ_ONLY"}
                  onChange={() => setDeactivateMode("READ_ONLY")}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#FAFAFA]">
                    Solo lectura
                  </p>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    El trainer puede ver sus datos pero no crear ni editar.
                    Reversible reactivando.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-[#3F3F46] bg-[#27272A]/50 p-3 cursor-pointer hover:bg-[#27272A]">
                <input
                  type="radio"
                  name="deactivate-mode"
                  value="CANCELLED"
                  checked={deactivateMode === "CANCELLED"}
                  onChange={() => setDeactivateMode("CANCELLED")}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#FAFAFA]">
                    Cancelar
                  </p>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Cierra la suscripción. Queda en historial como CANCELLED.
                    Se puede reactivar después.
                  </p>
                </div>
              </label>
            </div>

            <div>
              <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-widest block mb-1.5">
                Motivo
              </label>
              <textarea
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder="Falta de pago, solicitud del trainer, fraude detectado..."
                rows={2}
                className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A] resize-none"
              />
            </div>

            {fieldError && (
              <p className="text-xs text-[#EF4444]">{fieldError}</p>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-[#3F3F46] px-4 py-2 text-sm text-[#A1A1AA] hover:bg-[#27272A] transition-colors min-h-[44px]"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-semibold text-white hover:bg-[#DC2626] transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              )}
              {deactivateMode === "READ_ONLY"
                ? "Pasar a solo lectura"
                : "Cancelar suscripción"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change plan modal ──────────────────────────────────────────── */}
      <Dialog
        open={modal === "change-plan"}
        onOpenChange={(open) => !open && closeModal()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar plan</DialogTitle>
            <DialogDescription>
              Cambia el tier sin reiniciar el período actual. Plan actual:{" "}
              <strong>{planTier ? PLAN_LABELS[planTier] : "—"}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-widest block mb-1.5">
                Nuevo plan
              </label>
              <select
                value={changeTier}
                onChange={(e) =>
                  setChangeTier(e.target.value as SubscriptionTier)
                }
                className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A]"
              >
                <option value="SOLO">Solo</option>
                <option value="PRO">Pro</option>
                <option value="STUDIO">Studio</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-widest block mb-1.5">
                Motivo
              </label>
              <textarea
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Upgrade tras venta, downgrade solicitado, ajuste comercial..."
                rows={2}
                className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A] resize-none"
              />
            </div>

            {fieldError && (
              <p className="text-xs text-[#EF4444]">{fieldError}</p>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-[#3F3F46] px-4 py-2 text-sm text-[#A1A1AA] hover:bg-[#27272A] transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleChangePlan}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-[#FF6A1A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E55A0E] transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              )}
              Confirmar cambio
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Extend modal ───────────────────────────────────────────────── */}
      <Dialog
        open={modal === "extend"}
        onOpenChange={(open) => !open && closeModal()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extender período</DialogTitle>
            <DialogDescription>
              Suma días al fin del período actual. Si ya venció, se cuenta
              desde hoy.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-widest block">
              Días a extender (1–365)
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={extendDays}
              onChange={(e) => setExtendDays(parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A]"
            />
            {fieldError && (
              <p className="text-xs text-[#EF4444]">{fieldError}</p>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-[#3F3F46] px-4 py-2 text-sm text-[#A1A1AA] hover:bg-[#27272A] transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExtend}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-[#FF6A1A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E55A0E] transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              )}
              Extender {extendDays} día{extendDays !== 1 ? "s" : ""}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
