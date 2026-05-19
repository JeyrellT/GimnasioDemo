"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { step5Schema, type Step5Input } from "@/lib/validation/onboarding.schema";
import { saveOnboardingStep } from "@/app/actions/onboarding";
import { useOnboardingStore } from "@/stores/onboarding-wizard-store";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface Step5AnthropometryProps {
  draftId: string;
}

export function Step5Anthropometry({ draftId }: Step5AnthropometryProps) {
  // Bug 10: granular selectors
  const goNext = useOnboardingStore((s) => s.goNext);
  const goBack = useOnboardingStore((s) => s.goBack);
  const setStepData = useOnboardingStore((s) => s.setStepData);
  const payload = useOnboardingStore((s) => s.payload);
  const existing = payload.step5;

  const form = useForm<Step5Input>({
    resolver: zodResolver(step5Schema),
    defaultValues: {
      heightCm: existing?.heightCm ?? undefined,
      weightKg: existing?.weightKg ?? undefined,
      bodyFatPct: existing?.bodyFatPct ?? undefined,
      muscleMassKg: existing?.muscleMassKg ?? undefined,
      waistCm: existing?.waistCm ?? undefined,
      hipCm: existing?.hipCm ?? undefined,
    },
  });

  // Live BMI
  const [bmi, setBmi] = useState<number | null>(null);

  function updateBmi(h: number | undefined, w: number | undefined) {
    if (!h || !w || h <= 0 || w <= 0) {
      setBmi(null);
      return;
    }
    const m = h / 100;
    setBmi(w / (m * m));
  }

  function bmiLabel(v: number): string {
    if (v < 18.5) return "Bajo peso";
    if (v < 25) return "Normal";
    if (v < 30) return "Sobrepeso";
    return "Obesidad";
  }

  const onSubmit = async (data: Step5Input) => {
    const result = await saveOnboardingStep(draftId, 5, data);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setStepData("step5", data);
    goNext();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* Required */}
        <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#A1A1AA]">
            Medidas corporales
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="heightCm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Altura (cm) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.5"
                      inputMode="decimal"
                      placeholder="170"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value ? e.target.valueAsNumber : undefined;
                        field.onChange(v);
                        updateBmi(v, form.getValues("weightKg"));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weightKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso (kg) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      placeholder="70.5"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value ? e.target.valueAsNumber : undefined;
                        field.onChange(v);
                        updateBmi(form.getValues("heightCm"), v);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Live BMI */}
          {bmi !== null && (
            <div className="rounded-xl border border-[#3F3F46] bg-[#09090B] p-4">
              <p className="text-xs text-[#71717A] uppercase tracking-wide">IMC estimado</p>
              <p className="text-2xl font-bold tabular-nums text-[#FAFAFA]">
                {bmi.toFixed(1)}
              </p>
              <p className="text-xs text-[#A1A1AA]">{bmiLabel(bmi)}</p>
            </div>
          )}
        </div>

        {/* Optional */}
        <details className="rounded-xl border border-[#3F3F46] bg-[#18181B]">
          <summary className="cursor-pointer select-none px-5 py-4 text-sm text-brand-primary hover:text-brand-primary-hover list-none">
            + Medidas adicionales (opcional)
          </summary>
          <div className="px-5 pb-5 space-y-4 border-t border-[#3F3F46] pt-4">
            <div className="grid grid-cols-2 gap-4">
              {(
                [
                  ["bodyFatPct", "% Grasa corporal", "15.5", "0.1"],
                  ["muscleMassKg", "Masa muscular (kg)", "35.0", "0.1"],
                  ["waistCm", "Cintura (cm)", "80", "0.5"],
                  ["hipCm", "Cadera (cm)", "95", "0.5"],
                ] as const
              ).map(([name, label, placeholder, step]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step={step}
                          inputMode="decimal"
                          placeholder={placeholder}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? e.target.valueAsNumber : undefined,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>
        </details>

        {/* Nav */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={goBack} className="flex-1">
            Atras
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {form.formState.isSubmitting ? "Guardando..." : "Siguiente →"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
