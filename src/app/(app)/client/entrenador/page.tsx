"use client";

import { useEffect, useState } from "react";
import { Loader2, Dumbbell, Mail } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { getMyTrainerInfo } from "@/app/actions/client-portal";
import type { MyTrainerInfo } from "@/server/actions/client-portal.actions";

export default function ClientEntrenadorPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<MyTrainerInfo | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getMyTrainerInfo().then((result) => {
      if (result.ok) setInfo(result.value);
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-50">Mi entrenador</h1>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center">
          <Dumbbell className="h-10 w-10 text-neutral-700 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">
            Aún no tenés un entrenador asignado.
          </p>
        </div>
      </div>
    );
  }

  const initials = info.trainerName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-50">Mi entrenador</h1>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-center gap-4">
          {info.trainerAvatar ? (
            <img
              src={info.trainerAvatar}
              alt={info.trainerName}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-hover text-xl font-bold text-white">
              {initials}
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">
              {info.tradeName || info.trainerName}
            </h2>
            <p className="text-sm text-neutral-500">{info.specialty}</p>
          </div>
        </div>

        <div className="mt-5 divide-y divide-neutral-800">
          <div className="flex items-center gap-3 py-3">
            <Mail className="h-4 w-4 text-neutral-600" />
            <span className="text-sm text-neutral-300">{info.trainerEmail}</span>
          </div>
          <div className="flex items-center gap-3 py-3">
            <Dumbbell className="h-4 w-4 text-neutral-600" />
            <span className="text-sm text-neutral-300">{info.specialty}</span>
          </div>
          {info.bio && (
            <div className="py-3">
              <p className="text-sm text-neutral-400">{info.bio}</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-300">Tu plan</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-neutral-500">Estado</p>
            <p className="text-sm font-medium text-success">
              {info.status === "ACTIVE"
                ? "Activo"
                : info.status === "PAUSED"
                  ? "Pausado"
                  : info.status}
            </p>
          </div>
          {info.monthlyPriceCRC !== null && (
            <div>
              <p className="text-xs text-neutral-500">Mensualidad</p>
              <p className="text-sm font-medium text-neutral-200">
                ₡{info.monthlyPriceCRC.toLocaleString("es-CR")}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-neutral-500">Desde</p>
            <p className="text-sm text-neutral-300">
              {formatDate(info.startedAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(value: Date | string): string {
  try {
    return new Date(value).toLocaleDateString("es-CR", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}
