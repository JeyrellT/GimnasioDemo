"use client";

// =============================================================================
// BLACKLINE FITNESS — MeasurementSheet: Drawer shell (mobile)
// Isolated so that vaul is only loaded when the sheet opens.
// =============================================================================

import * as React from "react";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MeasurementDrawerShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function MeasurementDrawerShell({
  open,
  onOpenChange,
  children,
}: MeasurementDrawerShellProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.6)]" />
        <Drawer.Content
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl",
            "bg-[#18181B] shadow-xl",
            "max-h-[92dvh]",
          )}
          aria-describedby="drawer-measurement-desc"
        >
          <Drawer.Title className="sr-only">Nueva medición</Drawer.Title>
          <p id="drawer-measurement-desc" className="sr-only">
            Formulario para registrar mediciones corporales del cliente.
          </p>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div
              className="h-1.5 w-12 rounded-full bg-[#3F3F46]"
              aria-hidden="true"
            />
          </div>
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-[#3F3F46] px-5 py-3">
            <h2 className="text-base font-semibold text-[#FAFAFA]">
              Nueva medición
            </h2>
            <Drawer.Close
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-[#27272A] hover:text-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-brand-primary"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Drawer.Close>
          </div>

          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
