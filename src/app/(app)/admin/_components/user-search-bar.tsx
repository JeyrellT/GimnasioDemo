"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search, Loader2 } from "lucide-react";

interface UserSearchBarProps {
  currentSearch?: string;
  currentRole?: string;
  currentSuspended?: string;
}

const ROLES = [
  { value: "", label: "Todos los roles" },
  { value: "TRAINER", label: "Trainer" },
  { value: "CLIENT", label: "Cliente" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

const SUSPENDED_OPTIONS = [
  { value: "", label: "Cualquier estado" },
  { value: "false", label: "Activos" },
  { value: "true", label: "Suspendidos" },
];

export function UserSearchBar({
  currentSearch = "",
  currentRole = "",
  currentSuspended = "",
}: UserSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams();
      if (key !== "search" && currentSearch) params.set("search", currentSearch);
      if (key !== "role" && currentRole) params.set("role", currentRole);
      if (key !== "suspended" && currentSuspended) params.set("suspended", currentSuspended);
      if (value) params.set(key, value);
      params.set("page", "1");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, currentSearch, currentRole, currentSuspended],
  );

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      const params = new URLSearchParams();
      if (v) params.set("search", v);
      if (currentRole) params.set("role", currentRole);
      if (currentSuspended) params.set("suspended", currentSuspended);
      params.set("page", "1");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, currentRole, currentSuspended],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {/* Search input */}
      <div className="relative flex-1">
        {isPending ? (
          <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#71717A]" />
        ) : (
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
        )}
        <input
          type="search"
          placeholder="Buscar por email o nombre..."
          defaultValue={currentSearch}
          onChange={handleSearch}
          className="h-10 w-full rounded-lg border border-[#3F3F46] bg-[#18181B] pl-9 pr-3 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A]"
        />
      </div>

      {/* Role filter */}
      <select
        value={currentRole}
        onChange={(e) => updateParam("role", e.target.value)}
        className="h-10 rounded-lg border border-[#3F3F46] bg-[#18181B] px-3 text-sm text-[#FAFAFA] focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A]"
        aria-label="Filtrar por rol"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value} className="bg-[#18181B]">
            {r.label}
          </option>
        ))}
      </select>

      {/* Suspended filter */}
      <select
        value={currentSuspended}
        onChange={(e) => updateParam("suspended", e.target.value)}
        className="h-10 rounded-lg border border-[#3F3F46] bg-[#18181B] px-3 text-sm text-[#FAFAFA] focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A]"
        aria-label="Filtrar por estado"
      >
        {SUSPENDED_OPTIONS.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#18181B]">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
