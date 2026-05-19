"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { step7Schema, type Step7Input } from "@/lib/validation/onboarding.schema";
import { saveOnboardingStep } from "@/app/actions/onboarding";
import { listMyRoutines } from "@/app/actions/routines";
import { useOnboardingStore } from "@/stores/onboarding-wizard-store";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface RoutineOption {
  id: string;
  name: string;
}

interface Step7PlanProps {
  draftId: string;
}

export function Step7Plan({ draftId }: Step7PlanProps) {
  const { goNext, goBack, setStepData, payload } = useOnboardingStore();
  const existing = payload.step7;

  const [routines, setRoutines] = useState<RoutineOption[]>([]);
  const [loadingRoutines, setLoadingRoutines] = useState(true);

  useEffect(() => {
    listMyRoutines()
      .then((r) => {
        if (r.ok) {
          setRoutines(
            r.value.map((t) => ({ id: t.id, name: t.name })),
          );
        }
      })
      .finally(() => setLoadingRoutines(false));
  }, []);

  const form = useForm<Step7Input>({
    resolver: zodResolver(step7Schema),
    defaultValues: {
      monthlyPriceCRC: existing?.monthlyPriceCRC ?? undefined,
      routineTemplateId: existing?.routineTemplateId ?? "",
      notes: existing?.notes ?? "",
    },
  });

  const onSubmit = async (data: Step7Input) => {
    // Normalize empty string to undefined for optional field
    const clean: Step7Input = {
      ...data,
      routineTemplateId: data.routineTemplateId || undefined,
      notes: data.notes || undefined,
    };
    const result = await saveOnboardingStep(draftId, 7, clean);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setStepData("step7", clean);
    goNext();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
        <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#A1A1AA]">
            Plan y precio
          </h2>

          {/* Price */}
          <FormField
            control={form.control}
            name="monthlyPriceCRC"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mensualidad (CRC) *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#71717A]">
                      ₡
                    </span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      step="1000"
                      placeholder="50000"
                      className="pl-7"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? e.target.valueAsNumber : undefined,
                        )
                      }
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Routine */}
          <FormField
            control={form.control}
            name="routineTemplateId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rutina asignada (opcional)</FormLabel>
                <FormControl>
                  {loadingRoutines ? (
                    <div className="flex items-center gap-2 rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-[#71717A]" />
                      <span className="text-sm text-[#71717A]">Cargando rutinas...</span>
                    </div>
                  ) : (
                    <select
                      className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] focus-visible:border-[#3B82F6] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3B82F6]"
                      {...field}
                      value={field.value ?? ""}
                    >
                      <option value="">Sin rutina por ahora</option>
                      {routines.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  )}
                </FormControl>
                <FormMessage />
                {routines.length === 0 && !loadingRoutines && (
                  <p className="text-xs text-[#71717A]">
                    No tenes rutinas creadas. Podas asignar una despues desde el perfil del cliente.
                  </p>
                )}
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas privadas (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notas sobre el plan, descuentos, acuerdos especiales..."
                    rows={3}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
