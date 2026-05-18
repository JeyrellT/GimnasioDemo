"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Users, CreditCard, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: BarChart3, exact: true },
  { href: "/admin/users", label: "Usuarios", icon: Users, exact: false },
  { href: "/admin/subscriptions", label: "Licencias", icon: CreditCard, exact: false },
  { href: "/admin/referrals", label: "Referidos", icon: UserPlus, exact: false },
] as const;

export function AdminBottomNav() {
  const pathname = usePathname();
  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 sm:hidden"
      aria-label="Navegación admin"
    >
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-[#09090B]/80 to-transparent" />
      <div className="flex h-16 items-center border-t border-[#3F3F46]/80 bg-[#09090B]/90 backdrop-blur-md px-1">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[44px] py-2"
              aria-current={active ? "page" : undefined}
            >
              <motion.div
                animate={active ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(
                  "flex items-center justify-center rounded-full transition-colors duration-200",
                  active ? "bg-[#FF6A1A]/15 p-1.5" : "p-1.5",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors duration-200",
                    active ? "text-[#FF6A1A]" : "text-[#71717A]",
                  )}
                  aria-hidden="true"
                />
              </motion.div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-200 leading-none",
                  active ? "text-[#FF6A1A]" : "text-[#71717A]",
                )}
              >
                {label}
              </span>
              <AnimatePresence>
                {active && (
                  <motion.span
                    key="dot"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute bottom-1 h-1 w-1 rounded-full bg-[#FF6A1A]"
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
