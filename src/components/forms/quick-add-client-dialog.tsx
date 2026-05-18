"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { quickAddClient } from "@/app/actions/clients";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  email: z.string().trim().email("Correo electrónico inválido"),
  name: z.string().trim().max(100, "Máximo 100 caracteres").optional(),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Shared input class (matches existing Vizion dark style)
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] " +
  "placeholder-[#71717A] transition-[border-color,box-shadow] duration-150 " +
  "focus-visible:border-[#FF6A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A1A]/30";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface QuickAddClientDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuickAddClientDialog({
  open,
  onClose,
  onSuccess,
}: QuickAddClientDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // Reset form + autofocus email when dialog opens
  useEffect(() => {
    if (open) {
      reset();
      // Small delay so the element is mounted before focusing
      setTimeout(() => {
        const el = document.getElementById("qac-email");
        if (el instanceof HTMLInputElement) el.focus();
      }, 50);
    }
  }, [open, reset]);

  // ESC closes dialog
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(data: FormValues) {
    const result = await quickAddClient({
      email: data.email,
      name: data.name || undefined,
    });

    if (result.ok) {
      toast.success(`Invitación enviada a ${data.email}`);
      reset();
      onClose();
      onSuccess();
    } else {
      toast.error(result.error?.message ?? "No se pudo enviar la invitación. Reintentá.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-add-client-title"
    >
      <div className="w-full max-w-sm rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3
            id="quick-add-client-title"
            className="text-sm font-semibold text-[#FAFAFA]"
          >
            Agregar cliente
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-[#71717A] hover:bg-[#27272A] hover:text-[#FAFAFA] transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="qac-email"
              className="block text-sm font-medium text-[#FAFAFA]"
            >
              Correo electrónico <span className="text-[#FF6A1A]">*</span>
            </label>
            <input
              id="qac-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="cliente@ejemplo.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "qac-email-error" : undefined}
              className={inputCls}
              {...register("email")}
            />
            {errors.email && (
              <p
                id="qac-email-error"
                role="alert"
                className="text-xs text-red-400"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Nombre (opcional) */}
          <div className="space-y-1.5">
            <label
              htmlFor="qac-name"
              className="block text-sm font-medium text-[#FAFAFA]"
            >
              Nombre{" "}
              <span className="text-[#71717A] font-normal">(opcional)</span>
            </label>
            <input
              id="qac-name"
              type="text"
              autoComplete="off"
              placeholder="Nombre del cliente"
              aria-describedby="qac-name-hint"
              className={inputCls}
              {...register("name")}
            />
            <p id="qac-name-hint" className="text-xs text-[#52525B]">
              El cliente lo podrá cambiar después
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-[#FF6A1A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#E55A0E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              Crear y enviar invitación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
