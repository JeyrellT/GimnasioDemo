"use client";

// =============================================================================
// FORJA — MovimientosTipoFilter
// Chip filter: Todos / Gastos / Ventas — updates URL ?tipo= param.
// =============================================================================

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Tipo = "todos" | "gastos" | "ventas";

const OPTIONS: Array<{ value: Tipo; label: string }> = [
  { value: "todos",  label: "Todos" },
  { value: "gastos", label: "Gastos" },
  { value: "ventas", label: "Ventas" },
];

export function MovimientosTipoFilter({ current }: { current: Tipo }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(tipo: Tipo) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tipo", tipo);
    params.delete("page"); // reset pagination
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-[#3F3F46]/70 bg-[#18181B] p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => select(o.value)}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors duration-150",
            current === o.value
              ? "bg-[#FF6A1A] text-white shadow-sm"
              : "text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
