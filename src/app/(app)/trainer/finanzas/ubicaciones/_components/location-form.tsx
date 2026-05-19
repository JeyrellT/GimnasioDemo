"use client";

// =============================================================================
// BLACKLINE FITNESS — LocationForm
// Creates or updates a TrainerLocation. Handles FLAT / PER_KM cost model toggle.
// =============================================================================

import { useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CurrencyInput } from "@/components/shared/currency-input";
import { createLocation, updateLocation } from "@/app/actions/finance";
import type { TrainerLocationDTO } from "@/types/finance";

// ── Constants ─────────────────────────────────────────────────────────────────

const LOCATION_KINDS = [
  { value: "GYM",         label: "Blackline Fitness" },
  { value: "STUDIO",      label: "Estudio" },
  { value: "CLIENT_HOME", label: "Casa del cliente" },
  { value: "OUTDOOR",     label: "Exteriores" },
  { value: "HOME",        label: "Mi casa" },
  { value: "OTHER",       label: "Otro" },
] as const;

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(80),
  kind: z.enum(["GYM", "STUDIO", "CLIENT_HOME", "OUTDOOR", "HOME", "OTHER"], {
    required_error: "Elegí un tipo",
  }),
  address: z.string().trim().max(200).optional(),
  costModel: z.enum(["FLAT", "PER_KM"]),
  costPerVisitCRC: z.number().positive("Debe ser mayor a 0").optional(),
  costPerKmCRC: z.number().positive("Debe ser mayor a 0").optional(),
  defaultKm: z.coerce.number().positive().max(1000).optional().or(z.literal("")),
  monthlyRentCRC: z.number().min(0).optional(),
  notes: z.string().trim().max(500).optional(),
}).refine(
  (d) => {
    if (d.costModel === "FLAT") return d.costPerVisitCRC != null && d.costPerVisitCRC > 0;
    if (d.costModel === "PER_KM") return d.costPerKmCRC != null && d.costPerKmCRC > 0;
    return true;
  },
  { message: "Ingresá el costo según el modelo seleccionado", path: ["costPerVisitCRC"] },
);

type FormValues = z.infer<typeof schema>;

// ── Props ─────────────────────────────────────────────────────────────────────

export interface LocationFormProps {
  initial?: TrainerLocationDTO;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LocationForm({ initial, onSuccess, onCancel }: LocationFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(initial);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      kind: (initial?.kind as FormValues["kind"]) ?? "GYM",
      address: initial?.address ?? "",
      costModel: (initial?.costModel === "PER_KM" ? "PER_KM" : "FLAT") as "FLAT" | "PER_KM",
      costPerVisitCRC: initial?.costPerVisitCRC ?? undefined,
      costPerKmCRC: initial?.costPerKmCRC ?? undefined,
      defaultKm: initial?.defaultKm ?? "",
      monthlyRentCRC: initial?.monthlyRentCRC ?? undefined,
      notes: initial?.notes ?? "",
    },
  });

  const costModel = form.watch("costModel");

  // Clear cost fields when model changes to avoid stale validation errors
  useEffect(() => {
    if (costModel === "FLAT") {
      form.setValue("costPerKmCRC", undefined);
      form.clearErrors("costPerKmCRC");
    } else {
      form.setValue("costPerVisitCRC", undefined);
      form.clearErrors("costPerVisitCRC");
    }
  }, [costModel, form]);

  async function onSubmit(values: FormValues) {
    startTransition(async () => {
      if (isEdit && initial) {
        const payload = {
          id: initial.id,
          name: values.name,
          kind: values.kind,
          address: values.address || null,
          costModel: values.costModel,
          costPerVisitCRC: values.costModel === "FLAT" ? (values.costPerVisitCRC ?? null) : null,
          costPerKmCRC: values.costModel === "PER_KM" ? (values.costPerKmCRC ?? null) : null,
          defaultKm: values.defaultKm !== "" ? Number(values.defaultKm) : null,
          monthlyRentCRC: values.monthlyRentCRC ?? null,
          notes: values.notes?.trim() || null,
        };

        const result = await updateLocation(payload);
        if (!result.ok) {
          toast.error(result.error.message ?? "No se pudo actualizar la ubicación.");
          return;
        }
        toast.success("Ubicación actualizada.");
      } else {
        const payload = {
          name: values.name,
          kind: values.kind,
          address: values.address?.trim() || undefined,
          costModel: values.costModel,
          costPerVisitCRC: values.costModel === "FLAT" ? values.costPerVisitCRC : undefined,
          costPerKmCRC: values.costModel === "PER_KM" ? values.costPerKmCRC : undefined,
          defaultKm: values.defaultKm !== "" ? Number(values.defaultKm) : undefined,
          monthlyRentCRC: values.monthlyRentCRC,
          notes: values.notes?.trim() || undefined,
        };

        const result = await createLocation(payload);
        if (!result.ok) {
          toast.error(result.error.message ?? "No se pudo crear la ubicación.");
          return;
        }
        toast.success("Ubicación creada.");
      }

      router.refresh();
      onSuccess?.();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Nombre */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                Nombre <span className="text-brand-primary">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: Fitness Club San José"
                  maxLength={80}
                  className="bg-[#09090B] border-[#3F3F46] focus:border-brand-primary h-11 text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tipo */}
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                Tipo <span className="text-brand-primary">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-[#09090B] border-[#3F3F46] h-11 text-sm">
                    <SelectValue placeholder="Elegí un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-[#18181B] border-[#3F3F46]">
                  {LOCATION_KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value} className="text-sm">
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dirección */}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                Dirección <span className="text-[#71717A]">(opcional)</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: Escazú, San José"
                  maxLength={200}
                  className="bg-[#09090B] border-[#3F3F46] focus:border-brand-primary h-11 text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Modelo de costo */}
        <FormField
          control={form.control}
          name="costModel"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                Modelo de costo
              </FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="FLAT" id="cm-flat" />
                    <Label htmlFor="cm-flat" className="cursor-pointer text-sm text-[#FAFAFA]">
                      Costo fijo por visita
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="PER_KM" id="cm-km" />
                    <Label htmlFor="cm-km" className="cursor-pointer text-sm text-[#FAFAFA]">
                      Por km recorrido
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* FLAT: costo por visita */}
        {costModel === "FLAT" && (
          <FormField
            control={form.control}
            name="costPerVisitCRC"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                  Costo por visita <span className="text-brand-primary">*</span>
                </FormLabel>
                <FormControl>
                  <CurrencyInput
                    value={field.value ?? 0}
                    onChange={field.onChange}
                    placeholder="0"
                    error={form.formState.errors.costPerVisitCRC?.message}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* PER_KM: costo por km + km típicos */}
        {costModel === "PER_KM" && (
          <>
            <FormField
              control={form.control}
              name="costPerKmCRC"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                    Costo por km <span className="text-brand-primary">*</span>
                  </FormLabel>
                  <FormControl>
                    <CurrencyInput
                      value={field.value ?? 0}
                      onChange={field.onChange}
                      placeholder="0"
                      error={form.formState.errors.costPerKmCRC?.message}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultKm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                    Km típicos <span className="text-[#71717A]">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={1000}
                        step={0.1}
                        placeholder="0"
                        className="bg-[#09090B] border-[#3F3F46] focus:border-brand-primary h-11 text-sm pr-10"
                        value={field.value === "" ? "" : field.value}
                        onChange={(e) => field.onChange(e.target.value === "" ? "" : e.target.valueAsNumber)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#52525B]">km</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* Alquiler mensual */}
        <FormField
          control={form.control}
          name="monthlyRentCRC"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                Alquiler mensual <span className="text-[#71717A]">(opcional)</span>
              </FormLabel>
              <FormControl>
                <CurrencyInput
                  value={field.value ?? 0}
                  onChange={(v) => field.onChange(v === 0 ? undefined : v)}
                  placeholder="0"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notas */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                Notas <span className="text-[#71717A]">(opcional)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detalles sobre el lugar, acceso, estacionamiento..."
                  maxLength={500}
                  className="bg-[#09090B] border-[#3F3F46] focus-visible:ring-brand-primary text-sm resize-none min-h-[72px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={pending}
              className="flex-1 border-[#3F3F46] text-[#A1A1AA] hover:border-brand-primary hover:text-[#FAFAFA] h-11"
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            disabled={pending}
            className="flex-1 bg-brand-primary hover:bg-brand-primary-hover text-white h-11 font-semibold disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Guardando...
              </>
            ) : isEdit ? (
              "Guardar cambios"
            ) : (
              "Crear ubicación"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
