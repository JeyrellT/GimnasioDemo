"use client";

import { useRouter } from "next/navigation";
import { DEMO_PROFILES, type DemoUser } from "@/lib/demo/auth-context";

function roleLabel(role: string): string {
  return role === "TRAINER" ? "Entrenador" : "Cliente";
}

function roleBadgeClasses(role: string): string {
  return role === "TRAINER"
    ? "bg-[#FF6A1A]/20 text-[#FF6A1A] ring-1 ring-[#FF6A1A]/30"
    : "bg-[#3B82F6]/20 text-[#3B82F6] ring-1 ring-[#3B82F6]/30";
}

export default function IngresarPage() {
  const router = useRouter();

  function handleSelect(profile: DemoUser) {
    localStorage.setItem("vizion-demo-profile", JSON.stringify(profile.id));
    if (profile.role === "TRAINER") {
      router.push("/inicio");
    } else {
      router.push("/client/sesion");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5 text-center">
        <h1 className="text-xl font-bold text-[#FAFAFA]">Vizion Demo</h1>
        <p className="text-sm leading-relaxed text-white/50">
          Elegi un perfil para explorar la plataforma. Tus datos se guardan solo en este navegador.
        </p>
      </div>

      {/* Profile cards */}
      <div className="grid gap-2.5">
        {DEMO_PROFILES.map((profile) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => handleSelect(profile)}
            className="group flex items-center gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.04] p-3.5 text-left transition-all duration-200 hover:border-[#FF6A1A]/40 hover:bg-[#FF6A1A]/[0.06] focus-visible:outline-2 focus-visible:outline-[#FF6A1A] focus-visible:outline-offset-2 min-h-[44px]"
          >
            {/* Avatar */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6A1A] to-[#C04A00] text-sm font-bold text-white shadow-md shadow-[#FF6A1A]/15 transition-shadow duration-200 group-hover:shadow-lg group-hover:shadow-[#FF6A1A]/25">
              {profile.avatarInitials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#FAFAFA] truncate">
                  {profile.name}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${roleBadgeClasses(profile.role)}`}
                >
                  {roleLabel(profile.role)}
                </span>
              </div>
              <p className="text-xs text-white/40 truncate">{profile.email}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-center text-white/30">
        Version demo · Sin servidor · Datos en localStorage
      </p>
    </div>
  );
}
