"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, Loader2, X } from "lucide-react";
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

const inputCls =
  "w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] " +
  "placeholder-[#71717A] transition-[border-color,box-shadow] duration-150 " +
  "focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30";

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
  // Stores the welcome URL when the email couldn't be sent (fallback copy-link)
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

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
      setFallbackUrl(null);
      setTimeout(() => {
        const el = document.getElementById("qac-email");
        if (el instanceof HTMLInputElement) el.focus();
      }, 50);
    }
  }, [open, reset]);

  // ESC closes dialog (only when not loading)
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) handleClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isSubmitting]);

  function handleClose() {
    setFallbackUrl(null);
    reset();
    onClose();
  }

  if (!open) return null;

  async function onSubmit(data: FormValues) {
    const result = await quickAddClient({
      email: data.email,
      name: data.name || undefined,
    });

    if (result.ok) {
      if (result.value.emailSent) {
        // Email sent OK → close dialog immediately + toast
        toast.success(
          `Invitación enviada a ${data.email}. Pedile que revise su correo.`,
        );
        onSuccess();
        reset();
        onClose();
      } else {
        // Client created but email failed → show fallback URL inside dialog
        toast.warning(
          "Cliente creado, pero no pudimos enviar el correo. Copiá el link.",
        );
        setFallbackUrl(result.value.welcomeUrl);
        onSuccess();
      }
    } else {
      toast.error(
        result.error?.message ?? "No se pudo enviar la invitación. Reintentá.",
      );
    }
  }

  async function copyFallbackLink() {
    if (!fallbackUrl) return;
    try {
      await navigator.clipboard.writeText(fallbackUrl);
      toast.success("Link copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar — copialo a mano");
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
        {/* ── Fallback: email failed, show copy-link ─────────────────────── */}
        {fallbackUrl ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#FAFAFA]">
                Cliente creado
              </h3>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Cerrar"
                className="rounded-md p-1 text-[#71717A] hover:bg-[#27272A] hover:text-[#FAFAFA] transition-colors"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p className="mb-2 text-sm text-[#FAFAFA]">
              No pudimos enviar el correo. Pasale este link manualmente
              (WhatsApp, etc.). Es de un solo uso y dura 7 días.
            </p>
            <div className="mb-3 w-full rounded-lg border border-[#3F3F46] bg-[#27272A] p-2.5">
              <p className="break-all text-left text-[11px] text-brand-primary font-mono">
                {fallbackUrl}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyFallbackLink}
                className="flex items-center gap-1.5 rounded-lg border border-[#3F3F46] px-3 py-2 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copiar link
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover"
              >
                Listo
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ── Form / Loading ───────────────────────────────────────────── */}
            <div className="mb-4 flex items-center justify-between">
              <h3
                id="quick-add-client-title"
                className="text-sm font-semibold text-[#FAFAFA]"
              >
                Agregar cliente
              </h3>
              {!isSubmitting && (
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Cerrar"
                  className="rounded-md p-1 text-[#71717A] hover:bg-[#27272A] hover:text-[#FAFAFA] transition-colors"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="qac-email"
                  className="block text-sm font-medium text-[#FAFAFA]"
                >
                  Correo electrónico <span className="text-brand-primary">*</span>
                </label>
                <input
                  id="qac-email"
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  placeholder="cliente@ejemplo.com"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "qac-email-error" : undefined}
                  className={`${inputCls} disabled:opacity-50`}
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
                  disabled={isSubmitting}
                  aria-describedby="qac-name-hint"
                  className={`${inputCls} disabled:opacity-50`}
                  {...register("name")}
                />
                <p id="qac-name-hint" className="text-xs text-[#52525B]">
                  El cliente lo podrá cambiar después
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                {!isSubmitting && (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg px-3 py-2 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-70"
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  {isSubmitting ? "Enviando..." : "Crear y enviar invitación"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
