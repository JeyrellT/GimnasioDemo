"use client";

import { User, Info } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { BrandingSection } from "./_components/branding-section";
import { useAuth } from "@/components/providers/auth-provider";

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-primary/15">
          <Icon className="h-4 w-4 text-brand-primary" />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#A1A1AA]">
          {label}
        </h2>
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roleLabel(role: string): string {
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "TRAINER") return "Entrenador";
  if (role === "ADMIN") return "Administrador";
  return "Cliente";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AjustesPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Ajustes"
        description="Personalizá tu marca y configurá tu cuenta."
      />

      {/* ── Branding ────────────────────────────────────────────────────────── */}
      <BrandingSection />

      {/* ── Trainer Profile ────────────────────────────────────────────────── */}
      <Section icon={User} label="Perfil del entrenador">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between border-b border-[#27272A] pb-2">
            <span className="text-[#71717A]">Nombre</span>
            <span className="text-[#FAFAFA]">{user?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between border-b border-[#27272A] pb-2">
            <span className="text-[#71717A]">Email</span>
            <span className="text-[#FAFAFA] font-mono text-xs">
              {user?.email ?? "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#71717A]">Rol</span>
            <span className="text-[#FAFAFA]">
              {user ? roleLabel(user.role) : "—"}
            </span>
          </div>
        </div>
      </Section>

      {/* ── About ──────────────────────────────────────────────────────────── */}
      <Section icon={Info} label="Acerca de">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#71717A]">Version</span>
            <span className="text-[#FAFAFA]">v1.0</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
