"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingDown,
  Dumbbell,
  Minus,
  Zap,
  Heart,
  ArrowRight,
} from "lucide-react";
import { saveClientGoal } from "@/app/actions/clients";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const goals = [
  {
    id: "FAT_LOSS" as const,
    icon: TrendingDown,
    label: "Perder grasa",
    description: "Reducir porcentaje de grasa corporal manteniendo músculo.",
  },
  {
    id: "MUSCLE_GAIN" as const,
    icon: Dumbbell,
    label: "Ganar músculo",
    description: "Aumentar masa muscular con entrenamiento de fuerza.",
  },
  {
    id: "MAINTENANCE" as const,
    icon: Minus,
    label: "Mantenimiento",
    description: "Mantener composición corporal actual y mejorar salud.",
  },
  {
    id: "PERFORMANCE" as const,
    icon: Zap,
    label: "Rendimiento",
    description: "Mejorar fuerza, resistencia o capacidad atlética.",
  },
  {
    id: "GENERAL_HEALTH" as const,
    icon: Heart,
    label: "Salud general",
    description: "Hábitos saludables, bienestar general y calidad de vida.",
  },
] as const;

type GoalId = (typeof goals)[number]["id"];

export default function ObjetivoPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<GoalId | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleContinue() {
    if (!selected) return;
    setSubmitting(true);
    const result = await saveClientGoal({
      goal: selected,
      goalNotes: notes.trim() || undefined,
    });
    setSubmitting(false);
    if (result.ok) {
      router.push("/onboarding/cliente/foto-inicial");
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Tu objetivo</h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          ¿Qué querés lograr con tu entrenamiento? Tu entrenador usará esto para
          diseñar tu rutina.
        </p>
      </div>

      {/* Goal selector */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {goals.map(({ id, icon: Icon, label, description }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSelected(id)}
            className={cn(
              "flex flex-col gap-2 rounded-2xl border p-4 text-left transition-all",
              selected === id
                ? "border-brand-primary bg-brand-primary/5"
                : "border-[#3F3F46] bg-[#18181B] hover:border-[#71717A]",
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                selected === id ? "bg-brand-primary/20" : "bg-[#27272A]",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  selected === id ? "text-brand-primary" : "text-[#A1A1AA]",
                )}
                aria-hidden="true"
              />
            </div>
            <p className="text-sm font-semibold text-[#FAFAFA]">{label}</p>
            <p className="text-xs text-[#71717A] leading-relaxed">{description}</p>
          </button>
        ))}
      </div>

      {/* Optional notes */}
      <div className="space-y-1.5">
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-[#FAFAFA]"
        >
          Algo más que tu entrenador deba saber{" "}
          <span className="text-[#71717A]">(opcional)</span>
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Lesiones previas, metas específicas, preferencias..."
          className="w-full resize-none rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#71717A] focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary transition-colors"
        />
        <p className="text-right text-xs text-[#71717A]">{notes.length}/500</p>
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={!selected || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-3.5 text-sm font-semibold text-white min-h-[48px] hover:bg-brand-primary-hover disabled:opacity-50 transition-colors"
      >
        {submitting ? "Guardando..." : "Continuar"}
        {!submitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
