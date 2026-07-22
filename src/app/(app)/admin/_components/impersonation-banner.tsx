// =============================================================================
// SUPER_ADMIN — persistent banner shown while a mirror session is active.
// =============================================================================

import { Eye } from "lucide-react";
import { MirrorExitButton } from "./mirror-exit-button";

interface ImpersonationBannerProps {
  impersonation: {
    isImpersonating: boolean;
    actor?: { email: string };
    target?: { email: string; name: string };
  } | null;
}

export function ImpersonationBanner({
  impersonation,
}: ImpersonationBannerProps) {
  if (!impersonation?.isImpersonating) return null;

  const { actor, target } = impersonation;
  if (!actor || !target) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-[#EF4444]/40 bg-[#240D0D] px-4 py-2.5 shadow-lg"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Eye className="h-4 w-4 shrink-0 text-[#EF4444]" aria-hidden="true" />
        <p className="truncate text-sm text-[#FAFAFA]">
          <span className="font-semibold text-[#EF4444]">Vista espejo</span> de{" "}
          <span className="font-semibold">
            {target.name} ({target.email})
          </span>{" "}
          <span className="hidden text-[#A1A1AA] sm:inline">
            — actor: {actor.email}
          </span>
        </p>
      </div>

      <MirrorExitButton />
    </div>
  );
}
