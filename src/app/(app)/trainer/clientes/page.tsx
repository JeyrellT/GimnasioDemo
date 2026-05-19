"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, UserPlus, Users } from "lucide-react";
import { listMyClients } from "@/app/actions/clients";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QuickAddClientDialog } from "@/components/forms/quick-add-client-dialog";
import { formatDateCR } from "@/lib/utils";
import type { ClientListItem } from "@/types/domain";

export default function ClientesPage() {
  const [clients, setClients] = useState<ClientListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadClients = useCallback(() => {
    listMyClients().then((result) => {
      setClients(result.ok ? result.value.clients : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
      </div>
    );
  }

  const list = clients ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis clientes"
        description={`${list.length} cliente${list.length !== 1 ? "s" : ""} activo${list.length !== 1 ? "s" : ""}`}
        actions={
          <div className="flex items-center gap-2">
            {/* Primary CTA */}
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white min-h-[44px] hover:bg-brand-primary-hover transition-colors"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Agregar cliente
            </button>
            {/* Secondary: full onboarding wizard */}
            <Link
              href="/trainer/clientes/invitar"
              className="flex items-center gap-1.5 rounded-lg border border-[#3F3F46] px-3 py-2 text-sm text-[#A1A1AA] min-h-[44px] hover:border-[#71717A] hover:text-[#FAFAFA] transition-colors"
            >
              Onboarding completo
            </Link>
          </div>
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No tenés clientes todavía"
          description="Agregá al primero para empezar a trabajar."
          action={{ label: "Agregar cliente", href: "/trainer/clientes/invitar" }}
        />
      ) : (
        <ul className="space-y-2">
          {list.map((client) => (
            <li key={client.id}>
              <Link
                href={`/trainer/clientes/${client.id}`}
                className="flex items-center gap-4 rounded-xl border border-[#3F3F46] bg-[#18181B] p-4 hover:bg-[#27272A] transition-colors"
              >
                {/* Avatar */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1E2A38] text-sm font-bold text-brand-accent">
                  {(client.name ?? "?").slice(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#FAFAFA] truncate">
                      {client.name}
                    </p>
                    {client.parqStatus === "REVIEW" && (
                      <span className="rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-xs font-medium text-[#F59E0B] shrink-0">
                        PAR-Q pendiente
                      </span>
                    )}
                    {client.parqStatus === "RED" && (
                      <span className="rounded-full bg-[#EF4444]/10 px-2 py-0.5 text-xs font-medium text-[#EF4444] shrink-0">
                        Alerta salud
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-[#71717A]">
                    <span>
                      Adherencia:{" "}
                      <span
                        className={
                          client.adherencePct7d >= 80
                            ? "text-[#22C55E]"
                            : client.adherencePct7d >= 50
                              ? "text-[#F59E0B]"
                              : "text-[#EF4444]"
                        }
                      >
                        {client.adherencePct7d}%
                      </span>
                    </span>
                    {client.lastSessionAt && (
                      <span>
                        Últ. sesión:{" "}
                        {formatDateCR(client.lastSessionAt, "d MMM")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Próximo cobro */}
                {client.nextChargeDate && (
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-[#71717A]">Próximo cobro</p>
                    <p className="text-xs font-medium text-[#FAFAFA]">
                      {formatDateCR(client.nextChargeDate, "d MMM")}
                    </p>
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <QuickAddClientDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => {
          setLoading(true);
          loadClients();
        }}
      />
    </div>
  );
}
