// =============================================================================
// VIZION — Loading skeleton: perfil de cliente
// Owner: frontend-react.
// Uses ShimmerSkeleton for premium shimmer effect.
// Layout mirrors the real page exactly to prevent cumulative layout shift.
// =============================================================================

import { ShimmerSkeleton } from "@/components/ui/shimmer-skeleton";

export default function ClientProfileLoading() {
  return (
    <div className="space-y-6" aria-label="Cargando perfil del cliente" aria-busy="true">
      {/* ── Hero card ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#3F3F46] bg-[#18181B] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Avatar */}
          <ShimmerSkeleton
            className="mx-auto h-20 w-20 shrink-0 sm:mx-0"
            rounded="lg"
          />

          <div className="flex flex-1 flex-col gap-3">
            {/* Name */}
            <ShimmerSkeleton className="mx-auto h-7 w-48 sm:mx-0" rounded="md" />

            {/* Badges row */}
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <ShimmerSkeleton
                  key={i}
                  className="h-6 w-20"
                  rounded="full"
                />
              ))}
            </div>

            {/* Subtitle line */}
            <ShimmerSkeleton className="h-4 w-40" rounded="sm" />

            {/* Action buttons */}
            <div className="flex gap-2">
              <ShimmerSkeleton className="h-11 flex-1" rounded="lg" />
              <ShimmerSkeleton className="h-11 flex-1" rounded="lg" />
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-[#3F3F46] bg-[#18181B] p-4"
          >
            <ShimmerSkeleton className="h-3 w-16" rounded="sm" />
            <ShimmerSkeleton className="h-9 w-24" rounded="md" />
            <ShimmerSkeleton className="h-5 w-20" rounded="full" />
            <ShimmerSkeleton className="mt-auto h-6 w-full" rounded="sm" />
          </div>
        ))}
      </div>

      {/* ── Body map + circunferencias ────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Body map */}
        <div className="rounded-2xl border border-[#3F3F46] bg-[#18181B] p-4">
          <ShimmerSkeleton className="mb-4 h-8 w-40" rounded="md" />
          <ShimmerSkeleton
            className="mx-auto aspect-[320/640] max-w-[320px]"
            rounded="lg"
          />
        </div>

        {/* Circunferencias table */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, g) => (
            <div key={g}>
              <ShimmerSkeleton className="mb-2 h-3 w-16" rounded="sm" />
              <div className="overflow-hidden rounded-xl border border-[#3F3F46]">
                {Array.from({ length: 5 }).map((_, r) => (
                  <div
                    key={r}
                    className="flex items-center justify-between border-b border-[#27272A] px-4 py-3 last:border-0"
                  >
                    <ShimmerSkeleton className="h-3 w-28" rounded="sm" />
                    <ShimmerSkeleton className="h-3 w-16" rounded="sm" />
                    <ShimmerSkeleton className="h-3 w-10" rounded="sm" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs skeleton ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#3F3F46] bg-[#18181B]">
        {/* Tab bar */}
        <div className="flex gap-2 border-b border-[#3F3F46] px-4 py-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ShimmerSkeleton key={i} className="h-8 w-24" rounded="md" />
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-[320px] p-4">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <ShimmerSkeleton key={i} className="h-16 w-full" rounded="lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
