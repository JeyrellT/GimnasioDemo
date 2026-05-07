"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Users, Library, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/biblioteca", label: "Biblioteca", icon: Library },
  { href: "/admin/lpdp", label: "LPDP", icon: Shield },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="flex w-56 flex-col fixed inset-y-0 z-30 border-r border-[#3F3F46] bg-[#09090B] pt-14">
      <nav className="flex flex-col gap-1 p-3 pt-4" aria-label="Navegación admin">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
              isActive(href)
                ? "bg-[#FF6A1A]/10 text-[#FF6A1A]"
                : "text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#FAFAFA]",
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
