"use client";
// =============================================================================
// BLACKLINE FITNESS — Renew wall (full-screen interface pause)
// Rendered by the (app) layout INSTEAD of the whole trainer shell when the
// trainer's subscription window has lapsed (trial ended, paid period expired,
// past-due, or cancelled). This is the "pausar la interfaz y funcionalidades"
// gate: the trainer cannot reach any page — they can only pay to reactivate or
// sign out.
//
// El medio de pago depende del flag PAYMENT (env PAYMENT_PROVIDER_LIVE):
//   - en vivo  -> widget de tarjeta de ONVO, que reactiva la cuenta sola vía
//                 webhook.
//   - apagado  -> instrucciones de SINPE Móvil. La activación ahí es manual.
// =============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Lock, CreditCard, RefreshCw, LogOut } from "lucide-react";
import type { SubscriptionTier } from "@prisma/client";

import { formatDateCR } from "@/lib/format";
import { PLAN_PRICE_CRC, APP_NAME, TRIAL_DAYS } from "@/lib/consts";
import { nombreDePlan } from "@/lib/plans";
import { OnvoSubscriptionPayment } from "./onvo-subscription-payment";
import { SinpePayment } from "./sinpe-payment";
import { PlanPicker } from "./plan-picker";

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
  /** Flag PAYMENT: con la pasarela apagada se cobra por SINPE Móvil. */
  paymentsLive: boolean;
}

function copyFor(
  reason: RenewWallReason,
  planTier: SubscriptionTier,
): { title: string; body: string } {
  const plan = nombreDePlan(planTier);
  switch (reason) {
    case "TRIAL_EXPIRED":
      return {
        title: "Tu prueba gratuita terminó",
        body: `Se acabaron tus ${TRIAL_DAYS} días de prueba. Renová tu plan ${plan} para reactivar ${APP_NAME} y seguir gestionando tu gimnasio.`,
      };
    case "PERIOD_EXPIRED":
      return {
        title: "Tu suscripción venció",
        body: `Tu período pagado terminó. Renová tu plan ${plan} para reactivar el acceso a ${APP_NAME}.`,
      };
    case "PAST_DUE":
      return {
        title: "Tu pago está pendiente",
        body: `No pudimos confirmar tu último pago. Renová tu plan ${plan} para reactivar el acceso a ${APP_NAME}.`,
      };
    case "CANCELLED":
      return {
        title: "Tu suscripción fue cancelada",
        body: `Reactivá tu plan ${plan} para volver a usar ${APP_NAME}.`,
      };
  }
}

export function TrialLockedScreen({
  reason,
  planTier,
  trialEndsAt,
  currentPeriodEnd,
  paymentsLive,
}: TrialLockedScreenProps) {
  const router = useRouter();
  const [paying, setPaying] = useState(false);

  const { title, body } = copyFor(reason, planTier);

  // Which date to surface: the trial end for a lapsed trial, otherwise the paid
  // period end. Rendered only when present.
  const expiredOn =
    reason === "TRIAL_EXPIRED" ? trialEndsAt : currentPeriodEnd;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0A0A0A] px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-[#3F3F46] bg-[#18181B] p-6 sm:p-8">
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

        </div>

        {/* El coach elige su plan acá mismo. Guardar solo cambia el plan
            registrado: la cuenta se reactiva cuando entra el pago. */}
        <div className="mt-6">
          <p className="mb-3 text-center text-sm font-semibold text-[#FAFAFA]">
            Elegí tu plan para continuar
          </p>
          <PlanPicker actual={planTier} textoBoton="Elegir este plan" />
        </div>

        {/* Sin pasarela en vivo el único medio es SINPE, así que se muestra de
            una — esconderlo detrás de un botón solo agrega un clic de más. */}
        {!paymentsLive ? (
          <div className="mt-6">
            <SinpePayment amountCRC={PLAN_PRICE_CRC[planTier]} />
          </div>
        ) : paying ? (
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
