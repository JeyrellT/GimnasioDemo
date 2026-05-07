"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { requestMagicLink } from "@/app/actions/auth";

const schema = z.object({
  email: z.string().email("Ingresá un correo válido"),
  name: z
    .string()
    .min(2, "Nombre muy corto")
    .max(100, "Nombre muy largo"),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido (YYYY-MM-DD)"),
});

type FormValues = z.infer<typeof schema>;

interface SignUpFormProps {
  defaultEmail?: string;
  callbackUrl?: string;
  onSuccess?: () => void;
}

export function SignUpForm({ defaultEmail, callbackUrl, onSuccess }: SignUpFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: defaultEmail ?? "",
      name: "",
      dateOfBirth: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    // TODO(backend-api): call createUser(values) before sending magic link.
    // For now, magic link flow handles account creation via Auth.js.
    const result = await requestMagicLink(values.email, callbackUrl ?? "/inicio");
    if (!result.ok) {
      toast.error("No se pudo crear la cuenta. Reintentá.");
      return;
    }
    onSuccess?.();
    toast.success("Revisá tu correo para continuar.");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre completo</FormLabel>
              <FormControl>
                <Input
                  placeholder="Andrea Solano"
                  autoComplete="name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                  disabled={!!defaultEmail}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de nacimiento</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  autoComplete="bday"
                  {...field}
                />
              </FormControl>
              <FormDescription>Debés tener al menos 15 años.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {form.formState.isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
        </Button>
      </form>
    </Form>
  );
}
