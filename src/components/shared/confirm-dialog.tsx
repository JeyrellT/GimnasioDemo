"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#3F3F46] bg-[#18181B] p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-start gap-4">
            {variant === "destructive" && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#450A0A]">
                <AlertTriangle
                  className="h-5 w-5 text-[#EF4444]"
                  aria-hidden="true"
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-base font-semibold text-[#FAFAFA]">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-[#A1A1AA]">
                {description}
              </Dialog.Description>
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg border border-[#3F3F46] px-4 py-2.5 text-sm font-medium text-[#FAFAFA] min-h-[44px] hover:bg-[#27272A] transition-colors"
              >
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                "rounded-lg px-4 py-2.5 text-sm font-semibold text-white min-h-[44px] transition-colors disabled:opacity-50",
                variant === "destructive"
                  ? "bg-[#EF4444] hover:bg-[#DC2626]"
                  : "bg-brand-primary hover:bg-brand-primary-hover",
              )}
            >
              {loading ? "Procesando..." : confirmLabel}
            </button>
          </div>

          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Cerrar"
              className="absolute right-4 top-4 rounded-md p-1 text-[#71717A] hover:text-[#FAFAFA] transition-colors"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
