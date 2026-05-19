"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Library,
  Wallet,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/providers/auth-provider";

const navItems = [
  { href: "/inicio", label: "Inicio", icon: LayoutDashboard },
  { href: "/trainer/clientes", label: "Clientes", icon: Users },
  { href: "/trainer/rutinas", label: "Rutinas", icon: Dumbbell },
  { href: "/trainer/ejercicios", label: "Ejercicios", icon: Library },
  { href: "/trainer/finanzas", label: "Finanzas", icon: Wallet },
  { href: "/trainer/ajustes", label: "Ajustes", icon: Settings },
] as const;

const mainNavItems = navItems.slice(0, 5) as typeof navItems[number][];
const settingsItem = navItems[5] as typeof navItems[number];

/** @deprecated use TrainerBottomNav + TrainerSidebar separately */
export function TrainerNav() {
  return (
    <>
      <TrainerBottomNav />
      <TrainerSidebar />
    </>
  );
}

// ─── Bottom Nav ────────────────────────────────────────────────────────────────

export function TrainerBottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/inicio" ? pathname === href : pathname.startsWith(href);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 sm:hidden"
      aria-label="Navegación principal"
    >
      {/* Glass top shadow */}
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-[#09090B]/80 to-transparent" />

      <div className="flex h-16 items-center border-t border-[#3F3F46]/80 bg-[#09090B]/90 backdrop-blur-md px-1">
        {mainNavItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[44px] py-2"
              aria-current={active ? "page" : undefined}
            >
              {/* Icon wrapper */}
              <motion.div
                animate={active ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(
                  "flex items-center justify-center rounded-full transition-colors duration-200",
                  active ? "bg-brand-primary/15 p-1.5" : "p-1.5",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors duration-200",
                    active ? "text-brand-primary" : "text-[#71717A]",
                  )}
                  aria-hidden="true"
                />
              </motion.div>

              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-200 leading-none",
                  active ? "text-brand-primary" : "text-[#71717A]",
                )}
              >
                {label}
              </span>

              {/* Active dot indicator */}
              <AnimatePresence>
                {active && (
                  <motion.span
                    key="dot"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-primary"
                  />
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

export function TrainerSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isActive = (href: string) =>
    href === "/inicio" ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className="hidden sm:flex sm:w-56 sm:flex-col sm:fixed sm:top-[5.25rem] sm:bottom-0 sm:z-30 sm:border-r sm:border-[#3F3F46]/60 sm:bg-[#09090B]"
      aria-label="Navegación lateral"
    >
      <nav className="flex flex-col gap-0.5 p-3 flex-1" aria-label="Navegación principal">
        {mainNavItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 min-h-[44px] group overflow-hidden",
                active
                  ? "text-brand-primary"
                  : "text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#FAFAFA]",
              )}
              aria-current={active ? "page" : undefined}
            >
              {/* Active background */}
              {active && (
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-0 rounded-lg bg-brand-primary/10"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}

              {/* Active left indicator bar */}
              {active && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}

              {/* Icon with circle when active */}
              <div
                className={cn(
                  "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                  active ? "bg-brand-primary/20" : "group-hover:bg-[#27272A]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              </div>

              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section — Admin + Settings */}
      <div className="shrink-0 border-t border-[#3F3F46]/60 p-3 space-y-0.5">
        {isSuperAdmin && (
          <Link
            href="/admin"
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 min-h-[44px] group overflow-hidden",
              isActive("/admin")
                ? "text-brand-primary"
                : "text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#FAFAFA]",
            )}
            aria-current={isActive("/admin") ? "page" : undefined}
          >
            {isActive("/admin") && (
              <>
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-0 rounded-lg bg-brand-primary/10"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              </>
            )}
            <div
              className={cn(
                "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                isActive("/admin") ? "bg-brand-primary/20" : "group-hover:bg-[#27272A]",
              )}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            </div>
            <span className="relative z-10">Admin</span>
          </Link>
        )}
        <Link
          href={settingsItem.href}
          className={cn(
            "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 min-h-[44px] group overflow-hidden",
            isActive(settingsItem.href)
              ? "text-brand-primary"
              : "text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#FAFAFA]",
          )}
          aria-current={isActive(settingsItem.href) ? "page" : undefined}
        >
          {isActive(settingsItem.href) && (
            <>
              <motion.div
                layoutId="sidebar-active-bg"
                className="absolute inset-0 rounded-lg bg-brand-primary/10"
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              />
              <motion.div
                layoutId="sidebar-indicator"
                className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-primary"
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              />
            </>
          )}
          <div
            className={cn(
              "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
              isActive(settingsItem.href) ? "bg-brand-primary/20" : "group-hover:bg-[#27272A]",
            )}
          >
            <settingsItem.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          </div>
          <span className="relative z-10">{settingsItem.label}</span>
        </Link>
      </div>
    </aside>
  );
}
