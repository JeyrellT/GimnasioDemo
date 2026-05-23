"use client";

import { useRef, useState, useEffect, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LogOut,
  ArrowLeftRight,
  Camera,
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadAvatar } from "@/app/actions/auth";
import {
  getGeminiKey,
  setGeminiKey,
  clearGeminiKey,
} from "@/lib/demo/settings-store";

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

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
  const { update: updateSession } = useSession();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Avatar upload state ──────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false);

  // ── Gemini key state (demo only — prod uses server-side env) ─────────────
  const [apiKey, setApiKeyState] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (!IS_DEMO) return;
    const stored = getGeminiKey();
    if (stored) setApiKeyState(stored);
  }, []);

  useEffect(() => {
    if (!IS_DEMO) return;
    if (!apiKey) {
      clearGeminiKey();
      return;
    }
    const timer = setTimeout(() => {
      setGeminiKey(apiKey);
    }, 500);
    return () => clearTimeout(timer);
  }, [apiKey]);

  function handleSignOut() {
    if (IS_DEMO) {
      router.push("/ingresar");
    } else {
      signOut({ callbackUrl: "/ingresar" });
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file twice still triggers onChange.
    e.target.value = "";
    if (!file) return;

    // Client-side guards mirror server-side validation in uploadAvatar.
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se admiten archivos de imagen.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen pesa más de 5 MB. Reducila e intentá de nuevo.");
      return;
    }
    if (IS_DEMO) {
      // No backend in demo mode — surface a clear message instead of failing.
      toast.message("Modo demo: la subida de foto no está activa.");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadAvatar(fd);
      if (!result.ok) {
        toast.error(result.error.message ?? "No se pudo subir la foto.");
        return;
      }
      // Refresh the NextAuth session so session.user.avatarUrl picks up the
      // new value from DB. Then refresh the route so any server components
      // re-render with the new avatar.
      await updateSession();
      router.refresh();
      toast.success("Foto actualizada.");
    } catch {
      toast.error("Error inesperado al subir la foto.");
    } finally {
      setUploading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-3xl font-bold text-neutral-50">Mi perfil</h1>

      {/* Avatar section */}
      <div className="flex items-center gap-5">
        <div className="relative group">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-hover p-[2px]">
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
            onClick={() => !uploading && fileRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Cambiar foto"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 text-white animate-spin" aria-hidden="true" />
            ) : (
              <Camera className="h-5 w-5 text-white" aria-hidden="true" />
            )}
          </button>
          {uploading && (
            // Always-visible spinner on mobile (no hover state).
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 sm:hidden">
              <Loader2 className="h-5 w-5 text-white animate-spin" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
          >
            {uploading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            )}
            {uploading
              ? "Subiendo..."
              : avatarUrl
                ? "Cambiar foto"
                : "Subir foto"}
          </button>
          {avatarUrl && !uploading && (
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
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleAvatarChange}
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

      {/* Gemini API key — demo only (production uses server-side GEMINI_API_KEY) */}
      {IS_DEMO && (
        <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-primary/15">
              <Sparkles className="h-4 w-4 text-brand-primary" aria-hidden="true" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
              API Key de Gemini
            </h2>
          </div>
          <p className="text-xs text-neutral-500">
            Requerida para el OCR de bascula. La clave se guarda solo en este navegador.
          </p>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 pr-10 font-mono text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              aria-label="API Key de Gemini"
            />
            <button
              type="button"
              onClick={() => setShowKey((prev) => !prev)}
              aria-label={showKey ? "Ocultar clave" : "Mostrar clave"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-200 transition-colors"
            >
              {showKey ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline"
          >
            Obtene tu clave gratuita en Google AI Studio
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      )}

      {/* Referral section — trainers only, production only */}
      {!IS_DEMO && user.role === "TRAINER" && (
        <Suspense fallback={null}>
          <ReferralSection />
        </Suspense>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {IS_DEMO && (
          <button
            type="button"
            onClick={() => router.push("/ingresar")}
            className="flex items-center gap-2 rounded-lg border border-neutral-700 px-5 py-3 text-sm font-semibold text-neutral-300 hover:bg-neutral-800 transition-colors min-h-[44px]"
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
            Cambiar perfil demo
          </button>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-lg border border-danger/40 px-5 py-3 text-sm font-semibold text-danger hover:bg-danger-bg transition-colors min-h-[44px]"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Cerrar sesion
        </button>
      </div>
    </div>
  );
}
