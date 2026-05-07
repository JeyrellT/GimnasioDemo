"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSessionStore } from "@/stores/session-store";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const pendingCount = useSessionStore((s) => s.pendingSyncCount);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-[#451A03] px-4 py-2 text-sm text-[#F59E0B]"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        Sin red. Trabajando offline.{" "}
        {pendingCount > 0 && (
          <span className="font-semibold">{pendingCount} cambios pendientes.</span>
        )}
      </span>
    </div>
  );
}
