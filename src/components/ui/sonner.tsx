"use client";

import { Toaster as SonnerToaster } from "sonner";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <SonnerToaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: "#27272A",
          color: "#FAFAFA",
          border: "1px solid #3F3F46",
          borderRadius: "0.75rem",
        },
        classNames: {
          error: "border-[#EF4444]",
          success: "border-[#22C55E]",
          warning: "border-[#F59E0B]",
          info: "border-brand-primary",
        },
      }}
      {...props}
    />
  );
}
