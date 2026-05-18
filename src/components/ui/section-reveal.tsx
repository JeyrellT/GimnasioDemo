"use client";

// =============================================================================
// BLACKLINE FITNESS — SectionReveal
// Owner: frontend-react.
// Scroll-triggered reveal: fades in + slides up (y 24px → 0) on enter.
// once: true → animation fires once and stays visible.
// Respects prefers-reduced-motion: renders children without animation if true.
// =============================================================================

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

import { cn } from "@/lib/utils";

export interface SectionRevealProps {
  children: React.ReactNode;
  delay?: number;  // stagger delay in seconds, e.g. 0.1 per sibling
  className?: string;
}

export function SectionReveal({
  children,
  delay = 0,
  className,
}: SectionRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-60px" });

  // When reduced motion is preferred, skip all transforms — render as plain div
  if (shouldReduceMotion) {
    return (
      <div ref={ref} className={cn(className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{
        type: "spring",
        stiffness: 90,
        damping: 20,
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}
