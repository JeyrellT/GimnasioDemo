"use client";

// =============================================================================
// VIZION — ReferralActions
// Approve / Reject buttons for a single referral row (PENDING only).
// Owner: frontend-react.
// =============================================================================

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";
import { reviewReferral } from "@/server/actions/referral.actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type ReferralStatus = "PENDING" | "APPROVED" | "REGISTERED" | "REJECTED";

interface ReferralActionsProps {
  referralId: string;
  status: ReferralStatus;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReferralActions({ referralId, status }: ReferralActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (status !== "PENDING") {
    return null;
  }

  function handleReview(action: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      const result = await reviewReferral({ referralId, status: action });

      if (!result.ok) {
        toast.error(result.error.message ?? "No se pudo procesar la referencia.");
        return;
      }

      toast.success(
        action === "APPROVED"
          ? "Referencia aprobada correctamente."
          : "Referencia rechazada.",
      );
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Aprobar */}
      <button
        type="button"
        disabled={isPending}
        onClick={() => handleReview("APPROVED")}
        aria-label="Aprobar referencia"
        className="inline-flex h-7 items-center gap-1 rounded-md border border-[#22C55E]/40 bg-[#22C55E]/10 px-2 text-[11px] font-semibold text-[#22C55E] transition-colors hover:bg-[#22C55E]/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : (
          <Check className="h-3 w-3" aria-hidden="true" />
        )}
        Aprobar
      </button>

      {/* Rechazar */}
      <button
        type="button"
        disabled={isPending}
        onClick={() => handleReview("REJECTED")}
        aria-label="Rechazar referencia"
        className="inline-flex h-7 items-center gap-1 rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 px-2 text-[11px] font-semibold text-[#EF4444] transition-colors hover:bg-[#EF4444]/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : (
          <X className="h-3 w-3" aria-hidden="true" />
        )}
        Rechazar
      </button>
    </div>
  );
}
