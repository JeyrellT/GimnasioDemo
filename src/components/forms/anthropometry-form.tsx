"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { recordBodyMetric } from "@/app/actions/metrics";

// Inline estimate — Mifflin-St Jeor con altura promedio (170 cm) como fallback
// cuando el cliente no tiene el assessment inicial completo.
function calcTMB(weightKg: number, heightCm: number, ageYears: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
}

const schema = z.object({
  weightKg: z
    .number({ invalid_type_error: "Ingresá un número" })
    .min(20, "Peso mínimo 20 kg")
    .max(500, "Peso máximo 500 kg"),
  waistCm: z.number({ invalid_type_error: "Ingresá un número" }).min(40).max(200).optional(),
  hipCm: z.number({ invalid_type_error: "Ingresá un número" }).min(40).max(250).optional(),
  neckCm: z.number({ invalid_type_error: "Ingresá un número" }).min(20).max(80).optional(),
  chestCm: z.number({ invalid_type_error: "Ingresá un número" }).min(40).max(200).optional(),
  armCm: z.number({ invalid_type_error: "Ingresá un número" }).min(15).max(80).optional(),
  thighCm: z.number({ invalid_type_error: "Ingresá un número" }).min(20).max(120).optional(),
});

type FormValues = z.infer<typeof schema>;

interface AnthropometryFormProps {
  ageYears: number;
  onSuccess: () => void;
}

export function AnthropometryForm({ ageYears, onSuccess }: AnthropometryFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {},
  });

  const weight = useWatch({ control: form.control, name: "weightKg" });
  // TMB with fallback height (170 cm) — BMI omitted since height isn't collected here
  const tmb = weight && !Number.isNaN(weight) ? calcTMB(weight, 170, ageYears) : null;

  const onSubmit = async (values: FormValues) => {
    const result = await recordBodyMetric({
      weightKg: values.weightKg,
      waistCm: values.waistCm ?? undefined,
      hipCm: values.hipCm ?? undefined,
      neckCm: values.neckCm ?? undefined,
      chestCm: values.chestCm ?? undefined,
      armCm: values.armCm ?? undefined,
      thighCm: values.thighCm ?? undefined,
      source: "MANUAL",
    });
    if (!result.ok) {
      toast.error("No se guardaron las medidas. Reintentá.");
      return;
    }
    toast.success("Listo.");
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Obligatorios */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="weightKg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    placeholder="70.5"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* TMB estimada en tiempo real */}
        {tmb !== null && (
          <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-4">
            <p className="text-xs text-[#71717A] uppercase tracking-wide">TMB estimada</p>
            <p className="text-2xl font-bold tabular text-[#FAFAFA]">{Math.round(tmb)} kcal</p>
            <p className="text-xs text-[#52525B] mt-1">Estimación con altura promedio. Completá el perfil para mayor precisión.</p>
          </div>
        )}

        {/* Opcionales */}
        <details className="group">
          <summary className="cursor-pointer text-sm text-[#3B82F6] hover:text-[#2563EB] list-none flex items-center gap-1">
            <span>+ Medidas adicionales (opcional)</span>
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {(
              [
                ["waistCm", "Cintura (cm)"],
                ["hipCm", "Cadera (cm)"],
                ["neckCm", "Cuello (cm)"],
                ["chestCm", "Pecho (cm)"],
                ["armCm", "Brazo (cm)"],
                ["thighCm", "Muslo (cm)"],
              ] as const
            ).map(([name, label]) => (
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
                        step="0.5"
                        inputMode="decimal"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? e.target.valueAsNumber : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </details>

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {form.formState.isSubmitting ? "Guardando..." : "Continuar"}
        </Button>
      </form>
    </Form>
  );
}
