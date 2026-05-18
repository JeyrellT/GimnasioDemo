"use client";

// =============================================================================
// SUPER_ADMIN — UserActions
// Client component: action buttons for a single user.
// Uses useTransition + toast on every mutation.
// =============================================================================

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Ban, UserCheck, LogIn } from "lucide-react";
import type { UserRole } from "@/types/domain";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  promoteUser,
  suspendUser,
  unsuspendUser,
  startImpersonation,
} from "@/server/actions/admin.actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserActionsProps {
  userId: string;
  currentRole: UserRole;
  isSuspended: boolean;
  subscriptionId?: string;
}

type ModalType = "promote" | "suspend" | null;

const PROMOTABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: "CLIENT", label: "Cliente" },
  { value: "TRAINER", label: "Trainer" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function UserActions({
  userId,
  currentRole,
  isSuspended,
  subscriptionId: _subscriptionId,
}: UserActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<ModalType>(null);
  const [targetRole, setTargetRole] = useState<UserRole>(currentRole as UserRole);
  const [suspendReason, setSuspendReason] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  // ── Promote ──────────────────────────────────────────────────────────────

  const handlePromote = () => {
    setFieldError(null);
    if (targetRole === currentRole) {
      setFieldError("Seleccioná un rol diferente al actual.");
      return;
    }
    startTransition(async () => {
      const result = await promoteUser({ userId, targetRole });
      if (result.ok) {
        toast.success(`Rol actualizado a ${PROMOTABLE_ROLES.find((r) => r.value === targetRole)?.label ?? targetRole}.`);
        setModal(null);
        router.refresh();
      } else {
        setFieldError(result.error.message);
      }
    });
  };

  // ── Suspend ──────────────────────────────────────────────────────────────

  const handleSuspend = () => {
    setFieldError(null);
    if (!suspendReason.trim()) {
      setFieldError("El motivo de suspensión es requerido.");
      return;
    }
    startTransition(async () => {
      const result = await suspendUser({ userId, reason: suspendReason.trim() });
      if (result.ok) {
        toast.success("Usuario suspendido correctamente.");
        setModal(null);
        setSuspendReason("");
        router.refresh();
      } else {
        setFieldError(result.error.message);
      }
    });
  };

  // ── Unsuspend ─────────────────────────────────────────────────────────────

  const handleUnsuspend = () => {
    if (!confirm("¿Vas a reactivar este usuario? Confirmá para continuar.")) return;
    startTransition(async () => {
      const result = await unsuspendUser({ userId });
      if (result.ok) {
        toast.success("Usuario reactivado correctamente.");
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
  };

  // ── Impersonate ───────────────────────────────────────────────────────────

  const handleImpersonate = () => {
    if (
      !confirm(
        "¿Vas a impersonar este usuario? Tendrás acceso completo a su cuenta. Continuá solo si es necesario.",
      )
    )
      return;
    startTransition(async () => {
      const result = await startImpersonation({ userId });
      if (result.ok) {
        toast.success("Impersonación iniciada. Redirigiendo...");
        router.push(result.value.redirectTo);
      } else {
        toast.error(result.error.message);
      }
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="rounded-xl border border-[#3F3F46]/60 bg-[#18181B] p-5 space-y-3 sticky top-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
          Acciones
        </h2>

        {/* Promote */}
        <button
          type="button"
          onClick={() => {
            setTargetRole(currentRole);
            setFieldError(null);
            setModal("promote");
          }}
          disabled={isPending}
          className="w-full flex items-center gap-2.5 rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm font-medium text-[#FAFAFA] hover:bg-[#3F3F46] transition-colors disabled:opacity-50 min-h-[44px]"
        >
          <ShieldCheck className="h-4 w-4 text-[#FF6A1A]" aria-hidden="true" />
          Cambiar rol
        </button>

        {/* Suspend / Unsuspend */}
        {isSuspended ? (
          <button
            type="button"
            onClick={handleUnsuspend}
            disabled={isPending}
            className="w-full flex items-center gap-2.5 rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/5 px-3 py-2.5 text-sm font-medium text-[#22C55E] hover:bg-[#22C55E]/10 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UserCheck className="h-4 w-4" aria-hidden="true" />
            )}
            Reactivar usuario
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setSuspendReason("");
              setFieldError(null);
              setModal("suspend");
            }}
            disabled={isPending}
            className="w-full flex items-center gap-2.5 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/5 px-3 py-2.5 text-sm font-medium text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            <Ban className="h-4 w-4" aria-hidden="true" />
            Suspender usuario
          </button>
        )}

        {/* Impersonate */}
        <button
          type="button"
          onClick={handleImpersonate}
          disabled={isPending}
          className="w-full flex items-center gap-2.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2.5 text-sm font-medium text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors disabled:opacity-50 min-h-[44px]"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <LogIn className="h-4 w-4" aria-hidden="true" />
          )}
          Impersonar
        </button>

        {isPending && (
          <p className="text-xs text-[#71717A] text-center animate-pulse">
            Procesando...
          </p>
        )}
      </div>

      {/* ── Promote Modal ─────────────────────────────────────────────────── */}
      <Dialog
        open={modal === "promote"}
        onOpenChange={(open) => !open && setModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar rol</DialogTitle>
            <DialogDescription>
              Seleccioná el nuevo rol para este usuario. Esta acción queda
              registrada en el log de auditoría.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label
              htmlFor="promote-role"
              className="text-xs font-medium text-[#A1A1AA] uppercase tracking-widest"
            >
              Nuevo rol
            </label>
            <select
              id="promote-role"
              value={targetRole}
              onChange={(e) => { const v = e.target.value as UserRole; setTargetRole(v); }}
              className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A]"
            >
              {PROMOTABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value} className="bg-[#27272A]">
                  {r.label}
                  {r.value === currentRole ? " (actual)" : ""}
                </option>
              ))}
            </select>

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
              onClick={handlePromote}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-[#FF6A1A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E55A0E] transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              )}
              Confirmar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Suspend Modal ─────────────────────────────────────────────────── */}
      <Dialog
        open={modal === "suspend"}
        onOpenChange={(open) => !open && setModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspender usuario</DialogTitle>
            <DialogDescription>
              El usuario no podrá acceder a la plataforma mientras esté
              suspendido. Indicá el motivo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label
              htmlFor="suspend-reason"
              className="text-xs font-medium text-[#A1A1AA] uppercase tracking-widest"
            >
              Motivo de suspensión
            </label>
            <textarea
              id="suspend-reason"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Describí el motivo de la suspensión..."
              rows={4}
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
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSuspend}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-semibold text-white hover:bg-[#DC2626] transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              )}
              Suspender
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
