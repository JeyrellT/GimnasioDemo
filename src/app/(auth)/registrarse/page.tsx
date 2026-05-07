"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { registerUser } from "@/app/actions/auth";
import { toast } from "sonner";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres"),
  email: z
    .string()
    .trim()
    .min(1, "El email es requerido")
    .email("Email inválido"),
  role: z.enum(["TRAINER", "CLIENT"], {
    required_error: "Seleccioná tu rol",
  }),
});

type FormValues = z.infer<typeof schema>;

export default function RegistrarsePage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "TRAINER" },
  });

  async function onSubmit(data: FormValues) {
    const result = await registerUser(data);
    if (result.ok) {
      setSent(true);
    } else {
      toast.error(result.error.message);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-bold text-[#FAFAFA]">Revisá tu correo</h1>
        <p className="text-sm text-[#A1A1AA] text-balance">
          Mandamos un link de acceso a tu email. Hacé click ahí para continuar.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-[#FAFAFA]">Crear tu cuenta</h1>
      <p className="mb-6 text-sm text-[#71717A]">30 días gratis. Sin tarjeta.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium text-[#FAFAFA]">
            Nombre completo
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Tu nombre"
            aria-describedby={errors.name ? "name-error" : undefined}
            {...register("name")}
            className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#71717A] focus-visible:border-[#FF6A1A] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF6A1A] transition-colors"
          />
          {errors.name && (
            <p id="name-error" role="alert" className="text-xs text-[#EF4444]">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-[#FAFAFA]">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="vos@ejemplo.com"
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
            className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#71717A] focus-visible:border-[#FF6A1A] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF6A1A] transition-colors"
          />
          {errors.email && (
            <p id="email-error" role="alert" className="text-xs text-[#EF4444]">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Role */}
        <div className="space-y-1.5">
          <p className="block text-sm font-medium text-[#FAFAFA]">
            Soy...
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "TRAINER", label: "Entrenador/a", sub: "Gestiono clientes" },
              { value: "CLIENT", label: "Cliente", sub: "Tengo un entrenador" },
            ].map(({ value, label, sub }) => (
              <label
                key={value}
                className="relative cursor-pointer rounded-xl border border-[#3F3F46] p-4 has-[:checked]:border-[#FF6A1A] has-[:checked]:bg-[#FF6A1A]/5 transition-colors"
              >
                <input
                  type="radio"
                  value={value}
                  {...register("role")}
                  className="sr-only"
                />
                <p className="text-sm font-semibold text-[#FAFAFA]">{label}</p>
                <p className="text-xs text-[#71717A]">{sub}</p>
              </label>
            ))}
          </div>
          {errors.role && (
            <p role="alert" className="text-xs text-[#EF4444]">
              {errors.role.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF6A1A] py-3 text-sm font-semibold text-white min-h-[44px] hover:bg-[#E55A0E] disabled:opacity-60 transition-colors"
        >
          {isSubmitting ? (
            "Creando cuenta..."
          ) : (
            <>
              Crear cuenta gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-[#71717A]">
        Ya tenés cuenta?{" "}
        <Link
          href="/ingresar"
          className="text-[#FF6A1A] hover:text-[#E55A0E] transition-colors"
        >
          Ingresá
        </Link>
      </p>
    </>
  );
}
