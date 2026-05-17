"use client";

import { useEffect, useState } from "react";
import { Loader2, Dumbbell, Mail, MapPin } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { getTrainerClientLink } from "@/lib/demo/store";
import type { DemoTrainerClientRow } from "@/lib/offline/db";

export default function ClientEntrenadorPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState<DemoTrainerClientRow | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getTrainerClientLink(user.id).then((tc) => {
      setLink(tc ?? null);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-50">Mi entrenador</h1>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-[#C04A00] text-xl font-bold text-white">
            CD
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">
              Coach Demo
            </h2>
            <p className="text-sm text-neutral-500">Entrenador personal</p>
          </div>
        </div>

        <div className="mt-5 divide-y divide-neutral-800">
          <div className="flex items-center gap-3 py-3">
            <Mail className="h-4 w-4 text-neutral-600" />
            <span className="text-sm text-neutral-300">demo@vizion.app</span>
          </div>
          <div className="flex items-center gap-3 py-3">
            <Dumbbell className="h-4 w-4 text-neutral-600" />
            <span className="text-sm text-neutral-300">
              Hipertrofia y pérdida de grasa
            </span>
          </div>
          <div className="flex items-center gap-3 py-3">
            <MapPin className="h-4 w-4 text-neutral-600" />
            <span className="text-sm text-neutral-300">San José, CR</span>
          </div>
        </div>
      </div>

      {link && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-neutral-300">Tu plan</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-neutral-500">Estado</p>
              <p className="text-sm font-medium text-success">
                {link.status === "ACTIVE"
                  ? "Activo"
                  : link.status === "PAUSED"
                    ? "Pausado"
                    : link.status}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Mensualidad</p>
              <p className="text-sm font-medium text-neutral-200">
                ₡{link.monthlyPriceCRC.toLocaleString("es-CR")}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Desde</p>
              <p className="text-sm text-neutral-300">
                {formatDate(link.startedAt)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CR", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
