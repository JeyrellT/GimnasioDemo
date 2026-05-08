"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, TrendingUp, Scale, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/client/sesion", label: "Sesión", icon: Dumbbell },
  { href: "/client/progreso", label: "Progreso", icon: TrendingUp },
  { href: "/client/mediciones", label: "Mediciones", icon: Scale },
  { href: "/client/entrenador", label: "Entrenador", icon: User },
] as const;

export function ClientSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/inicio" ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className="hidden sm:flex sm:w-56 sm:flex-col sm:fixed sm:top-[5.25rem] sm:bottom-0 sm:z-30 sm:border-r sm:border-[#3F3F46]/60 sm:bg-[#09090B]"
      aria-label="Navegación lateral"
    >
      <nav className="flex flex-col gap-0.5 p-3 flex-1" aria-label="Navegación principal">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[40px]",
              isActive(href)
                ? "bg-[#FF6A1A]/10 text-[#FF6A1A]"
                : "text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]",
            )}
            aria-current={isActive(href) ? "page" : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

/** @deprecated use ClientBottomNav */
export function ClientNav() {
  return <ClientBottomNav />;
}

export function ClientBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/inicio" ? pathname === href : pathname.startsWith(href);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center border-t border-[#3F3F46] bg-[#09090B] px-2"
      aria-label="Navegación principal"
    >
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors min-h-[44px] justify-center",
            isActive(href)
              ? "text-[#FF6A1A]"
              : "text-[#71717A] hover:text-[#A1A1AA]",
          )}
          aria-current={isActive(href) ? "page" : undefined}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
