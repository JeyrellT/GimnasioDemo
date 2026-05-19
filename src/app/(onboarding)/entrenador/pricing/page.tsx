"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { saveTrainerPricingDefaults } from "@/app/actions/billing";
import { toast } from "sonner";

const SUGGESTED_PRICES = [15_000, 20_000, 25_000, 30_000, 35_000, 45_000];

export default function EntrenadorPricingPage() {
  const router = useRouter();
  const [price, setPrice] = useState<number>(20_000);
  const [submitting, setSubmitting] = useState(false);

  async function handleContinue() {
    setSubmitting(true);
    const result = await saveTrainerPricingDefaults({ defaultMonthlyPriceCRC: price });
    setSubmitting(false);
    if (result.ok) {
      router.push("/inicio");
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Tu cobro mensual</h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          ¿Cuánto cobrás a tus clientes mensualmente? Podés cambiarlo por
          cliente o en cualquier momento.
        </p>
      </div>

      {/* Big price display */}
      <div className="rounded-2xl border border-[#3F3F46] bg-[#18181B] p-6 text-center">
        <p className="text-xs font-medium text-[#71717A] uppercase tracking-wide mb-3">
          Precio por cliente
        </p>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold text-[#A1A1AA]">₡</span>
          <input
            type="number"
            value={price}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!Number.isNaN(val) && val >= 0) setPrice(val);
            }}
            min={0}
            step={1000}
            aria-label="Precio mensual en colones"
            className="w-36 bg-transparent text-center text-5xl font-bold tabular text-[#FAFAFA] focus:outline-none focus:text-brand-primary transition-colors"
          />
          <span className="text-xl text-[#71717A]">/mes</span>
        </div>
        <p className="mt-2 text-xs text-[#71717A]">IVA no incluido</p>
      </div>

      {/* Suggested prices */}
      <div>
        <p className="mb-3 text-xs font-medium text-[#71717A] uppercase tracking-wide">
          Sugerencias del mercado
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PRICES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPrice(s)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                price === s
                  ? "bg-brand-primary text-white"
                  : "border border-[#3F3F46] text-[#A1A1AA] hover:border-[#71717A]"
              }`}
            >
              ₡{s.toLocaleString("es-CR")}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-[#71717A] leading-relaxed">
        Blackline Fitness no cobra comisión sobre tus cobros en el MVP. Registramos la
        factura entre vos y tu cliente. El procesamiento de pagos en línea se
        activa cuando decidís.
      </p>

      <button
        type="button"
        onClick={handleContinue}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-3.5 text-sm font-semibold text-white min-h-[48px] hover:bg-brand-primary-hover disabled:opacity-60 transition-colors"
      >
        {submitting ? "Guardando..." : "Ir al dashboard"}
        {!submitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
