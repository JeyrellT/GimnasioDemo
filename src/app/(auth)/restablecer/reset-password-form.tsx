"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from "lucide-react";
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
import { resetPassword } from "@/app/actions/auth";

const schema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirmá tu contraseña"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type Values = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const linkIsMissing = !token || !email;

  async function onSubmit(values: Values) {
    const fd = new FormData();
    fd.set("token", token);
    fd.set("email", email);
    fd.set("password", values.password);

    const result = await resetPassword(fd);
    if (!result.ok) {
      toast.error(
        result.error?.message ??
          "No se pudo cambiar la contraseña. El enlace pudo expirar.",
      );
      return;
    }

    setDone(true);
    toast.success("Contraseña actualizada. Ya podés ingresar.");
    setTimeout(() => {
      router.push("/ingresar");
    }, 1500);
  }

  // Malformed / missing link — the token or email query param isn't present.
  if (linkIsMissing) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-bold text-[#FAFAFA]">Enlace inválido</h1>
        <p className="text-sm text-[#A1A1AA] text-balance">
          Este enlace de recuperación está incompleto o venció. Solicitá uno
          nuevo desde la pantalla de recuperación.
        </p>
        <Link
          href="/recuperar"
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary-hover underline-offset-4 hover:underline transition-colors"
        >
          Solicitar un nuevo enlace
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-7 w-7 text-green-400" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-[#FAFAFA]">
          ¡Contraseña actualizada!
        </h1>
        <p className="text-sm text-[#A1A1AA] text-balance">
          Te estamos llevando a la pantalla de ingreso...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-xl font-bold text-[#FAFAFA]">Nueva contraseña</h1>
        <p className="text-sm text-[#71717A] text-balance">
          Elegí una nueva contraseña para{" "}
          <strong className="text-[#A1A1AA]">{email}</strong>.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nueva contraseña</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                      className="pr-10"
                      autoFocus
                      {...field}
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
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar contraseña</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repetí tu contraseña"
                      autoComplete="new-password"
                      className="pr-10"
                      {...field}
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
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Lock className="h-4 w-4" aria-hidden="true" />
            )}
            {form.formState.isSubmitting ? "Guardando..." : "Cambiar contraseña"}
          </Button>
        </form>
      </Form>

      <Link
        href="/ingresar"
        className="flex items-center justify-center gap-1.5 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] underline-offset-4 hover:underline transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a ingresar
      </Link>
    </div>
  );
}
