"use client";

// =============================================================================
// VIZION — ExpenseForm
// Calls createExpense server action. Works inside Dialog or standalone.
// =============================================================================

import { useTransition } from "react";
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
import { CurrencyInput } from "@/components/shared/currency-input";
import { createExpense } from "@/app/actions/finance";

// ── Constants ─────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  { value: "TRANSPORTE",             label: "Transporte" },
  { value: "ALQUILER_ESPACIO",       label: "Alquiler de espacio" },
  { value: "EQUIPO",                 label: "Equipo / material" },
  { value: "MARKETING",              label: "Marketing" },
  { value: "EDUCACION",              label: "Educación / cursos" },
  { value: "SOFTWARE",               label: "Software / apps" },
  { value: "COMIDAS",                label: "Comidas / alimentación" },
  { value: "IMPUESTOS",              label: "Impuestos / Hacienda" },
  { value: "SERVICIOS_PROFESIONALES", label: "Servicios profesionales" },
  { value: "OTROS",                  label: "Otros" },
] as const;

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  occurredAt: z.string().min(1, "Fecha requerida"),
  amountCRC: z.number({ invalid_type_error: "Monto requerido" }).positive("Debe ser mayor a 0"),
  category: z.enum([
    "TRANSPORTE", "ALQUILER_ESPACIO", "EQUIPO", "MARKETING", "EDUCACION",
    "SOFTWARE", "COMIDAS", "IMPUESTOS", "SERVICIOS_PROFESIONALES", "OTROS",
  ], { required_error: "Elegí una categoría" }),
  locationId: z.string().optional(),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ExpenseFormProps {
  locations: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExpenseForm({ locations, onSuccess, onCancel }: ExpenseFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      occurredAt: todayISO(),
      amountCRC: 0,
      category: undefined,
      locationId: undefined,
      description: "",
    },
  });

  const amountCRC = form.watch("amountCRC");

  function formatPreview(n: number): string {
    return new Intl.NumberFormat("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  }

  async function onSubmit(values: FormValues) {
    startTransition(async () => {
      const payload = {
        occurredAt: new Date(`${values.occurredAt}T12:00:00`).toISOString(),
        amountCRC: values.amountCRC,
        category: values.category,
        ...(values.locationId ? { locationId: values.locationId } : {}),
        ...(values.description?.trim() ? { description: values.description.trim() } : {}),
      };

      const result = await createExpense(payload);

      if (!result.ok) {
        toast.error(result.error.message ?? "No se pudo registrar el gasto.");
        return;
      }

      toast.success(`Gasto registrado · ₡${formatPreview(values.amountCRC)}`);
      form.reset({ occurredAt: todayISO(), amountCRC: 0, category: undefined, locationId: undefined, description: "" });
      router.refresh();
      onSuccess?.();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Fecha */}
        <FormField
          control={form.control}
          name="occurredAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">Fecha</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  max={todayISO()}
                  className="bg-[#09090B] border-[#3F3F46] focus:border-[#FF6A1A] h-11 text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Monto */}
        <FormField
          control={form.control}
          name="amountCRC"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                Monto <span className="text-[#FF6A1A]">*</span>
              </FormLabel>
              <FormControl>
                <CurrencyInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="0"
                  error={form.formState.errors.amountCRC?.message}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Categoría */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                Categoría <span className="text-[#FF6A1A]">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger className="bg-[#09090B] border-[#3F3F46] h-11 text-sm">
                    <SelectValue placeholder="Elegí una categoría" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-[#18181B] border-[#3F3F46]">
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-sm">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Ubicación (opcional) */}
        {locations.length > 0 && (
          <FormField
            control={form.control}
            name="locationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                  Ubicación <span className="text-[#71717A]">(opcional)</span>
                </FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                  value={field.value ?? "__none__"}
                >
                  <FormControl>
                    <SelectTrigger className="bg-[#09090B] border-[#3F3F46] h-11 text-sm">
                      <SelectValue placeholder="Sin ubicación" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-[#18181B] border-[#3F3F46]">
                    <SelectItem value="__none__" className="text-sm text-[#71717A]">Sin ubicación</SelectItem>
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
        )}

        {/* Descripción */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                Descripción <span className="text-[#71717A]">(opcional)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ej: Uniforme nuevo, cuota mensual gym..."
                  maxLength={500}
                  className="bg-[#09090B] border-[#3F3F46] focus-visible:ring-[#FF6A1A] text-sm resize-none min-h-[72px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Preview amount */}
        {amountCRC > 0 && (
          <p className="text-xs text-[#71717A] text-right">
            Total: <span className="font-semibold text-[#FAFAFA]">₡{formatPreview(amountCRC)}</span>
          </p>
        )}

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
            disabled={pending}
            className="flex-1 bg-[#FF6A1A] hover:bg-[#E55A0E] text-white h-11 font-semibold disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Guardando...
              </>
            ) : (
              "Registrar gasto"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
