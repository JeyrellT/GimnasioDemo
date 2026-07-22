"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  CreditCard,
  Shield,
  UserPlus,
  Activity,
  HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: BarChart3, exact: true },
  { href: "/admin/users", label: "Usuarios", icon: Users, exact: false },
  {
    href: "/admin/subscriptions",
    label: "Suscripciones",
    icon: CreditCard,
    exact: false,
  },
  {
    href: "/admin/operations",
    label: "Operación",
    icon: Activity,
    exact: false,
  },
  {
    href: "/admin/monitoring",
    label: "Monitoreo",
    icon: HeartPulse,
    exact: false,
  },
  {
    href: "/admin/referrals",
    label: "Referidos",
    icon: UserPlus,
    exact: false,
  },
] as const;

export function AdminSuperNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className="hidden sm:flex sm:w-56 sm:flex-col sm:fixed sm:top-[5.25rem] sm:bottom-0 sm:z-30 sm:border-r sm:border-[#3F3F46]/60 sm:bg-[#09090B]"
      aria-label="Navegación super admin"
    >
      {/* SUPER_ADMIN badge */}
      <div className="flex items-center gap-2 border-b border-[#3F3F46]/60 px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-primary/20">
          <Shield
            className="h-3.5 w-3.5 text-brand-primary"
            aria-hidden="true"
          />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-brand-primary">
          Super Admin
        </span>
      </div>

      <nav
        className="flex flex-col gap-0.5 p-3 flex-1"
        aria-label="Navegación admin"
      >
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 min-h-[44px] overflow-hidden",
                active
                  ? "bg-brand-primary/10 text-brand-primary"
                  : "text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#FAFAFA]",
              )}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-primary" />
              )}
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                  active ? "bg-brand-primary/20" : "",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              </div>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
