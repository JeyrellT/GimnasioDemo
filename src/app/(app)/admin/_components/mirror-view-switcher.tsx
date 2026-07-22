"use client";

import { useTransition } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Check,
  ChevronDown,
  Dumbbell,
  LayoutDashboard,
  Loader2,
  LogOut,
  ShieldCheck,
  User,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  startImpersonation,
  stopImpersonation,
} from "@/server/actions/admin.actions";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface MirrorViewTarget {
  id: string;
  email: string;
  name: string;
  role: "TRAINER" | "CLIENT" | "ADMIN";
}

export interface MirrorViewSwitcherState {
  activeTarget: MirrorViewTarget | null;
  coach: Omit<MirrorViewTarget, "role"> | null;
  client: Omit<MirrorViewTarget, "role"> | null;
}

interface ViewOptionProps {
  active: boolean;
  disabled?: boolean;
  description: string;
  icon: typeof ShieldCheck;
  label: string;
  onSelect: () => void;
}

function ViewOption({
  active,
  disabled,
  description,
  icon: Icon,
  label,
  onSelect,
}: ViewOptionProps) {
  return (
    <DropdownMenuItem
      disabled={disabled}
      onSelect={(event) => {
        event.preventDefault();
        if (!active) onSelect();
      }}
      className={cn(
        "min-h-[52px] items-center rounded-lg px-2.5",
        active && "bg-brand-primary/10 focus:bg-brand-primary/10",
      )}
      aria-current={active ? "true" : undefined}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#27272A] text-[#A1A1AA]",
          active && "bg-brand-primary/15 text-brand-primary",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs font-normal text-[#71717A]">
          {description}
        </span>
      </span>
      {active && (
        <Check className="h-4 w-4 text-brand-primary" aria-hidden="true" />
      )}
    </DropdownMenuItem>
  );
}

function viewLabel(target: MirrorViewTarget | null): string {
  if (target?.role === "TRAINER") return "Vista coach";
  if (target?.role === "CLIENT") return "Vista cliente";
  if (target) return "Vista observada";
  return "Vista Super Admin";
}

export function MirrorViewSwitcher({
  state,
}: {
  state: MirrorViewSwitcherState;
}) {
  const [isPending, startTransition] = useTransition();
  const { activeTarget, coach, client } = state;
  const label = viewLabel(activeTarget);

  function switchToAdmin(redirectTo = "/admin") {
    if (!activeTarget) {
      window.location.assign(redirectTo);
      return;
    }

    startTransition(async () => {
      const result = await stopImpersonation();
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      window.location.assign(redirectTo);
    });
  }

  function switchToTarget(target: Omit<MirrorViewTarget, "role"> | null) {
    if (!target || activeTarget?.id === target.id) return;

    startTransition(async () => {
      const result = await startImpersonation({ userId: target.id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      window.location.assign(result.value.redirectTo);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isPending}
          className="flex min-h-[44px] items-center gap-2 rounded-xl border border-transparent px-2 py-1 transition-colors hover:border-[#3F3F46]/70 hover:bg-[#18181B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-60"
          aria-label={`${label}. Cambiar vista`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-primary/40 bg-brand-primary/10 text-brand-primary">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : activeTarget?.role === "TRAINER" ? (
              <Dumbbell className="h-4 w-4" aria-hidden="true" />
            ) : activeTarget?.role === "CLIENT" ? (
              <UserRound className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold leading-tight text-[#FAFAFA]">
              {label}
            </span>
            {activeTarget && (
              <span className="block max-w-[150px] truncate text-[11px] leading-tight text-[#71717A]">
                {activeTarget.name}
              </span>
            )}
          </span>
          <ChevronDown
            className="hidden h-4 w-4 text-[#71717A] sm:block"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(19rem,calc(100vw-1rem))] p-1.5"
      >
        <DropdownMenuLabel>Cambiar vista</DropdownMenuLabel>
        <ViewOption
          active={!activeTarget}
          disabled={isPending}
          description="Panel y controles administrativos"
          icon={ShieldCheck}
          label="Vista Super Admin"
          onSelect={() => switchToAdmin()}
        />
        <ViewOption
          active={activeTarget?.id === coach?.id}
          disabled={isPending || !coach}
          description={coach?.name ?? "No hay un coach disponible"}
          icon={Dumbbell}
          label="Vista coach"
          onSelect={() => switchToTarget(coach)}
        />
        <ViewOption
          active={activeTarget?.id === client?.id}
          disabled={isPending || !client}
          description={client?.name ?? "No hay un cliente disponible"}
          icon={UserRound}
          label="Vista cliente"
          onSelect={() => switchToTarget(client)}
        />

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            switchToAdmin("/admin/mirror");
          }}
        >
          <Users className="h-4 w-4" aria-hidden="true" />
          Administrar otras vistas
        </DropdownMenuItem>
        {!activeTarget && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Panel de Super Admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/perfil" className="flex items-center gap-2">
            <User className="h-4 w-4" aria-hidden="true" />
            Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-[#EF4444] focus:text-[#EF4444]"
          onSelect={() => signOut({ callbackUrl: "/ingresar" })}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
