import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function RootLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#09090B]">
      <LoadingSpinner size="lg" />
    </div>
  );
}
