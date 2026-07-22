"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { stopImpersonation } from "@/server/actions/admin.actions";

export function MirrorExitButton() {
  const [isPending, startTransition] = useTransition();

  function handleExit() {
    startTransition(async () => {
      const result = await stopImpersonation();
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      // Reload so the shared shell also drops the mirrored identity.
      window.location.assign(result.value.redirectTo);
    });
  }

  return (
    <button
      type="button"
      onClick={handleExit}
      disabled={isPending}
      className="flex min-h-[36px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-1.5 text-xs font-semibold text-[#EF4444] transition-colors hover:bg-[#EF4444]/20 disabled:opacity-60"
    >
      {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
      Volver a Super Admin
    </button>
  );
}
