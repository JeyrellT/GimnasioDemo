"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createRoutineTemplate, createCustomGoal, listCustomGoals } from "@/app/actions/routines";
import { createRoutineSchema, type CreateRoutineInput } from "@/lib/validation/routine.schema";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ArrowRight, Loader2, Plus, X } from "lucide-react";

const BUILT_IN_GOALS = [
  { value: "HYPERTROPHY", label: "Hipertrofia" },
  { value: "STRENGTH", label: "Fuerza" },
  { value: "ENDURANCE", label: "Resistencia" },
  { value: "FAT_LOSS", label: "Pérdida de grasa" },
  { value: "GENERAL", label: "General" },
] as const;

const inputCls =
  "w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#71717A] " +
  "transition-[border-color,box-shadow] duration-150 " +
  "focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30";

const groupCardCls =
  "rounded-xl border border-[#3F3F46] bg-[#18181B]/80 backdrop-blur-sm " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-4 space-y-4";

interface CustomGoalOption {
  id: string;
  name: string;
}

function CreateGoalDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (goal: CustomGoalOption) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setSaving(true);
    const result = await createCustomGoal(trimmed);
    setSaving(false);

    if (result.ok) {
      toast.success("Objetivo creado");
      onCreated(result.value);
      onClose();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#FAFAFA]">Nuevo objetivo</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#71717A] hover:bg-[#27272A] hover:text-[#FAFAFA]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder="Ej: Flexibilidad, Rehabilitación..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSave();
            }
          }}
          maxLength={50}
          className={inputCls}
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-[#A1A1AA] hover:text-[#FAFAFA]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NuevaRutinaPage() {
  const router = useRouter();
  const [customGoals, setCustomGoals] = useState<CustomGoalOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateRoutineInput>({
    resolver: zodResolver(createRoutineSchema),
    defaultValues: { splitDays: 4, durationWeeks: 8, goal: "HYPERTROPHY" },
  });

  useEffect(() => {
    listCustomGoals().then((r) => {
      if (r.ok) setCustomGoals(r.value);
    });
  }, []);

  function handleGoalCreated(goal: CustomGoalOption) {
    setCustomGoals((prev) => [...prev, goal].sort((a, b) => a.name.localeCompare(b.name)));
    setValue("goal", goal.name);
  }

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
            <div className="flex gap-2">
              <select id="goal" {...register("goal")} className={`${inputCls} flex-1`}>
                {BUILT_IN_GOALS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
                {customGoals.length > 0 && (
                  <optgroup label="Mis objetivos">
                    {customGoals.map((g) => (
                      <option key={g.id} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                title="Crear objetivo"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-[#3F3F46] bg-[#27272A] text-[#A1A1AA] transition-colors hover:border-brand-primary hover:text-brand-primary"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
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
            "bg-brand-primary",
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

      <CreateGoalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={handleGoalCreated}
      />
    </div>
  );
}
