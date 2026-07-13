"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
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
import { requestMagicLink } from "@/app/actions/auth";
import { safeRedirect } from "@/lib/safe-redirect";

const passwordSchema = z.object({
  email: z.string().email("Ingresá un correo válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

const magicLinkSchema = z.object({
  email: z.string().email("Ingresá un correo válido"),
});

type PasswordValues = z.infer<typeof passwordSchema>;
type MagicValues = z.infer<typeof magicLinkSchema>;

interface SignInFormProps {
  callbackUrl?: string;
  onSuccess?: () => void;
  /** Optional email to pre-fill (e.g. from the super-admin quick-access link).
   *  Convenience only — the password is always required, never bypassed. */
  defaultEmail?: string;
}

export function SignInForm({ callbackUrl = "/inicio", onSuccess, defaultEmail = "" }: SignInFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [showPassword, setShowPassword] = useState(false);

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: defaultEmail, password: "" },
  });

  const magicForm = useForm<MagicValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: defaultEmail },
  });

  const onPasswordSubmit = async (values: PasswordValues) => {
    const result = await signIn("credentials", {
      email: values.email.trim().toLowerCase(),
      password: values.password,
      redirect: false,
    });

    if (!result || result.error) {
      toast.error("Email o contraseña incorrectos.");
      return;
    }

    toast.success("Bienvenido a Blackline Fitness.");
    onSuccess?.();
    router.push(safeRedirect(callbackUrl, "/inicio"));
    router.refresh();
  };

  const onMagicSubmit = async (values: MagicValues) => {
    const fd = new FormData();
    fd.set("email", values.email.trim().toLowerCase());
    if (callbackUrl) fd.set("callbackUrl", callbackUrl);

    const result = await requestMagicLink(fd);
    if (!result.ok) {
      toast.error("No se pudo enviar el enlace. Reintenta.");
      return;
    }
    onSuccess?.();
    toast.success("Revisa tu correo para ingresar.");
  };

  if (mode === "password") {
    return (
      <div className="space-y-4">
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <FormField
              control={passwordForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="vos@ejemplo.com"
                      autoComplete="email"
                      inputMode="email"
                      autoFocus={!defaultEmail}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="pr-10"
                        autoFocus={Boolean(defaultEmail)}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
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
            <div className="flex justify-end -mt-1">
              <Link
                href="/recuperar"
                className="text-xs text-[#A1A1AA] hover:text-[#FAFAFA] underline-offset-4 hover:underline transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={passwordForm.formState.isSubmitting}
            >
              {passwordForm.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Lock className="h-4 w-4" aria-hidden="true" />
              )}
              {passwordForm.formState.isSubmitting ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </Form>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[#3F3F46]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#18181B] px-2 text-[#71717A]">o</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMode("magic")}
          className="w-full text-sm text-[#A1A1AA] hover:text-[#FAFAFA] underline-offset-4 hover:underline transition-colors"
        >
          Prefiero un enlace al correo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Form {...magicForm}>
        <form onSubmit={magicForm.handleSubmit(onMagicSubmit)} className="space-y-4">
          <FormField
            control={magicForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="vos@ejemplo.com"
                    autoComplete="email"
                    inputMode="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={magicForm.formState.isSubmitting}
          >
            {magicForm.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mail className="h-4 w-4" aria-hidden="true" />
            )}
            {magicForm.formState.isSubmitting ? "Enviando..." : "Enviame el link"}
          </Button>
        </form>
      </Form>

      <button
        type="button"
        onClick={() => setMode("password")}
        className="w-full text-sm text-[#A1A1AA] hover:text-[#FAFAFA] underline-offset-4 hover:underline transition-colors"
      >
        Prefiero contraseña
      </button>
    </div>
  );
}
