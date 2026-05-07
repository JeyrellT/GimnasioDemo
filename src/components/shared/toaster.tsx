"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
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
      }}
    />
  );
}
