"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, User, ArrowLeftRight, Settings } from "lucide-react";
import { BlacklineFitnessLogo } from "@/components/shared/blackline-fitness-logo";
import { useBranding } from "@/lib/branding/branding-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

interface UserShape {
  name: string | null;
  avatarUrl?: string | null;
}

interface TopbarProps {
  /** Pass the full user object from getCurrentUser() */
  user?: UserShape;
  /** Fallback if only name is available */
  userName?: string | null;
  /** Fallback if only avatarUrl is available */
  userAvatarUrl?: string | null;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "V";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return (parts[0]?.[0] ?? "F").toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function Topbar({ user, userName, userAvatarUrl }: TopbarProps) {
  const router = useRouter();
  const displayName = user?.name ?? userName ?? null;
  const displayAvatar = user?.avatarUrl ?? userAvatarUrl ?? null;
  const { branding } = useBranding();

  return (
    <header className="relative flex h-14 items-center justify-between bg-canvas px-4 sm:px-6">
      {/* Bottom border: solid base + brand gradient overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[#3F3F46]/60" />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, var(--brand-primary) 50%, transparent)`,
          opacity: 0.5,
        }}
      />

      <Link href="/inicio" aria-label="Ir al inicio" className="flex items-center gap-2">
        {/* Mobile: mark or custom mark */}
        <span className="sm:hidden flex items-center gap-1.5">
          {branding.logoMark ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoMark} alt="Logo" className="h-7 w-7 object-contain" />
          ) : (
            <BlacklineFitnessLogo variant="mark" size={26} />
          )}
          {/* Business name on mobile — short truncated */}
          {branding.businessName && (
            <span className="text-xs font-bold text-text-primary truncate max-w-[100px]">
              {branding.businessName}
            </span>
          )}
        </span>
        {/* Desktop: logo + name */}
        <span className="hidden sm:inline-flex items-center gap-2">
          {branding.logoFull ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoFull} alt="Logo" className="h-8 max-w-[160px] object-contain" />
          ) : (
            <BlacklineFitnessLogo variant={branding.businessName ? "mark" : "full"} size={28} />
          )}
          {/* Business name always visible on desktop when set */}
          {branding.businessName && (
            <span className="text-sm font-bold text-text-primary tracking-wide truncate max-w-[180px]">
              {branding.businessName}
            </span>
          )}
        </span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg px-2 py-1 transition-all duration-200 hover:bg-[#18181B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary min-h-[44px]"
            aria-label="Menú de usuario"
          >
            {/* Avatar with blue gradient ring */}
            <div className="relative h-8 w-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-deep p-[1.5px]">
              <Avatar className="h-full w-full">
                {displayAvatar && (
                  <AvatarImage src={displayAvatar} alt={displayName ?? "Avatar"} />
                )}
                <AvatarFallback className="bg-[#1C1C1F] text-brand-primary text-xs font-bold">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            </div>
            {/* Show name on sm+ */}
            {displayName && (
              <span className="hidden sm:block text-sm font-medium text-[#FAFAFA] max-w-[120px] truncate">
                {displayName.split(" ")[0]}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {displayName && (
            <>
              <div className="px-2 py-1.5">
                <p className="text-sm font-semibold text-[#FAFAFA] truncate">{displayName}</p>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem asChild>
            <Link href="/perfil" className="flex items-center gap-2">
              <User className="h-4 w-4" aria-hidden="true" />
              Perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/trainer/ajustes" className="flex items-center gap-2">
              <Settings className="h-4 w-4" aria-hidden="true" />
              Ajustes
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {IS_DEMO && (
            <DropdownMenuItem
              onSelect={() => router.push("/ingresar")}
            >
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              Cambiar perfil
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-[#EF4444] focus:text-[#EF4444]"
            onSelect={() => {
              if (IS_DEMO) {
                router.push("/ingresar");
              } else {
                signOut({ callbackUrl: "/ingresar" });
              }
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Cerrar sesion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
