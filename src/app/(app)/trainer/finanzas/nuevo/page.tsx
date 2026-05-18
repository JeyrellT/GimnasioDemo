"use client";

// =============================================================================
// VIZION — /trainer/finanzas/nuevo
// Quick-entry form: register a gasto or a venta one-off.
// Owner: frontend-react.
// =============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingDown, TrendingUp, Loader2, CheckCircle2 } from "lucide-react";
import { createExpense, createOneOffSale } from "@/app/actions/finance";
import type { ExpenseCategory, IncomeCategory } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = "gasto" | "venta";

// ── Constants ─────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  { value: "ALQUILER_ESPACIO",        label: "Alquiler espacio" },
  { value: "SOFTWARE",                label: "Software" },
  { value: "MARKETING",               label: "Marketing" },
  { value: "EDUCACION",               label: "Educación" },
  { value: "TRANSPORTE",              label: "Transporte" },
  { value: "EQUIPO",                  label: "Equipo" },
  { value: "COMIDAS",                 label: "Comidas" },
  { value: "IMPUESTOS",               label: "Impuestos" },
  { value: "SERVICIOS_PROFESIONALES", label: "Servicios profesionales" },
  { value: "OTROS",                   label: "Otros" },
] as const;

const INCOME_CATEGORIES = [
  { value: "SESION_PT",          label: "Sesión PT / Mensualidad" },
  { value: "EVALUACION_INICIAL", label: "Evaluación inicial" },
  { value: "PLAN_NUTRICIONAL",   label: "Plan nutricional" },
  { value: "CLASE_GRUPAL",       label: "Clase grupal" },
  { value: "ASESORIA_ONLINE",    label: "Asesoría online" },
  { value: "PRODUCTO",           label: "Producto" },
  { value: "OTROS",              label: "Otros" },
] as const;

const PAYMENT_METHODS = [
  { value: "SINPE",     label: "SINPE Móvil" },
  { value: "EFECTIVO",  label: "Efectivo" },
  { value: "TARJETA",   label: "Tarjeta" },
  { value: "DEPOSITO",  label: "Depósito" },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const inputCls =
  "w-full rounded-lg border border-[#3F3F46] bg-[#09090B] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#FF6A1A]/60 focus:outline-none focus:ring-2 focus:ring-[#FF6A1A]/20 transition-colors";

const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#A1A1AA]";

// ── Component ─────────────────────────────────────────────────────────────────

export default function NuevaEntradaPage() {
  const router = useRouter();

  const [mode, setMode] = React.useState<Mode>("gasto");
  const [amount, setAmount] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState(todayLocal());
  const [paymentMethod, setPaymentMethod] = React.useState("SINPE");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const cats = mode === "gasto" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  // Reset category when mode changes
  React.useEffect(() => {
    setCategory("");
  }, [mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Ingresá un monto válido mayor a 0.");
      return;
    }
    if (!category) {
      setError("Seleccioná una categoría.");
      return;
    }

    setSaving(true);
    const occurredAt = new Date(date + "T09:00:00").toISOString();

    let result;
    if (mode === "gasto") {
      result = await createExpense({ occurredAt, amountCRC: amountNum, category: category as ExpenseCategory, description: description || undefined });
    } else {
      result = await createOneOffSale({ occurredAt, amountCRC: amountNum, category: category as IncomeCategory, description: description || undefined, paidStatus: "PAID" });
    }

    setSaving(false);

    if (!result.ok) {
      setError(result.error?.message ?? "Error al guardar. Intentá de nuevo.");
      return;
    }

    setSaved(true);
    setTimeout(() => router.push("/trainer/finanzas"), 1200);
  }

  if (saved) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <CheckCircle2 className="h-12 w-12 text-[#22C55E]" strokeWidth={1.5} />
        <p className="text-sm font-semibold text-[#FAFAFA]">Entrada registrada</p>
        <p className="text-xs text-[#71717A]">Volviendo al dashboard…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Back */}
      <Link
        href="/trainer/finanzas"
        className="inline-flex items-center gap-1.5 text-xs text-[#71717A] hover:text-[#FAFAFA] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a Finanzas
      </Link>

      <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-6 shadow-xl">
        {/* Title */}
        <h1 className="mb-5 text-lg font-bold text-[#FAFAFA]">Nueva entrada</h1>

        {/* Mode toggle */}
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-[#09090B] p-1">
          <button
            type="button"
            onClick={() => setMode("gasto")}
            className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all ${
              mode === "gasto"
                ? "bg-[#EF4444]/15 text-[#EF4444] shadow"
                : "text-[#71717A] hover:text-[#A1A1AA]"
            }`}
          >
            <TrendingDown className="h-4 w-4" />
            Gasto
          </button>
          <button
            type="button"
            onClick={() => setMode("venta")}
            className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all ${
              mode === "venta"
                ? "bg-[#22C55E]/15 text-[#22C55E] shadow"
                : "text-[#71717A] hover:text-[#A1A1AA]"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Ingreso
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className={labelCls}>Monto (₡)</label>
            <input
              type="number"
              min="1"
              step="500"
              placeholder="35 000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className={labelCls}>Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputCls}
              required
            >
              <option value="">Seleccioná una categoría…</option>
              {cats.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className={labelCls}>Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          {/* Payment method — only for ventas */}
          {mode === "venta" && (
            <div>
              <label className={labelCls}>Método de pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={inputCls}
              >
                {PAYMENT_METHODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className={labelCls}>Descripción <span className="font-normal text-[#52525B]">(opcional)</span></label>
            <input
              type="text"
              placeholder={mode === "gasto" ? "Ej: Alquiler Gym Central mayo" : "Ej: Mensualidad Ana Solís"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputCls}
              maxLength={120}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF6A1A] py-3 text-sm font-bold text-white shadow-md shadow-[#FF6A1A]/20 transition-colors hover:bg-[#E55D0F] disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando…
              </>
            ) : (
              `Registrar ${mode === "gasto" ? "gasto" : "ingreso"}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
