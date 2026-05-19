"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dumbbell, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useAuth } from "@/components/providers/auth-provider";
import { completeFirstLogin } from "@/app/actions/clients";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z
  .object({
    name: z.string().trim().max(100, "Máximo 100 caracteres").optional(),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirmá tu contraseña"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Shared input style
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] " +
  "placeholder-[#71717A] transition-[border-color,box-shadow] duration-150 " +
  "focus-visible:border-[#3B82F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/30";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BienvenidaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { update: refreshSession } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "",
    },
  });

  async function onSubmit(data: FormValues) {
    const result = await completeFirstLogin({
      password: data.password,
      name: data.name || undefined,
    });

    if (result.ok) {
      // Refresh the JWT so the middleware stops redirecting back here.
      // The jwt callback re-reads mustChangePassword from the DB on trigger=update.
      await refreshSession();
      toast.success("¡Todo listo! Bienvenido a Blackline Fitness.");
      router.push("/client/rutinas");
    } else {
      toast.error(result.error?.message ?? "Ocurrió un error. Reintentá.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090B] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-[#3F3F46] bg-[#18181B] p-8 shadow-2xl">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3B82F6]/15">
              <Dumbbell className="h-7 w-7 text-[#3B82F6]" aria-hidden="true" />
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8 space-y-2 text-center">
            <h1 className="text-2xl font-bold text-[#FAFAFA]">
              ¡Bienvenido a{" "}
              <span className="text-[#3B82F6]">Blackline Fitness</span>!
            </h1>
            <p className="text-sm text-[#71717A]">
              Configurá tu contraseña personal para empezar
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Nombre */}
            <div className="space-y-1.5">
              <label
                htmlFor="bienvenida-name"
                className="block text-sm font-medium text-[#FAFAFA]"
              >
                Tu nombre{" "}
                <span className="font-normal text-[#71717A]">(opcional)</span>
              </label>
              <input
                id="bienvenida-name"
                type="text"
                autoComplete="name"
                autoFocus
                placeholder="Nombre completo"
                aria-describedby="bienvenida-name-hint"
                className={inputCls}
                {...register("name")}
              />
              <p id="bienvenida-name-hint" className="text-xs text-[#52525B]">
                Tu entrenador ya lo puede ver — podés cambiarlo cuando quieras
              </p>
              {errors.name && (
                <p role="alert" className="text-xs text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Nueva contraseña */}
            <div className="space-y-1.5">
              <label
                htmlFor="bienvenida-password"
                className="block text-sm font-medium text-[#FAFAFA]"
              >
                Nueva contraseña <span className="text-[#3B82F6]">*</span>
              </label>
              <div className="relative">
                <input
                  id="bienvenida-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "bienvenida-password-error" : undefined
                  }
                  className={`${inputCls} pr-10`}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p
                  id="bienvenida-password-error"
                  role="alert"
                  className="text-xs text-red-400"
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div className="space-y-1.5">
              <label
                htmlFor="bienvenida-confirm"
                className="block text-sm font-medium text-[#FAFAFA]"
              >
                Confirmá la contraseña <span className="text-[#3B82F6]">*</span>
              </label>
              <div className="relative">
                <input
                  id="bienvenida-confirm"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repetí tu contraseña"
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={
                    errors.confirmPassword
                      ? "bienvenida-confirm-error"
                      : undefined
                  }
                  className={`${inputCls} pr-10`}
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA] transition-colors"
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p
                  id="bienvenida-confirm-error"
                  role="alert"
                  className="text-xs text-red-400"
                >
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={[
                "mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white",
                "min-h-[48px] transition-all duration-200",
                "bg-gradient-to-r from-[#3B82F6] to-[#2563EB]",
                "shadow-[0_0_20px_rgba(255,106,26,0.30)]",
                "hover:shadow-[0_0_28px_rgba(255,106,26,0.45)] hover:brightness-110",
                "active:scale-[0.98]",
                "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none",
              ].join(" ")}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Guardando...
                </>
              ) : (
                <>
                  Empezar a entrenar
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
