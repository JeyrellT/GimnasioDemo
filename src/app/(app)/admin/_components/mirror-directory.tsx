"use client";

import { useMemo, useState, useTransition } from "react";
import { Dumbbell, Eye, Loader2, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  startImpersonation,
  type AdminMirrorAccount,
} from "@/server/actions/admin.actions";

interface MirrorDirectoryProps {
  trainers: AdminMirrorAccount[];
  clients: AdminMirrorAccount[];
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  );
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("es");
}

function isWithinOneEdit(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1) return false;

  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (left.length > right.length) leftIndex += 1;
    else if (right.length > left.length) rightIndex += 1;
    else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }

  return edits + Number(leftIndex < left.length || rightIndex < right.length) <= 1;
}

function matches(account: AdminMirrorAccount, query: string): boolean {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = normalize(`${account.name} ${account.email}`);
  const tokens = haystack.split(/[^a-z0-9]+/).filter(Boolean);

  return terms.every(
    (term) =>
      haystack.includes(term) ||
      (term.length >= 4 && tokens.some((token) => isWithinOneEdit(token, term))),
  );
}

function AccountRow({
  account,
  roleLabel,
}: {
  account: AdminMirrorAccount;
  roleLabel: "coach" | "cliente";
}) {
  const [isPending, startTransition] = useTransition();

  function openMirror() {
    if (
      !window.confirm(
        `¿Abrir la vista espejo de ${account.name} como ${roleLabel}? Verás su navegación y sus datos.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await startImpersonation({ userId: account.id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      window.location.assign(result.value.redirectTo);
    });
  }

  return (
    <div className="flex flex-col gap-3 border-b border-[#3F3F46]/40 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-primary/20 bg-brand-primary/10 text-xs font-bold text-brand-primary">
          {initials(account.name)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-[#FAFAFA]">
              {account.name}
            </p>
            {account.suspended && (
              <span className="rounded-full bg-[#EF4444]/10 px-2 py-0.5 text-[10px] font-semibold text-[#EF4444]">
                Suspendido
              </span>
            )}
          </div>
          <p className="truncate text-xs text-[#71717A]">{account.email}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={openMirror}
        disabled={isPending}
        className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-lg border border-brand-primary/30 bg-brand-primary/5 px-3 py-2 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-primary/10 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
        Ver como {roleLabel}
      </button>
    </div>
  );
}

function DirectoryColumn({
  title,
  description,
  accounts,
  roleLabel,
}: {
  title: string;
  description: string;
  accounts: AdminMirrorAccount[];
  roleLabel: "coach" | "cliente";
}) {
  const Icon = roleLabel === "coach" ? Dumbbell : UserRound;

  return (
    <section className="overflow-hidden rounded-xl border border-[#3F3F46]/60 bg-[#18181B]">
      <div className="flex items-center gap-3 border-b border-[#3F3F46]/60 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/10">
          <Icon className="h-4 w-4 text-brand-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#FAFAFA]">{title}</h2>
          <p className="text-xs text-[#71717A]">{description}</p>
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {accounts.length > 0 ? (
          accounts.map((account) => (
            <AccountRow key={account.id} account={account} roleLabel={roleLabel} />
          ))
        ) : (
          <p className="p-8 text-center text-sm text-[#71717A]">
            No hay resultados en esta lista.
          </p>
        )}
      </div>
    </section>
  );
}

export function MirrorDirectory({ trainers, clients }: MirrorDirectoryProps) {
  const [query, setQuery] = useState("");
  const filteredTrainers = useMemo(
    () => trainers.filter((account) => matches(account, query)),
    [trainers, query],
  );
  const filteredClients = useMemo(
    () => clients.filter((account) => matches(account, query)),
    [clients, query],
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o correo, por ejemplo Jorge o Geovanni"
          className="min-h-[44px] w-full rounded-xl border border-[#3F3F46] bg-[#18181B] py-2.5 pl-10 pr-4 text-sm text-[#FAFAFA] outline-none placeholder:text-[#52525B] focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DirectoryColumn
          title={`Coaches (${filteredTrainers.length})`}
          description="Abrí el panel y las herramientas del coach"
          accounts={filteredTrainers}
          roleLabel="coach"
        />
        <DirectoryColumn
          title={`Clientes (${filteredClients.length})`}
          description="Abrí la experiencia y los datos del cliente"
          accounts={filteredClients}
          roleLabel="cliente"
        />
      </div>
    </div>
  );
}
