// =============================================================================
// FORJA — /trainer/finanzas loading skeleton
// Owner: frontend-react.
// =============================================================================

export default function FinanzasLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-7 w-48 rounded-lg bg-[#27272A]" />
          <div className="h-4 w-28 rounded-md bg-[#27272A]" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-36 rounded-lg bg-[#27272A]" />
          <div className="h-9 w-32 rounded-lg bg-[#27272A]" />
        </div>
      </div>

      {/* KPI row skeleton — 4 cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#3F3F46]/50 bg-[#18181B] p-4 space-y-3"
          >
            <div className="h-3 w-20 rounded bg-[#27272A]" />
            <div className="h-9 w-28 rounded bg-[#27272A]" />
            <div className="h-5 w-16 rounded-full bg-[#27272A]" />
          </div>
        ))}
      </div>

      {/* Income + Expense charts row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#3F3F46]/50 bg-[#18181B] p-5 space-y-4">
          <div className="h-4 w-32 rounded bg-[#27272A]" />
          <div className="space-y-3">
            <div className="h-8 rounded-lg bg-[#27272A]" />
            <div className="h-8 rounded-lg bg-[#27272A]" />
          </div>
        </div>
        <div className="rounded-xl border border-[#3F3F46]/50 bg-[#18181B] p-5 space-y-4">
          <div className="h-4 w-36 rounded bg-[#27272A]" />
          <div className="flex gap-6">
            <div className="h-28 w-28 rounded-full bg-[#27272A]" />
            <div className="flex-1 space-y-2.5 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 rounded bg-[#27272A]" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Location table skeleton */}
      <div className="rounded-xl border border-[#3F3F46]/50 bg-[#18181B] p-5 space-y-3">
        <div className="h-4 w-40 rounded bg-[#27272A]" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-[#27272A]" />
        ))}
      </div>

      {/* Recent transactions skeleton */}
      <div className="rounded-xl border border-[#3F3F46]/50 bg-[#18181B] p-5 space-y-3">
        <div className="h-4 w-44 rounded bg-[#27272A]" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 w-20 rounded bg-[#27272A]" />
            <div className="h-5 w-16 rounded-full bg-[#27272A]" />
            <div className="h-3 flex-1 rounded bg-[#27272A]" />
            <div className="h-4 w-20 rounded bg-[#27272A]" />
          </div>
        ))}
      </div>
    </div>
  );
}
