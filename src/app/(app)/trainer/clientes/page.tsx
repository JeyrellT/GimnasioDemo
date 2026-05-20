"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search, UserPlus, Users } from "lucide-react";
import { listMyClients } from "@/app/actions/clients";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QuickAddClientDialog } from "@/components/forms/quick-add-client-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDateCR } from "@/lib/utils";
import type { ClientListItem } from "@/types/domain";

export default function ClientesPage() {
  const [clients, setClients] = useState<ClientListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const loadClients = useCallback((search?: string) => {
    listMyClients(search || undefined).then((result) => {
      setClients(result.ok ? result.value.clients : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadClients(debouncedSearch);
  }, [debouncedSearch, loadClients]);

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

      {/* Search input */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre o correo..."
          className="w-full rounded-lg border border-[#3F3F46] bg-[#18181B] py-2.5 pl-9 pr-4 text-sm text-[#FAFAFA] placeholder-[#71717A] outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        />
      </div>

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
                  {client.lastSessionAt && (
                    <p className="mt-1 text-xs text-[#71717A]">
                      Ult. sesion:{" "}
                      {formatDateCR(client.lastSessionAt, "d MMM")}
                    </p>
                  )}
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
