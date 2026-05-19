import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="empty-state-pattern flex h-20 w-20 items-center justify-center rounded-2xl border border-[#3F3F46] bg-[#18181B]">
        <Icon
          className="h-9 w-9 text-[#52525B]"
          aria-hidden="true"
          strokeWidth={1.5}
        />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-[#FAFAFA]">{title}</h3>
        <p className="text-sm text-[#A1A1AA] max-w-xs text-balance">{description}</p>
      </div>
      {action && (
        <>
          {action.href ? (
            <a
              href={action.href}
              className="mt-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white min-h-[44px] hover:bg-brand-primary-hover transition-colors inline-flex items-center"
            >
              {action.label}
            </a>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white min-h-[44px] hover:bg-brand-primary-hover transition-colors"
            >
              {action.label}
            </button>
          )}
        </>
      )}
    </div>
  );
}
