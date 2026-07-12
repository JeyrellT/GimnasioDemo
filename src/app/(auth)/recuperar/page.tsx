"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react";
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
import { requestPasswordReset } from "@/app/actions/auth";

const schema = z.object({
  email: z.string().email("Ingresá un correo válido"),
});

type Values = z.infer<typeof schema>;

export default function RecuperarPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: Values) {
    const email = values.email.trim().toLowerCase();
    const fd = new FormData();
    fd.set("email", email);

    const result = await requestPasswordReset(fd);
    if (!result.ok) {
      toast.error("No se pudo procesar la solicitud. Reintentá.");
      return;
    }
    // Anti-enumeration: the server never says whether the email exists, so we
    // always show the same confirmation screen.
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10">
          <MailCheck className="h-7 w-7 text-brand-primary" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-[#FAFAFA]">Revisá tu correo</h1>
        <p className="text-sm text-[#A1A1AA] text-balance">
          Si <strong className="text-[#FAFAFA]">{sentTo}</strong> tiene una
          cuenta, te enviamos un enlace para restablecer tu contraseña. Expira
          en 30 minutos.
        </p>
        <p className="text-xs text-[#71717A]">
          ¿No lo encontrás? Revisá la carpeta de spam o correo no deseado.
        </p>
        <Link
          href="/ingresar"
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] underline-offset-4 hover:underline transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver a ingresar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-xl font-bold text-[#FAFAFA]">
          Recuperar contraseña
        </h1>
        <p className="text-sm text-[#71717A] text-balance">
          Ingresá tu correo y te mandamos un enlace para crear una nueva
          contraseña.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
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
                    autoFocus
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
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mail className="h-4 w-4" aria-hidden="true" />
            )}
            {form.formState.isSubmitting ? "Enviando..." : "Enviarme el enlace"}
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
