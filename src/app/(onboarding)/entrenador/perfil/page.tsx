"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Camera, ArrowRight } from "lucide-react";
import { updateTrainerProfile } from "@/app/actions/clients";
import { toast } from "sonner";

const schema = z.object({
  tradeName: z.string().trim().min(2, "Mínimo 2 caracteres").max(100),
  specialty: z.string().trim().min(2, "Mínimo 2 caracteres").max(100),
  bio: z.string().trim().max(280, "Máximo 280 caracteres").optional(),
});

type FormValues = z.infer<typeof schema>;

const specialtyOptions = [
  "Entrenamiento funcional",
  "Musculación / hipertrofia",
  "Pérdida de peso",
  "Fitness general",
  "Atletismo / rendimiento",
  "Rehabilitación / lesiones",
  "Entrenamiento prenatal / postnatal",
  "Adultos mayores",
  "Otro",
];

export default function EntrenadorPerfilPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const bioValue = watch("bio") ?? "";

  async function onSubmit(data: FormValues) {
    const result = await updateTrainerProfile(data);
    if (result.ok) {
      router.push("/onboarding/entrenador/facturacion");
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Tu perfil profesional</h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Tus clientes verán esta información. Podés actualizarla cuando quieras.
        </p>
      </div>

      {/* Avatar placeholder */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          aria-label="Subir foto de perfil"
          className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-[#3F3F46] bg-[#18181B] hover:border-brand-primary transition-colors"
        >
          <Camera className="h-8 w-8 text-[#71717A]" aria-hidden="true" />
        </button>
        <p className="text-xs text-[#71717A]">Foto de perfil (opcional)</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Trade name */}
        <div className="space-y-1.5">
          <label htmlFor="tradeName" className="block text-sm font-medium text-[#FAFAFA]">
            Nombre comercial
          </label>
          <input
            id="tradeName"
            type="text"
            placeholder="Laura Mora Fitness"
            {...register("tradeName")}
            aria-describedby={errors.tradeName ? "tradeName-error" : undefined}
            className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#71717A] focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
          />
          {errors.tradeName && (
            <p id="tradeName-error" role="alert" className="text-xs text-[#EF4444]">
              {errors.tradeName.message}
            </p>
          )}
        </div>

        {/* Specialty */}
        <div className="space-y-1.5">
          <label htmlFor="specialty" className="block text-sm font-medium text-[#FAFAFA]">
            Especialidad principal
          </label>
          <select
            id="specialty"
            {...register("specialty")}
            className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
          >
            <option value="" className="text-[#71717A]">
              Seleccioná...
            </option>
            {specialtyOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errors.specialty && (
            <p role="alert" className="text-xs text-[#EF4444]">
              {errors.specialty.message}
            </p>
          )}
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <label htmlFor="bio" className="block text-sm font-medium text-[#FAFAFA]">
            Bio corta{" "}
            <span className="text-[#71717A]">(opcional)</span>
          </label>
          <textarea
            id="bio"
            rows={3}
            maxLength={280}
            placeholder="Tu experiencia, filosofía de entrenamiento..."
            {...register("bio")}
            className="w-full resize-none rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#71717A] focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
          />
          <p className="text-right text-xs text-[#71717A]">
            {bioValue.length}/280
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-3.5 text-sm font-semibold text-white min-h-[48px] hover:bg-brand-primary-hover disabled:opacity-60 transition-colors"
        >
          {isSubmitting ? "Guardando..." : "Continuar"}
          {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </form>
    </div>
  );
}
