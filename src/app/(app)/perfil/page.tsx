"use client";

import { useRef, lazy, Suspense } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Camera, Trash2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ReferralSection = lazy(
  () => import("@/app/(app)/perfil/_components/referral-section"),
);

function roleLabel(role: string): string {
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "TRAINER") return "Entrenador";
  if (role === "ADMIN") return "Administrador";
  return "Cliente";
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return (parts[0]?.[0] ?? "V").toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export default function PerfilPage() {
  const { user, avatarUrl } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-3xl font-bold text-neutral-50">Mi perfil</h1>

      {/* Avatar section */}
      <div className="flex items-center gap-5">
        <div className="relative group">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-brand-primary to-[#1D4ED8] p-[2px]">
            <Avatar className="h-full w-full">
              {avatarUrl && (
                <AvatarImage src={avatarUrl} alt={user.name} />
              )}
              <AvatarFallback className="bg-neutral-900 text-brand-primary text-xl font-bold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Cambiar foto"
          >
            <Camera className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-sm font-medium text-brand-primary hover:underline"
          >
            {avatarUrl ? "Cambiar foto" : "Subir foto"}
          </button>
          {avatarUrl && (
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-danger transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Eliminar
            </button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-neutral-700 bg-neutral-900 divide-y divide-neutral-700">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-neutral-500">Nombre</span>
          <span className="text-sm font-medium text-neutral-50">{user.name}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-neutral-500">Correo</span>
          <span className="text-sm font-medium text-neutral-50">{user.email}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-neutral-500">Rol</span>
          <span className="text-sm font-medium text-neutral-50">
            {roleLabel(user.role)}
          </span>
        </div>
      </div>

      {/* Referral section — trainers only */}
      {user.role === "TRAINER" && (
        <Suspense fallback={null}>
          <ReferralSection />
        </Suspense>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/ingresar" })}
          className="flex items-center gap-2 rounded-lg border border-danger/40 px-5 py-3 text-sm font-semibold text-danger hover:bg-danger-bg transition-colors min-h-[44px]"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Cerrar sesion
        </button>
      </div>
    </div>
  );
}
