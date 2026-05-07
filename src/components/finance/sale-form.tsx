"use client";

// =============================================================================
// FORJA — SaleForm (One-off sales)
// Calls createOneOffSale server action.
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/shared/currency-input";
import { createOneOffSale } from "@/app/actions/finance";

// ── Constants ─────────────────────────────────────────────────────────────────

const INCOME_CATEGORIES = [
  { value: "SESION_PT",        label: "Sesión de entrenamiento personal" },
  { value: "EVALUACION_INICIAL", label: "Evaluación inicial" },
  { value: "PLAN_NUTRICIONAL", label: "Plan nutricional" },
  { value: "CLASE_GRUPAL",     label: "Clase grupal" },
  { value: "ASESORIA_ONLINE",  label: "Asesoría online" },
  { value: "PRODUCTO",         label: "Venta de producto" },
  { value: "OTROS",            label: "Otros" },
] as const;

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  occurredAt: z.string().min(1, "Fecha requerida"),
  clientUserId: z.string().optional(),
  category: z.enum([
    "SESION_PT", "EVALUACION_INICIAL", "PLAN_NUTRICIONAL",
    "CLASE_GRUPAL", "ASESORIA_ONLINE", "PRODUCTO", "OTROS",
  ], { required_error: "Elegí un tipo" }),
  amountCRC: z.number({ invalid_type_error: "Monto requerido" }).positive("Debe ser mayor a 0"),
  paymentMethod: z.string().max(80).optional(),
  paidStatus: z.enum(["PAID", "PENDING"]),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SaleFormProps {
  clients: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SaleForm({ clients, onSuccess, onCancel }: SaleFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      occurredAt: todayISO(),
      clientUserId: undefined,
      category: undefined,
      amountCRC: 0,
      paymentMethod: "",
      paidStatus: "PAID",
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
        paidStatus: values.paidStatus,
        ...(values.clientUserId ? { clientUserId: values.clientUserId } : {}),
        ...(values.description?.trim() ? { description: values.description.trim() } : {}),
      };

      const result = await createOneOffSale(payload);

      if (!result.ok) {
        toast.error(result.error.message ?? "No se pudo registrar la venta.");
        return;
      }

      toast.success(`Venta registrada · ₡${formatPreview(values.amountCRC)}`);
      form.reset({
        occurredAt: todayISO(), clientUserId: undefined, category: undefined,
        amountCRC: 0, paymentMethod: "", paidStatus: "PAID", description: "",
      });
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
                  className="bg-[#09090B] border-[#3F3F46] focus:border-[#FF6A1A] h-11 text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Cliente (opcional) */}
        {clients.length > 0 && (
          <FormField
            control={form.control}
            name="clientUserId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                  Cliente <span className="text-[#71717A]">(opcional)</span>
                </FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                  value={field.value ?? "__none__"}
                >
                  <FormControl>
                    <SelectTrigger className="bg-[#09090B] border-[#3F3F46] h-11 text-sm">
                      <SelectValue placeholder="Sin cliente específico" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-[#18181B] border-[#3F3F46]">
                    <SelectItem value="__none__" className="text-sm text-[#71717A]">Sin cliente específico</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-sm">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Tipo */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                Tipo <span className="text-[#FF6A1A]">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger className="bg-[#09090B] border-[#3F3F46] h-11 text-sm">
                    <SelectValue placeholder="Elegí un tipo de ingreso" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-[#18181B] border-[#3F3F46]">
                  {INCOME_CATEGORIES.map((c) => (
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

        {/* Método de pago */}
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">
                Método de pago <span className="text-[#71717A]">(opcional)</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Sinpe, Efectivo, Tarjeta..."
                  className="bg-[#09090B] border-[#3F3F46] focus:border-[#FF6A1A] h-11 text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Estado de pago */}
        <FormField
          control={form.control}
          name="paidStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wide text-[#A1A1AA]">Estado</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="PAID" id="status-paid" />
                    <Label htmlFor="status-paid" className="cursor-pointer text-sm text-[#FAFAFA]">
                      Pagado
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="PENDING" id="status-pending" />
                    <Label htmlFor="status-pending" className="cursor-pointer text-sm text-[#A1A1AA]">
                      Pendiente
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  placeholder="Notas adicionales..."
                  maxLength={500}
                  className="bg-[#09090B] border-[#3F3F46] focus-visible:ring-[#FF6A1A] text-sm resize-none min-h-[72px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Preview */}
        {amountCRC > 0 && (
          <p className="text-xs text-[#71717A] text-right">
            Monto: <span className="font-semibold text-[#FAFAFA]">₡{formatPreview(amountCRC)}</span>
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
              "Registrar venta"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
