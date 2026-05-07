import { ShimmerSkeleton } from "@/components/ui/shimmer-skeleton";

// ---------------------------------------------------------------------------
// Loading skeleton — matches the structure of the exercise detail page
// ---------------------------------------------------------------------------

export default function ExerciseDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <ShimmerSkeleton className="h-5 w-28" rounded="full" />

      {/* Hero card */}
      <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 space-y-4">
        {/* Name + owner badge row */}
        <div className="flex items-start justify-between gap-4">
          <ShimmerSkeleton className="h-7 w-56" rounded="md" />
          <ShimmerSkeleton className="h-5 w-16" rounded="full" />
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-2">
          <ShimmerSkeleton className="h-5 w-20" rounded="full" />
          <ShimmerSkeleton className="h-5 w-24" rounded="full" />
        </div>

        {/* Difficulty row */}
        <div className="flex items-center gap-2">
          <ShimmerSkeleton className="h-3 w-10" rounded="full" />
          <ShimmerSkeleton className="h-3 w-20" rounded="sm" />
        </div>

        {/* Edit button placeholder */}
        <ShimmerSkeleton className="h-9 w-24" rounded="lg" />
      </div>

      {/* Two-column body */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: body map */}
        <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 flex flex-col items-center gap-4">
          <ShimmerSkeleton className="h-5 w-32" rounded="md" />
          <div className="flex gap-4">
            {/* Front silhouette placeholder */}
            <ShimmerSkeleton className="h-[267px] w-[200px]" rounded="lg" />
            {/* Back silhouette placeholder */}
            <ShimmerSkeleton className="h-[267px] w-[200px]" rounded="lg" />
          </div>
          {/* Legend */}
          <div className="flex gap-4">
            <ShimmerSkeleton className="h-4 w-20" rounded="full" />
            <ShimmerSkeleton className="h-4 w-24" rounded="full" />
          </div>
        </div>

        {/* Right: media + instructions */}
        <div className="space-y-5">
          {/* Media gallery */}
          <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 space-y-3">
            <ShimmerSkeleton className="h-5 w-28" rounded="md" />
            {/* Tab bar */}
            <div className="flex gap-1 rounded-lg border border-[#3F3F46] p-1">
              <ShimmerSkeleton className="h-7 flex-1" rounded="md" />
              <ShimmerSkeleton className="h-7 flex-1" rounded="md" />
            </div>
            {/* Media panel */}
            <ShimmerSkeleton className="aspect-video w-full" rounded="lg" />
          </div>

          {/* Instructions */}
          <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 space-y-3">
            <ShimmerSkeleton className="h-5 w-36" rounded="md" />
            <div className="space-y-2">
              <ShimmerSkeleton className="h-4 w-full" rounded="sm" />
              <ShimmerSkeleton className="h-4 w-full" rounded="sm" />
              <ShimmerSkeleton className="h-4 w-5/6" rounded="sm" />
              <ShimmerSkeleton className="h-4 w-full" rounded="sm" />
              <ShimmerSkeleton className="h-4 w-3/4" rounded="sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
