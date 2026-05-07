"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { SkipForward, ArrowRight } from "lucide-react";
import { saveTrainerBillingData } from "@/app/actions/billing";
import { toast } from "sonner";

const schema = z.object({
  cedulaType: z.enum(["FISICA", "JURIDICA"], {
    required_error: "Seleccioná el tipo de cédula",
  }),
  cedulaNumber: z
    .string()
    .trim()
    .min(9, "Mínimo 9 dígitos")
    .max(12, "Máximo 12 dígitos")
    .regex(/^\d[-\d]*$/, "Solo números y guiones"),
  haciendaId: z
    .string()
    .trim()
    .min(1, "Requerido")
    .max(20, "Máximo 20 caracteres")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().min(5, "Mínimo 5 caracteres").max(300),
});

type FormValues = z.infer<typeof schema>;

export default function EntrenadorFacturacionPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { cedulaType: "FISICA" },
  });

  async function onSubmit(data: FormValues) {
    const result = await saveTrainerBillingData(data);
    if (result.ok) {
      router.push("/onboarding/entrenador/pricing");
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Datos fiscales</h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Necesario para generar facturas electrónicas Hacienda 4.4 para tus
          clientes. Podés completarlos después.
        </p>
      </div>

      <div className="rounded-xl border border-[#F59E0B]/20 bg-[#451A03] px-4 py-3">
        <p className="text-xs text-[#F59E0B]">
          Estos datos son requeridos para activar la facturación. Si los saltás
          ahora, podés ingresarlos desde Ajustes.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Cedula type */}
        <div className="space-y-1.5">
          <p className="block text-sm font-medium text-[#FAFAFA]">
            Tipo de cédula
          </p>
          <div className="flex gap-3">
            {[
              { value: "FISICA", label: "Física" },
              { value: "JURIDICA", label: "Jurídica" },
            ].map(({ value, label }) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#3F3F46] px-4 py-2.5 has-[:checked]:border-[#FF6A1A] has-[:checked]:bg-[#FF6A1A]/5 transition-colors"
              >
                <input
                  type="radio"
                  value={value}
                  {...register("cedulaType")}
                  className="sr-only"
                />
                <span className="text-sm font-medium text-[#FAFAFA]">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Cedula number */}
        <div className="space-y-1.5">
          <label
            htmlFor="cedulaNumber"
            className="block text-sm font-medium text-[#FAFAFA]"
          >
            Número de cédula
          </label>
          <input
            id="cedulaNumber"
            type="text"
            placeholder="1-1234-5678"
            {...register("cedulaNumber")}
            className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#71717A] focus-visible:border-[#FF6A1A] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF6A1A]"
          />
          {errors.cedulaNumber && (
            <p role="alert" className="text-xs text-[#EF4444]">
              {errors.cedulaNumber.message}
            </p>
          )}
        </div>

        {/* Hacienda number */}
        <div className="space-y-1.5">
          <label
            htmlFor="haciendaId"
            className="block text-sm font-medium text-[#FAFAFA]"
          >
            Número Hacienda 4.4{" "}
            <span className="text-[#71717A]">(opcional)</span>
          </label>
          <input
            id="haciendaId"
            type="text"
            placeholder="Ej: 50604013000010012345678400001"
            {...register("haciendaId")}
            className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#71717A] focus-visible:border-[#FF6A1A] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF6A1A]"
          />
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <label
            htmlFor="address"
            className="block text-sm font-medium text-[#FAFAFA]"
          >
            Dirección fiscal
          </label>
          <textarea
            id="address"
            rows={2}
            placeholder="Provincia, cantón, distrito, detalles..."
            {...register("address")}
            className="w-full resize-none rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#71717A] focus-visible:border-[#FF6A1A] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF6A1A]"
          />
          {errors.address && (
            <p role="alert" className="text-xs text-[#EF4444]">
              {errors.address.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6A1A] py-3.5 text-sm font-semibold text-white min-h-[48px] hover:bg-[#E55A0E] disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? "Guardando..." : "Continuar"}
            {!isSubmitting && (
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => router.push("/onboarding/entrenador/pricing")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#3F3F46] py-3.5 text-sm font-medium text-[#A1A1AA] min-h-[48px] hover:bg-[#18181B] transition-colors"
          >
            <SkipForward className="h-4 w-4" aria-hidden="true" />
            Completar después
          </button>
        </div>
      </form>
    </div>
  );
}
