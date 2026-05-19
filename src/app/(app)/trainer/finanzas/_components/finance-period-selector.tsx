"use client";

// =============================================================================
// BLACKLINE FITNESS — FinancePeriodSelector
// Owner: frontend-react.
// Month picker dropdown — updates URL search param ?month=YYYY-MM.
// =============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildOptions(): Array<{ label: string; value: string }> {
  const now = new Date();
  return Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label =
      i === 0
        ? "Mes actual"
        : i === 1
          ? "Mes anterior"
          : `Hace ${i} meses`;
    return { label, value };
  });
}

function monthLabel(monthStr: string): string {
  const parts = monthStr.split("-");
  const y = parts[0] ?? "2026";
  const m = parts[1] ?? "01";
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("es-CR", {
    month: "long",
    year: "numeric",
  });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface FinancePeriodSelectorProps {
  currentMonth: string; // "YYYY-MM"
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FinancePeriodSelector({ currentMonth }: FinancePeriodSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const options = React.useMemo(() => buildOptions(), []);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function select(value: string) {
    setOpen(false);
    router.push(`?month=${value}`);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-150",
          "border-[#3F3F46]/70 bg-[#18181B] text-[#A1A1AA]",
          "hover:border-brand-primary/50 hover:text-[#FAFAFA]",
          open && "border-brand-primary/50 text-[#FAFAFA]",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="capitalize">{monthLabel(currentMonth)}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-150", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Seleccionar período"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className={cn(
              "absolute right-0 top-full z-50 mt-1.5 w-44 rounded-xl border border-[#3F3F46]/70",
              "bg-[#18181B] py-1 shadow-xl shadow-black/40",
            )}
          >
            {options.map(({ label, value }) => (
              <li key={value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === currentMonth}
                  onClick={() => select(value)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm transition-colors duration-100",
                    value === currentMonth
                      ? "text-brand-primary font-semibold bg-brand-primary/10"
                      : "text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]",
                  )}
                >
                  {label}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
