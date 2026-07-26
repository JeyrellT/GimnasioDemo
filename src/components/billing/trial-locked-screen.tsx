"use client";
// =============================================================================
// BLACKLINE FITNESS — Renew wall (full-screen interface pause)
// Rendered by the (app) layout INSTEAD of the whole trainer shell when the
// trainer's subscription window has lapsed (trial ended, paid period expired,
// past-due, or cancelled). This is the "pausar la interfaz y funcionalidades"
// gate: the trainer cannot reach any page — they can only pay to reactivate or
// sign out. The ONVO payment widget is embedded so they can renew in place.
// =============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Lock, CreditCard, RefreshCw, LogOut } from "lucide-react";
import type { SubscriptionTier } from "@prisma/client";

import { formatCRC, formatDateCR } from "@/lib/format";
import { PLAN_PRICE_CRC, APP_NAME, TRIAL_DAYS } from "@/lib/consts";
import { OnvoSubscriptionPayment } from "./onvo-subscription-payment";

export type RenewWallReason =
  | "TRIAL_EXPIRED"
  | "PERIOD_EXPIRED"
  | "PAST_DUE"
  | "CANCELLED";

interface TrialLockedScreenProps {
  reason: RenewWallReason;
  planTier: SubscriptionTier;
  /** ISO strings — Dates aren't serializable across the server→client boundary. */
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

function copyFor(
  reason: RenewWallReason,
  planTier: SubscriptionTier,
): { title: string; body: string } {
  switch (reason) {
    case "TRIAL_EXPIRED":
      return {
        title: "Tu prueba gratuita terminó",
        body: `Se acabaron tus ${TRIAL_DAYS} días de prueba. Renová tu plan ${planTier} para reactivar ${APP_NAME} y seguir gestionando tu gimnasio.`,
      };
    case "PERIOD_EXPIRED":
      return {
        title: "Tu suscripción venció",
        body: `Tu período pagado terminó. Renová tu plan ${planTier} para reactivar el acceso a ${APP_NAME}.`,
      };
    case "PAST_DUE":
      return {
        title: "Tu pago está pendiente",
        body: `No pudimos confirmar tu último pago. Renová tu plan ${planTier} para reactivar el acceso a ${APP_NAME}.`,
      };
    case "CANCELLED":
      return {
        title: "Tu suscripción fue cancelada",
        body: `Reactivá tu plan ${planTier} para volver a usar ${APP_NAME}.`,
      };
  }
}

export function TrialLockedScreen({
  reason,
  planTier,
  trialEndsAt,
  currentPeriodEnd,
}: TrialLockedScreenProps) {
  const router = useRouter();
  const [paying, setPaying] = useState(false);

  const { title, body } = copyFor(reason, planTier);
  const price = formatCRC(PLAN_PRICE_CRC[planTier]);

  // Which date to surface: the trial end for a lapsed trial, otherwise the paid
  // period end. Rendered only when present.
  const expiredOn =
    reason === "TRIAL_EXPIRED" ? trialEndsAt : currentPeriodEnd;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0A0A0A] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[#3F3F46] bg-[#18181B] p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-[#F59E0B]/10 ring-1 ring-[#F59E0B]/30">
            <Lock className="h-7 w-7 text-[#F59E0B]" />
          </div>

          <h1 className="mt-5 text-xl font-bold text-[#FAFAFA]">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">{body}</p>

          {expiredOn && (
            <p className="mt-3 text-xs text-[#71717A]">
              Venció el {formatDateCR(expiredOn, "d 'de' MMMM 'de' yyyy")}
            </p>
          )}

          <div className="mt-5 w-full rounded-xl border border-[#F59E0B]/25 bg-[#F59E0B]/5 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[#A1A1AA]">
              Plan {planTier}
            </p>
            <p className="mt-0.5 text-lg font-bold text-[#FAFAFA]">
              {price}
              <span className="text-sm font-normal text-[#71717A]"> / mes</span>
            </p>
          </div>
        </div>

        {paying ? (
          <div className="mt-6">
            <OnvoSubscriptionPayment onPaid={() => router.refresh()} />
            <button
              type="button"
              onClick={() => setPaying(false)}
              className="mt-3 w-full py-2 text-center text-xs text-[#71717A] transition-colors hover:text-[#A1A1AA]"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPaying(true)}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-3 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-[#D97706]"
          >
            <CreditCard className="h-4 w-4" />
            Renovar ahora
          </button>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-1.5 text-xs text-[#71717A] transition-colors hover:text-[#A1A1AA]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Ya pagué, actualizar
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/ingresar" })}
            className="inline-flex items-center gap-1.5 text-xs text-[#71717A] transition-colors hover:text-[#A1A1AA]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-[#52525B]">
        {APP_NAME} · ¿Necesitás ayuda? Escribinos a soporte.
      </p>
    </div>
  );
}
