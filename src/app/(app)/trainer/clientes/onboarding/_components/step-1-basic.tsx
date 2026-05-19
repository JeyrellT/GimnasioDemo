"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { step1Schema, type Step1Input } from "@/lib/validation/onboarding.schema";
import { saveOnboardingStep, checkEmailAvailable } from "@/app/actions/onboarding";
import { useOnboardingStore } from "@/stores/onboarding-wizard-store";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Costa Rica cantons (short list for MVP — full list deferred)
const CR_CANTONES = [
  "San José", "Escazú", "Desamparados", "Puriscal", "Tarrazú", "Aserrí",
  "Mora", "Goicoechea", "Santa Ana", "Alajuelita", "Tibás", "Moravia",
  "Montes de Oca", "Turrubares", "Dota", "Curridabat", "Pérez Zeledón",
  "Alajuela", "San Ramón", "Grecia", "Palmares", "Poás", "Orotina",
  "Cartago", "Paraíso", "La Unión", "Jiménez", "Turrialba",
  "Heredia", "Barva", "Santo Domingo", "Santa Bárbara", "San Rafael",
  "Liberia", "Nicoya", "Santa Cruz", "Bagaces", "Cañas",
  "Limón", "Pococí", "Siquirres", "Talamanca",
  "Puntarenas", "Esparza", "Buenos Aires", "Montes de Oro",
];

interface Step1BasicProps {
  draftId: string;
}

export function Step1Basic({ draftId }: Step1BasicProps) {
  const { goNext, setStepData, payload } = useOnboardingStore();
  const emailCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const existing = payload.step1;

  const form = useForm<Step1Input>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: existing?.name ?? "",
      email: existing?.email ?? "",
      phone: existing?.phone ?? "",
      dateOfBirth: existing?.dateOfBirth ?? "",
      gender: existing?.gender ?? undefined,
      address: existing?.address ?? "",
      locationCity: existing?.locationCity ?? "",
    },
  });

  // Pre-fill from cédula extraction if step2 has data and step1 was not yet saved
  useEffect(() => {
    const ext = payload.step2?.extracted;
    if (!ext?.approved || existing) return;

    if (ext.fullName) form.setValue("name", ext.fullName, { shouldDirty: true });
    if (ext.dateOfBirth) form.setValue("dateOfBirth", ext.dateOfBirth, { shouldDirty: true });
    if (ext.gender) form.setValue("gender", ext.gender, { shouldDirty: true });
  }, [payload.step2?.extracted, existing, form]);

  async function handleEmailBlur(email: string) {
    if (!email || !email.includes("@")) return;
    const result = await checkEmailAvailable(email);
    if (result.ok && !result.value.available) {
      form.setError("email", {
        message: "Ya existe una cuenta con ese correo. Ingresá otro.",
      });
    }
  }

  function scheduleEmailCheck(email: string) {
    if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current);
    emailCheckTimeout.current = setTimeout(() => handleEmailBlur(email), 600);
  }

  const onSubmit = async (data: Step1Input) => {
    const result = await saveOnboardingStep(draftId, 1, data);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setStepData("step1", data);
    goNext();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >
        <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#A1A1AA]">
            Datos personales
          </h2>

          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre completo *</FormLabel>
                <FormControl>
                  <Input placeholder="Ana Vargas Mora" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A]"
                      aria-hidden="true"
                    />
                    <Input
                      type="email"
                      placeholder="ana@ejemplo.com"
                      className="pl-9"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        scheduleEmailCheck(e.target.value);
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Phone */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    placeholder="8888-8888"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* DOB */}
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de nacimiento *</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Gender */}
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Género *</FormLabel>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      ["MALE", "Masculino"],
                      ["FEMALE", "Femenino"],
                      ["OTHER", "Otro"],
                      ["PREFER_NOT_SAY", "Sin especificar"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => field.onChange(value)}
                      className={`rounded-lg border py-2.5 text-xs font-semibold transition-colors min-h-[44px] ${
                        field.value === value
                          ? "border-brand-primary bg-brand-primary/15 text-brand-primary"
                          : "border-[#3F3F46] bg-[#27272A] text-[#A1A1AA] hover:border-[#52525B]"
                      }`}
                      aria-pressed={field.value === value}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Optional fields */}
        <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#A1A1AA]">
            Ubicación (opcional)
          </h2>

          <FormField
            control={form.control}
            name="locationCity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Canton</FormLabel>
                <FormControl>
                  <select
                    className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
                    {...field}
                    value={field.value ?? ""}
                  >
                    <option value="">Seleccioná un cantón</option>
                    {CR_CANTONES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Del parque 100m norte..."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Nav */}
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {form.formState.isSubmitting ? "Guardando..." : "Siguiente →"}
        </Button>
      </form>
    </Form>
  );
}
