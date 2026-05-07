"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createRoutineTemplate } from "@/app/actions/routines";
import { createRoutineSchema, type CreateRoutineInput } from "@/lib/validation/routine.schema";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ArrowRight, Loader2 } from "lucide-react";

const goalOptions = [
  { value: "HYPERTROPHY", label: "Hipertrofia" },
  { value: "STRENGTH", label: "Fuerza" },
  { value: "ENDURANCE", label: "Resistencia" },
  { value: "FAT_LOSS", label: "Pérdida de grasa" },
  { value: "GENERAL", label: "General" },
] as const;

// Shared input class — orange focus ring consistent across all fields
const inputCls =
  "w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#71717A] " +
  "transition-[border-color,box-shadow] duration-150 " +
  "focus-visible:border-[#FF6A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A1A]/30";

// Glassmorphism group card
const groupCardCls =
  "rounded-xl border border-[#3F3F46] bg-[#18181B]/80 backdrop-blur-sm " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-4 space-y-4";

export default function NuevaRutinaPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateRoutineInput>({
    resolver: zodResolver(createRoutineSchema),
    defaultValues: { splitDays: 4, durationWeeks: 8, goal: "HYPERTROPHY" },
  });

  async function onSubmit(data: CreateRoutineInput) {
    const result = await createRoutineTemplate(data);
    if (result.ok) {
      toast.success("Rutina creada.");
      router.push(`/trainer/rutinas/${result.value.routineId}`);
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader
        title="Nueva rutina"
        description="Creá la plantilla. Después agregás los ejercicios."
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        {/* Group 1: Identity */}
        <fieldset className={groupCardCls}>
          <legend className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#71717A]">
            Identidad
          </legend>

          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium text-[#FAFAFA]">
              Nombre
            </label>
            <input
              id="name"
              type="text"
              placeholder="Ej: Empuje / Jale / Pierna"
              {...register("name")}
              className={inputCls}
            />
            {errors.name && (
              <p role="alert" className="text-xs text-[#EF4444]">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Goal */}
          <div className="space-y-1.5">
            <label htmlFor="goal" className="block text-sm font-medium text-[#FAFAFA]">
              Objetivo
            </label>
            <select id="goal" {...register("goal")} className={inputCls}>
              {goalOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </fieldset>

        {/* Group 2: Structure */}
        <fieldset className={groupCardCls}>
          <legend className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#71717A]">
            Estructura
          </legend>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="splitDays" className="block text-sm font-medium text-[#FAFAFA]">
                Días por semana
              </label>
              <input
                id="splitDays"
                type="number"
                min={1}
                max={6}
                {...register("splitDays")}
                className={inputCls}
              />
              {errors.splitDays && (
                <p role="alert" className="text-xs text-[#EF4444]">
                  {errors.splitDays.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="durationWeeks" className="block text-sm font-medium text-[#FAFAFA]">
                Semanas
              </label>
              <input
                id="durationWeeks"
                type="number"
                min={1}
                max={52}
                {...register("durationWeeks")}
                className={inputCls}
              />
              {errors.durationWeeks && (
                <p role="alert" className="text-xs text-[#EF4444]">
                  {errors.durationWeeks.message}
                </p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={[
            "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white",
            "min-h-[48px] transition-all duration-200",
            // Orange gradient + glow
            "bg-gradient-to-r from-[#FF6A1A] to-[#E55A0E]",
            "shadow-[0_0_20px_rgba(255,106,26,0.30)]",
            "hover:shadow-[0_0_28px_rgba(255,106,26,0.45)] hover:brightness-110",
            "active:scale-[0.98]",
            "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none",
          ].join(" ")}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Creando...
            </>
          ) : (
            <>
              Crear y agregar ejercicios
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
