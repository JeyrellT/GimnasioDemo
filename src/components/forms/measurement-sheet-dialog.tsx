"use client";

// =============================================================================
// BLACKLINE FITNESS — MeasurementSheet: Dialog shell (tablet+)
// Isolated so that @radix-ui/react-dialog is only loaded when the sheet opens.
// =============================================================================

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MeasurementDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function MeasurementDialogShell({
  open,
  onOpenChange,
  children,
}: MeasurementDialogShellProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col",
            "bg-[#18181B] shadow-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            "duration-300",
          )}
          aria-describedby="measurement-sheet-desc"
        >
          <DialogPrimitive.Title className="sr-only">
            Nueva medición
          </DialogPrimitive.Title>
          <p id="measurement-sheet-desc" className="sr-only">
            Formulario para registrar mediciones corporales del cliente.
          </p>
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-[#3F3F46] px-5 py-4">
            <h2 className="text-base font-semibold text-[#FAFAFA]">
              Nueva medición
            </h2>
            <DialogPrimitive.Close
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-[#27272A] hover:text-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
