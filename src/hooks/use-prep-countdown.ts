"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  playTick,
  playGo,
  vibrate,
} from "@/lib/audio/timer-sounds";

// --- Types ---

export interface UsePrepCountdownOptions {
  /** Seconds to count down from. Default: 3. */
  seconds?: number;
  /** Called on each whole-second decrement (3, 2, 1). */
  onTick?: (secondsLeft: number) => void;
  /** Called exactly once when the countdown reaches 0. */
  onComplete?: () => void;
}

export interface UsePrepCountdownResult {
  /** Current visible second (3 → 2 → 1 → 0). */
  secondsLeft: number;
  /** True while the countdown is running. */
  isActive: boolean;
  /** Starts a new countdown. Resets if already running. */
  start: (seconds?: number) => void;
  /** Cancels without firing onComplete. */
  cancel: () => void;
}

// --- Optional default callbacks wiring sounds to the hook ---

export const defaultPrepCallbacks: Pick<
  UsePrepCountdownOptions,
  "onTick" | "onComplete"
> = {
  onTick: (s) => {
    if (s > 0) {
      playTick();
      vibrate(40);
    }
  },
  onComplete: () => {
    playGo();
    vibrate(120);
  },
};

// --- Mutable meta kept outside React state to avoid closure staleness ---

interface PrepMeta {
  startedAt: number;
  targetSec: number;
  notified: boolean;
  /** Last whole-second value for which onTick was emitted. */
  lastTickEmitted: number;
}

// --- Hook ---

export function usePrepCountdown(
  options?: UsePrepCountdownOptions,
): UsePrepCountdownResult {
  const defaultSeconds = options?.seconds ?? 3;

  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Store callbacks in refs so the interval closure always reads the latest version
  // without needing to be recreated.
  const onTickRef = useRef(options?.onTick);
  const onCompleteRef = useRef(options?.onComplete);
  useEffect(() => {
    onTickRef.current = options?.onTick;
    onCompleteRef.current = options?.onComplete;
  });

  const meta = useRef<PrepMeta>({
    startedAt: 0,
    targetSec: 0,
    notified: false,
    lastTickEmitted: -1,
  });

  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    clearTick();
    setIsActive(false);
    setSecondsLeft(0);
    meta.current.notified = true; // prevents a late interval from firing onComplete
    meta.current.lastTickEmitted = -1;
  }, [clearTick]);

  const start = useCallback(
    (seconds?: number) => {
      clearTick();

      const target = seconds ?? defaultSeconds;

      meta.current.startedAt = Date.now();
      meta.current.targetSec = target;
      meta.current.notified = false;
      meta.current.lastTickEmitted = target; // will be emitted immediately below

      setSecondsLeft(target);
      setIsActive(true);

      // Fire the first tick synchronously so the consumer sees "3" with sound
      // at the exact moment start() is called.
      onTickRef.current?.(target);
    },
    [clearTick, defaultSeconds],
  );

  // Main interval — runs whenever isActive flips true.
  useEffect(() => {
    if (!isActive) {
      clearTick();
      return;
    }

    intervalRef.current = setInterval(() => {
      if (document.hidden) return;

      const elapsed = Math.floor(
        (Date.now() - meta.current.startedAt) / 1000,
      );
      const remaining = Math.max(0, meta.current.targetSec - elapsed);

      setSecondsLeft(remaining);

      // Emit onTick only when we cross a new whole second boundary,
      // skip seconds already emitted (handles visibility-change gap: if the
      // user was away for 2 s we do NOT back-fill tick(2) and tick(1),
      // we only emit the current remaining if it is a new unseen value).
      if (
        remaining > 0 &&
        remaining < meta.current.lastTickEmitted
      ) {
        meta.current.lastTickEmitted = remaining;
        onTickRef.current?.(remaining);
      }

      if (remaining === 0 && !meta.current.notified) {
        meta.current.notified = true;
        clearTick();
        setIsActive(false);
        onCompleteRef.current?.();
      }
    }, 200);

    return clearTick;
  }, [isActive, clearTick]);

  // Cleanup on unmount.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only run on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, []);

  return { secondsLeft, isActive, start, cancel };
}
