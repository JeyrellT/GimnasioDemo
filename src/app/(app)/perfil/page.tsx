"use client";

// =============================================================================
// FORJA — /perfil — User profile page
// =============================================================================

import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { formatDateCR } from "@/lib/utils";

// Demo trainer is the always-logged-in user in static export.
const DEMO_USER = {
  name: "Coach Demo",
  email: "demo@forja.app",
  role: "TRAINER" as const,
  createdAt: new Date("2024-01-01"),
};

function roleLabel(role: string): string {
  if (role === "TRAINER") return "Entrenador";
  if (role === "ADMIN") return "Administrador";
  return "Cliente";
}

export default function PerfilPage() {
  async function handleSignOut() {
    await signOutAction();
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-3xl font-bold text-[#FAFAFA]">Mi perfil</h1>

      {/* Info card */}
      <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] divide-y divide-[#3F3F46]">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-[#71717A]">Nombre</span>
          <span className="text-sm font-medium text-[#FAFAFA]">{DEMO_USER.name}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-[#71717A]">Correo</span>
          <span className="text-sm font-medium text-[#FAFAFA]">{DEMO_USER.email}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-[#71717A]">Rol</span>
          <span className="text-sm font-medium text-[#FAFAFA]">{roleLabel(DEMO_USER.role)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-[#71717A]">Miembro desde</span>
          <span className="text-sm text-[#A1A1AA]">
            {formatDateCR(DEMO_USER.createdAt, "MMMM yyyy")}
          </span>
        </div>
      </div>

      {/* Sign out */}
      <button
        type="button"
        onClick={handleSignOut}
        className="flex items-center gap-2 rounded-lg border border-[#EF4444]/40 px-5 py-3 text-sm font-semibold text-[#EF4444] hover:bg-[#450A0A] transition-colors min-h-[44px]"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Cerrar sesión
      </button>
    </div>
  );
}
