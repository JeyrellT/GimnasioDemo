// =============================================================================
// SUPER_ADMIN — ImpersonationBanner
// Server component. Renders a sticky warning banner when a SUPER_ADMIN is
// impersonating another user. Returns null when not impersonating (zero cost).
// =============================================================================

import { getCurrentImpersonation, stopImpersonation } from "@/server/actions/admin.actions";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";

export async function ImpersonationBanner() {
  const result = await getCurrentImpersonation();

  // Not impersonating, action failed, or null result — render nothing.
  if (!result.ok || !result.value || !result.value.isImpersonating) {
    return null;
  }

  const { actor, target } = result.value;

  // Type guard: when isImpersonating is true, actor + target are always present
  if (!actor || !target) return null;

  async function handleStop() {
    "use server";
    const r = await stopImpersonation();
    if (r.ok) {
      redirect(r.value.redirectTo);
    }
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-2.5 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle
          className="h-4 w-4 shrink-0 text-[#EF4444]"
          aria-hidden="true"
        />
        <p className="text-sm text-[#FAFAFA] truncate">
          <span className="font-semibold text-[#EF4444]">Impersonando</span>{" "}
          a{" "}
          <span className="font-semibold">
            {target.name} ({target.email})
          </span>{" "}
          <span className="text-[#A1A1AA] hidden sm:inline">
            — actor: {actor.email}
          </span>
        </p>
      </div>

      <form action={handleStop}>
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-1.5 text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors min-h-[36px] whitespace-nowrap"
        >
          Salir de impersonación
        </button>
      </form>
    </div>
  );
}
