"use client";

import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { VizionLogo } from "@/components/shared/vizion-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/app/actions/auth";

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
  if (parts.length === 1) return (parts[0]?.[0] ?? "V").toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function Topbar({ user, userName, userAvatarUrl }: TopbarProps) {
  const displayName = user?.name ?? userName ?? null;
  const displayAvatar = user?.avatarUrl ?? userAvatarUrl ?? null;
  return (
    <header className="relative sticky top-0 z-40 flex h-14 items-center justify-between bg-[#09090B]/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-[#09090B]/80 sm:px-6">
      {/* Bottom border: solid base + orange gradient overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[#3F3F46]/60" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#FF6A1A]/50 to-transparent" />

      <Link href="/inicio" aria-label="Ir al inicio">
        <VizionLogo variant="full" size={28} />
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg px-2 py-1 transition-all duration-200 hover:bg-[#18181B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A1A] min-h-[44px]"
            aria-label="Menú de usuario"
          >
            {/* Avatar with orange gradient ring */}
            <div className="relative h-8 w-8 rounded-full bg-gradient-to-br from-[#FF6A1A] to-[#C04A00] p-[1.5px]">
              <Avatar className="h-full w-full">
                {displayAvatar && (
                  <AvatarImage src={displayAvatar} alt={displayName ?? "Avatar"} />
                )}
                <AvatarFallback className="bg-[#1C1C1F] text-[#FF6A1A] text-xs font-bold">
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
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-[#EF4444] focus:text-[#EF4444]"
            onSelect={async () => {
              await signOutAction();
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Salir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
