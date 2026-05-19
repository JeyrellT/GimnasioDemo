// =============================================================================
// SUPER_ADMIN — /admin/users
// Server component. Lists all users with filters.
// =============================================================================

import Link from "next/link";
import { listAllUsers } from "@/server/actions/admin.actions";
import { PageHeader } from "@/components/shared/page-header";
import { formatDateCR } from "@/lib/utils";
import { UserSearchBar } from "../_components/user-search-bar";
import type { UserRole } from "@/types/domain";

type SearchParams = {
  role?: string;
  suspended?: string;
  search?: string;
  page?: string;
};

const PAGE_SIZE = 25;

const ROLE_LABELS: Record<string, string> = {
  TRAINER: "Trainer",
  CLIENT: "Cliente",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

const ROLE_COLORS: Record<string, string> = {
  TRAINER: "bg-brand-primary/10 text-brand-primary",
  CLIENT: "bg-[#22C55E]/10 text-[#22C55E]",
  ADMIN: "bg-[#F59E0B]/10 text-[#F59E0B]",
  SUPER_ADMIN: "bg-brand-primary/10 text-brand-primary",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const VALID_ROLES: UserRole[] = ["TRAINER", "CLIENT", "ADMIN", "SUPER_ADMIN"];
  const roleParam = params.role && VALID_ROLES.includes(params.role as UserRole)
    ? (params.role as UserRole)
    : undefined;

  const result = await listAllUsers({
    role: roleParam,
    suspended: params.suspended === "true" ? true : params.suspended === "false" ? false : undefined,
    search: params.search || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const data = result.ok ? result.value : null;
  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description={`${total} usuario${total !== 1 ? "s" : ""} en la plataforma`}
      />

      {/* Filters */}
      <UserSearchBar currentSearch={params.search} currentRole={params.role} currentSuspended={params.suspended} />

      {!result.ok && (
        <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-4 text-sm text-[#EF4444]">
          Error al cargar usuarios: {result.error.message}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[#3F3F46]/60 bg-[#18181B] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#3F3F46]/60">
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-[#71717A]">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-[#71717A]">
                  Rol
                </th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-[#71717A]">
                  Estado
                </th>
                <th className="hidden lg:table-cell px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-[#71717A]">
                  Último acceso
                </th>
                <th className="hidden lg:table-cell px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-[#71717A]">
                  Registro
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3F3F46]/40">
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-[#71717A]"
                  >
                    No se encontraron usuarios con esos filtros.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-[#27272A]/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="group flex flex-col gap-0.5"
                      >
                        <span className="font-medium text-[#FAFAFA] group-hover:text-brand-primary transition-colors truncate max-w-[200px]">
                          {user.name ?? "(sin nombre)"}
                        </span>
                        <span className="text-xs text-[#71717A] truncate max-w-[200px]">
                          {user.email}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[user.role] ?? "bg-[#3F3F46]/20 text-[#A1A1AA]"}`}
                      >
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3">
                      {user.suspendedAt ? (
                        <span className="inline-flex rounded-full bg-[#EF4444]/10 px-2 py-0.5 text-xs font-semibold text-[#EF4444]">
                          Suspendido
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-[#22C55E]/10 px-2 py-0.5 text-xs font-semibold text-[#22C55E]">
                          Activo
                        </span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-xs text-[#71717A]">
                      {user.lastLoginAt
                        ? formatDateCR(user.lastLoginAt, "d MMM yyyy")
                        : "—"}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-xs text-[#71717A]">
                      {formatDateCR(user.createdAt, "d MMM yyyy")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[#71717A]">
          <span>
            Página {page} de {totalPages} — {total} usuarios
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/users?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`}
                className="rounded-lg border border-[#3F3F46] bg-[#18181B] px-3 py-1.5 text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/users?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}
                className="rounded-lg border border-[#3F3F46] bg-[#18181B] px-3 py-1.5 text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
