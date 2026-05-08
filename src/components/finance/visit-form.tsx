"use client";

// =============================================================================
// VIZION — VisitForm (location visit)
// Calls createLocationVisit. Shows live cost preview based on costModel.
// =============================================================================

import { useTransition, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLocationVisit } from "@/app/actions/finance";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VisitLocation {
  id: string;
  name: string;
  costModel: string; // "FLAT" | "PER_KM" | "HYBRID"
  costPerVisitCRC: number | null;
  costPerKmCRC: number | null;
  defaultKm: number | null;
}

export interface VisitFormProps {
  locations: VisitLocation[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  locationId: z.string().min(1, "Elegí una ubicación"),
  visitedAt: z.string().min(1, "Fecha/hora requerida"),
  kmTraveled: z.coerce.number().positive().max(10_000).optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

function nowDatetimeLocal(): string {
  const now = new Date();
  // Format: YYYY-MM-DDTHH:mm (required for datetime-local input)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function formatCRC(n: number): string {
  return new Intl.NumberFormat("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VisitForm({ locations, onSuccess, onCancel }: VisitFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      locationId: "",
      visitedAt: nowDatetimeLocal(),
      kmTraveled: "",
      notes: "",
    },
  });

  const locationId = form.watch("locationId");
  const kmTraveled = form.watch("kmTraveled");

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId],
  );

  // Live cost preview
  const { previewCost, previewLabel } = useMemo(() => {
    if (!selectedLocation) return { previewCost: null, previewLabel: "" };

    const { costModel, costPerVisitCRC, costPerKmCRC, defaultKm } = selectedLocation;
    const km = typeof kmTraveled === "number" && kmTraveled > 0
      ? kmTraveled
      : defaultKm ?? 0;

    if (costModel === "FLAT" && costPerVisitCRC) {
      return {
        previewCost: costPerVisitCRC,
        previewLabel: `₡${formatCRC(costPerVisitCRC)} (visita fija)`,
      };
    }
    if (costModel === "PER_KM" && costPerKmCRC) {
      const cost = km * costPerKmCRC;
      return {
        previewCost: cost,
        previewLabel: `₡${formatCRC(cost)} (${km} km × ₡${formatCRC(costPerKmCRC)})`,
      };
    }
    if (costModel === "HYBRID") {
      const visitPart = costPerVisitCRC ?? 0;
      const kmPart = costPerKmCRC ? km * costPerKmCRC : 0;
      const total = visitPart + kmPart;
      return {
        previewCost: total,
        previewLabel: `₡${formatCRC(total)} (visita + km)`,
      };
    }
    return { previewCost: 0, previewLabel: "Sin costo" };
  }, [selectedLocation, kmTraveled]);

  // Auto-fill defaultKm when location changes
  function handleLocationChange(id: string) {
    form.setValue("locationId", id);
    const loc = locations.find((l) => l.id === id);
    if (loc?.costModel === "PER_KM" && loc.defaultKm) {
      form.setValue("kmTraveled", loc.defaultKm);
    } else {
      form.setValue("kmTraveled", "");
    }
  }

  async function onSubmit(values: FormValues) {
    startTransition(async () => {
      const payload = {
        locationId: values.locationId,
        visitedAt: new Date(values.visitedAt).toISOString(),
        ...(values.kmTraveled !== "" && values.kmTraveled !== undefined
          ? { kmTraveled: Number(values.kmTraveled) }
          : {}),
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
      };

      const result = await createLocationVisit(payload);

      if (!result.ok) {
        toast.error(result.error.message ?? "No se pudo registrar la visita.");
        return;
      }

      toast.success(
        previewLabel
          ? `Visita registrada · ${previewLabel}`
          : "Visita registrada.",
      );
      form.reset({ locationId: "", visitedAt: nowDatetimeLocal(), kmTraveled: "", notes: "" });
      router.refresh();
      onSuccess?.();
    });
  }

  const showKmField = selectedLocation &&
    (selectedLocation.costModel === "PER_KM" || selectedLocation.costModel === "HYBRID");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Ubicación */}
        <FormField
          control={form.control}
          name="locationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                Ubicación <span className="text-[#FF6A1A]">*</span>
              </FormLabel>
              <Select
                onValueChange={handleLocationChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="bg-[#09090B] border-[#3F3F46] h-11 text-sm">
                    <SelectValue placeholder="Elegí la ubicación" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-[#18181B] border-[#3F3F46]">
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-sm">
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Fecha/hora */}
        <FormField
          control={form.control}
          name="visitedAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">Fecha y hora</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  className="bg-[#09090B] border-[#3F3F46] focus:border-[#FF6A1A] h-11 text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Km recorridos — only when costModel includes PER_KM */}
        {showKmField && (
          <FormField
            control={form.control}
            name="kmTraveled"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                  Km recorridos
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={10000}
                      step={0.1}
                      placeholder={String(selectedLocation?.defaultKm ?? "0")}
                      className="bg-[#09090B] border-[#3F3F46] focus:border-[#FF6A1A] h-11 text-sm pr-10"
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
        )}

        {/* Cost preview */}
        {selectedLocation && previewLabel && (
          <div className="rounded-lg border border-[#3F3F46] bg-[#09090B] px-4 py-3">
            <p className="text-xs text-[#71717A] mb-0.5">Costo estimado</p>
            <p className="text-sm font-semibold text-[#FF6A1A]">{previewLabel}</p>
          </div>
        )}

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
                  placeholder="Notas de la visita..."
                  maxLength={500}
                  className="bg-[#09090B] border-[#3F3F46] focus-visible:ring-[#FF6A1A] text-sm resize-none min-h-[72px]"
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
              className="flex-1 border-[#3F3F46] text-[#A1A1AA] hover:border-[#FF6A1A] hover:text-[#FAFAFA] h-11"
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            disabled={pending || !locationId}
            className="flex-1 bg-[#FF6A1A] hover:bg-[#E55A0E] text-white h-11 font-semibold disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Guardando...
              </>
            ) : (
              "Registrar visita"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
