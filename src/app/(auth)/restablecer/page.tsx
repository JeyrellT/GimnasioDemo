import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Restablecer contraseña",
};

export default function RestablecerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#71717A]" aria-hidden="true" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
