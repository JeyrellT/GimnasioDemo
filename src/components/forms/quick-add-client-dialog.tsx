"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Copy, Loader2, Mail, X } from "lucide-react";
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

interface SuccessState {
  email: string;
  emailSent: boolean;
  welcomeUrl: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuickAddClientDialog({
  open,
  onClose,
  onSuccess,
}: QuickAddClientDialogProps) {
  const [success, setSuccess] = useState<SuccessState | null>(null);

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
      setSuccess(null);
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
    if (success) {
      // If we were in success state, also trigger the list refresh.
      onSuccess();
    }
    setSuccess(null);
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
      // Show the in-dialog confirmation panel instead of closing immediately.
      setSuccess({
        email: data.email,
        emailSent: result.value.emailSent,
        welcomeUrl: result.value.welcomeUrl,
      });
      // Trigger background refresh so the client appears in the list right away.
      onSuccess();
    } else {
      toast.error(
        result.error?.message ?? "No se pudo enviar la invitación. Reintentá.",
      );
    }
  }

  async function copyLink() {
    if (!success) return;
    try {
      await navigator.clipboard.writeText(success.welcomeUrl);
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
        {/* ── Form state ──────────────────────────────────────────────────── */}
        {!success && !isSubmitting && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3
                id="quick-add-client-title"
                className="text-sm font-semibold text-[#FAFAFA]"
              >
                Agregar cliente
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

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg px-3 py-2 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover"
                >
                  Crear y enviar invitación
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── Loading state ───────────────────────────────────────────────── */}
        {isSubmitting && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10">
              <Loader2
                className="h-7 w-7 animate-spin text-brand-primary"
                aria-hidden="true"
              />
            </div>
            <h3 className="mb-2 text-sm font-semibold text-[#FAFAFA]">
              Creando cuenta y enviando correo...
            </h3>
            <p className="max-w-[280px] text-xs text-[#71717A]">
              Esto puede tardar unos segundos. No cierres la ventana.
            </p>
          </div>
        )}

        {/* ── Success state ───────────────────────────────────────────────── */}
        {success && !isSubmitting && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#FAFAFA]">
                {success.emailSent ? "Invitación enviada" : "Cliente creado"}
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

            <div className="flex flex-col items-center text-center">
              <div
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                  success.emailSent ? "bg-[#22C55E]/10" : "bg-[#F59E0B]/10"
                }`}
              >
                {success.emailSent ? (
                  <CheckCircle2
                    className="h-7 w-7 text-[#22C55E]"
                    aria-hidden="true"
                  />
                ) : (
                  <Mail
                    className="h-7 w-7 text-[#F59E0B]"
                    aria-hidden="true"
                  />
                )}
              </div>

              {success.emailSent ? (
                <>
                  <p className="mb-2 text-sm text-[#FAFAFA]">
                    Le mandamos un correo a{" "}
                    <strong className="text-brand-primary">{success.email}</strong>
                  </p>
                  <p className="mb-5 max-w-[300px] text-xs leading-relaxed text-[#A1A1AA]">
                    Pedile que revise su bandeja de entrada (también la carpeta
                    de <strong>spam</strong>) y siga los pasos del correo para
                    crear su contraseña personal.
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-2 text-sm text-[#FAFAFA]">
                    El cliente <strong className="text-[#FAFAFA]">{success.email}</strong>{" "}
                    fue creado, pero <strong>no pudimos enviar el correo</strong>.
                  </p>
                  <p className="mb-3 max-w-[300px] text-xs leading-relaxed text-[#A1A1AA]">
                    Pasale este link manualmente (por WhatsApp o como prefieras).
                    Es de un solo uso y dura 7 días.
                  </p>
                  <div className="mb-2 w-full rounded-lg border border-[#3F3F46] bg-[#27272A] p-2.5">
                    <p className="break-all text-left text-[11px] text-brand-primary font-mono">
                      {success.welcomeUrl}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="mb-3 flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA]"
                  >
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    Copiar link
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="mt-2 w-full rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover"
              >
                Listo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
