"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Dumbbell, User } from "lucide-react";
import { DEMO_PROFILES, type DemoUser } from "@/lib/demo/auth-context";

export default function IngresarPage() {
  const router = useRouter();

  function handleSelect(profile: DemoUser) {
    localStorage.setItem("vizion-demo-profile", JSON.stringify(profile.id));
    router.push(profile.role === "TRAINER" ? "/inicio" : "/client/sesion");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-neutral-50">Vizion Demo</h1>
        <p className="text-sm text-neutral-400">
          Elegí un perfil para explorar la demo. Tus datos se guardan solo en
          este navegador.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {DEMO_PROFILES.map((profile) => (
          <button
            key={profile.id}
            onClick={() => handleSelect(profile)}
            className="group flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3.5 text-left transition-all hover:border-brand-primary/50 hover:bg-neutral-800/80"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-sm font-semibold text-neutral-200 group-hover:bg-brand-primary/20 group-hover:text-brand-primary">
              {profile.avatarInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-neutral-100">
                {profile.name}
              </p>
              <p className="text-xs text-neutral-500">
                {profile.role === "TRAINER" ? (
                  <span className="inline-flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" />
                    Entrenador
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Cliente
                  </span>
                )}
                <span className="mx-1.5">·</span>
                {profile.email}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-neutral-600 transition-colors group-hover:text-brand-primary" />
          </button>
        ))}
      </div>

      <p className="text-[11px] text-center text-neutral-600">
        Versión demo · Sin servidor · Datos en localStorage
      </p>
    </div>
  );
}
