import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/domain";

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

const roleConfig: Record<
  UserRole,
  { label: string; className: string }
> = {
  TRAINER: {
    label: "Entrenador",
    className: "bg-[#1E2A38] text-[#60A5FA] border border-[#60A5FA]/20",
  },
  CLIENT: {
    label: "Cliente",
    className: "bg-[#18181B] text-[#A1A1AA] border border-[#3F3F46]",
  },
  ADMIN: {
    label: "Admin",
    className: "bg-[#052E16] text-[#22C55E] border border-[#22C55E]/20",
  },
  SUPER_ADMIN: {
    label: "Super Admin",
    className: "bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/30",
  },
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const config = roleConfig[role];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
