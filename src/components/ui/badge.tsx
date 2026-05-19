import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#3B82F6] text-white hover:bg-[#2563EB]",
        secondary:
          "border-transparent bg-[#1E2A38] text-[#FAFAFA] hover:bg-[#263545]",
        destructive:
          "border-transparent bg-[#EF4444] text-white hover:bg-[#DC2626]",
        outline:
          "border-[#3F3F46] text-[#FAFAFA]",
        success:
          "border-transparent bg-[#052E16] text-[#22C55E] border-[#22C55E]/30",
        warning:
          "border-transparent bg-[#451A03] text-[#F59E0B] border-[#F59E0B]/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
