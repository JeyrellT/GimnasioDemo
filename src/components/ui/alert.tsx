import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-[#FAFAFA]",
  {
    variants: {
      variant: {
        default:
          "border-[#3F3F46] bg-[#18181B] text-[#FAFAFA] [&>svg]:text-[#A1A1AA]",
        destructive:
          "border-[#EF4444]/50 bg-[#450A0A] text-[#FCA5A5] [&>svg]:text-[#EF4444]",
        success:
          "border-[#22C55E]/50 bg-[#052E16] text-[#86EFAC] [&>svg]:text-[#22C55E]",
        warning:
          "border-[#F59E0B]/50 bg-[#451A03] text-[#FDE68A] [&>svg]:text-[#F59E0B]",
        info:
          "border-brand-primary/50 bg-[#1E3A5F] text-[#BFDBFE] [&>svg]:text-brand-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
