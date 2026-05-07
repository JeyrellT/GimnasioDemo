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
