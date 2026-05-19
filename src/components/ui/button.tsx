"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#3B82F6] text-white hover:bg-[#2563EB] active:bg-[#CC4F0C]",
        destructive:
          "bg-[#EF4444] text-white hover:bg-[#DC2626] active:bg-[#B91C1C]",
        outline:
          "border border-[#3F3F46] bg-transparent text-[#FAFAFA] hover:bg-[#27272A] hover:border-[#52525B]",
        secondary:
          "bg-[#1E2A38] text-[#FAFAFA] hover:bg-[#263545] active:bg-[#1A2330]",
        ghost:
          "text-[#FAFAFA] hover:bg-[#27272A] hover:text-[#FAFAFA]",
        link:
          "text-[#3B82F6] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-10 px-4 py-2 min-h-[44px]",
        sm: "h-9 px-3 text-xs min-h-[36px]",
        lg: "h-12 px-8 text-base min-h-[48px]",
        icon: "h-10 w-10 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
