"use client";

// =============================================================================
// BLACKLINE FITNESS — AnimatedCounter
// Owner: frontend-react.
// Counts from 0 → value using a spring when the element enters the viewport.
// Respects prefers-reduced-motion: renders the final value immediately if true.
// =============================================================================

import {
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  duration?: number; // ms — controls spring stiffness/damping mapping
  prefix?: string;
  suffix?: string;
  className?: string;
}

// Map a desired duration in ms to spring config.
// framer-motion springs don't take duration directly, so we approximate:
// longer duration → lower stiffness + higher damping.
function springConfigFromDuration(durationMs: number): {
  stiffness: number;
  damping: number;
} {
  // 800 ms → stiffness 80, damping 20 (reference point)
  const ratio = durationMs / 800;
  return {
    stiffness: Math.round(80 / ratio),
    damping: Math.round(20 * ratio),
  };
}

export function AnimatedCounter({
  value,
  decimals = 1,
  duration = 800,
  prefix = "",
  suffix = "",
  className,
}: AnimatedCounterProps) {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  const motionValue = useMotionValue(0);
  const { stiffness, damping } = springConfigFromDuration(duration);

  const spring = useSpring(motionValue, {
    stiffness,
    damping,
    restDelta: 0.001,
  });

  // Derive a formatted string from the spring value
  const display = useTransform(spring, (latest: number) =>
    latest.toFixed(decimals),
  );

  // Trigger animation when in view (or immediately when reduced motion)
  useEffect(() => {
    if (shouldReduceMotion) {
      motionValue.set(value);
      return;
    }
    if (inView) {
      motionValue.set(value);
    }
  }, [inView, value, motionValue, shouldReduceMotion]);

  // Subscribe the DOM node to the display transform
  useEffect(() => {
    const unsubscribe = display.on("change", (formatted: string) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${formatted}${suffix}`;
      }
    });

    // Set initial text to avoid flash of empty
    if (ref.current) {
      const initial = shouldReduceMotion
        ? `${prefix}${value.toFixed(decimals)}${suffix}`
        : `${prefix}${(0).toFixed(decimals)}${suffix}`;
      ref.current.textContent = initial;
    }

    return unsubscribe;
  }, [display, prefix, suffix, decimals, value, shouldReduceMotion]);

  return (
    <span
      ref={ref}
      className={cn("tabular-nums", className)}
      aria-label={`${prefix}${value.toFixed(decimals)}${suffix}`}
    />
  );
}
