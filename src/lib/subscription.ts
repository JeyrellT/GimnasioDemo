// =============================================================================
// BLACKLINE FITNESS — Subscription access evaluation (pure, isomorphic)
// Owner: backend-api.
//
// Single source of truth for "is this trainer's Blackline subscription still
// valid?". Pure function, no DB / no server-only imports, so it can be reused
// by the server guards (mutation gating) AND by client components (renew-wall
// copy). Time is injected so it is deterministic and testable.
//
// IMPORTANT: the trial does NOT expire anywhere else. Before this module the
// guards treated `status: TRIAL` as active forever regardless of `trialEndsAt`.
// Expiry is now computed lazily on read from the stored dates — no cron needed.
// =============================================================================

import type { SubscriptionStatus } from "@prisma/client";

/**
 * Reasons that force the full-screen renew wall (interface pause).
 * These mean "the subscription window has lapsed — pay to continue".
 */
export type SubscriptionLockReason =
  | "TRIAL_EXPIRED" // trial window elapsed (now > trialEndsAt)
  | "PERIOD_EXPIRED" // paid window elapsed (now > currentPeriodEnd)
  | "PAST_DUE" // provider reported a failed/overdue charge
  | "CANCELLED"; // subscription hard-cancelled

/** All access reasons, including the non-locking ones. */
export type SubscriptionAccessReason =
  | "ACTIVE" // fully usable
  | "READ_ONLY" // admin soft-disable: can view, cannot write (no full wall)
  | "NO_SUBSCRIPTION" // no row (edge case) — writes blocked, interface not walled
  | SubscriptionLockReason;

export interface SubscriptionAccess {
  /** True when write features (mutations) are allowed. */
  active: boolean;
  /** True when the ENTIRE trainer interface must be paused behind the renew wall. */
  locked: boolean;
  reason: SubscriptionAccessReason;
}

/** Minimal shape needed to evaluate access. */
export interface EvaluableSubscription {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

/**
 * Evaluate a trainer's subscription access at a given instant.
 *
 * - TRIAL   → active until `trialEndsAt` (falls back to `currentPeriodEnd`).
 *             Once elapsed → locked (TRIAL_EXPIRED).
 * - ACTIVE  → active until `currentPeriodEnd`. Once elapsed → locked
 *             (PERIOD_EXPIRED). ONVO stacks +30d on every payment, so a real
 *             payer always has a future `currentPeriodEnd`.
 * - PAST_DUE / CANCELLED → locked.
 * - READ_ONLY → writes blocked but NOT walled (preserves the admin
 *               soft-disable tool that lets a trainer log in and view data).
 * - null    → no subscription row: writes blocked, but interface NOT walled to
 *             avoid accidentally locking out an account with a data gap.
 */
export function evaluateSubscriptionAccess(
  sub: EvaluableSubscription | null,
  now: Date = new Date(),
): SubscriptionAccess {
  if (!sub) {
    return { active: false, locked: false, reason: "NO_SUBSCRIPTION" };
  }

  const t = now.getTime();

  switch (sub.status) {
    case "TRIAL": {
      const end = sub.trialEndsAt ?? sub.currentPeriodEnd;
      if (end && t > end.getTime()) {
        return { active: false, locked: true, reason: "TRIAL_EXPIRED" };
      }
      return { active: true, locked: false, reason: "ACTIVE" };
    }

    case "ACTIVE": {
      if (sub.currentPeriodEnd && t > sub.currentPeriodEnd.getTime()) {
        return { active: false, locked: true, reason: "PERIOD_EXPIRED" };
      }
      return { active: true, locked: false, reason: "ACTIVE" };
    }

    case "PAST_DUE":
      return { active: false, locked: true, reason: "PAST_DUE" };

    case "CANCELLED":
      return { active: false, locked: true, reason: "CANCELLED" };

    case "READ_ONLY":
      return { active: false, locked: false, reason: "READ_ONLY" };

    default:
      // Exhaustiveness guard — unknown statuses fail open on interface, closed
      // on writes would be safer, but keep usable to avoid surprise lockouts.
      return { active: true, locked: false, reason: "ACTIVE" };
  }
}
