"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "@/stores/session-store";

// Metadata stored outside Zustand so the timer hook can reference them
// without triggering store re-renders.
const timerMeta = {
  startedAt: 0,
  targetSec: 0,
  notified: false,
  pausedRemaining: null as number | null,
};

function fireNotification() {
  if (typeof window === "undefined") return;
  if ("vibrate" in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
  if ("serviceWorker" in navigator && Notification.permission === "granted") {
    navigator.serviceWorker.ready.then((reg) => {
      void reg.showNotification("Descanso terminado", {
        body: "Siguiente set cuando quieras.",
        icon: "/icons/icon-192.svg",
        badge: "/icons/icon-192.svg",
        tag: "rest-timer",
      });
    });
  }
}

export function useRestTimer() {
  const isActive = useSessionStore((s) => s.restTimerActive);
  const secondsLeft = useSessionStore((s) => s.restTimerSecondsLeft);
  const setTimerActive = useSessionStore((s) => s.setRestTimerActive);
  const setSecondsLeft = useSessionStore((s) => s.setRestTimerSecondsLeft);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(
    (seconds: number) => {
      timerMeta.startedAt = Date.now();
      timerMeta.targetSec = seconds;
      timerMeta.notified = false;
      timerMeta.pausedRemaining = null;
      setSecondsLeft(seconds);
      setTimerActive(true);
    },
    [setSecondsLeft, setTimerActive],
  );

  const stop = useCallback(() => {
    setTimerActive(false);
    setSecondsLeft(0);
    timerMeta.pausedRemaining = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [setTimerActive, setSecondsLeft]);

  // visibilitychange: pause when tab hides, resume when visible again
  useEffect(() => {
    function handleVisibility() {
      if (!isActive) return;

      if (document.hidden) {
        // Record how many seconds remain at hide time
        const elapsed = Math.floor(
          (Date.now() - timerMeta.startedAt) / 1000,
        );
        timerMeta.pausedRemaining = Math.max(
          0,
          timerMeta.targetSec - elapsed,
        );
      } else {
        // Tab became visible — re-anchor startedAt so the remaining
        // is consistent with what the user last saw
        if (timerMeta.pausedRemaining !== null) {
          timerMeta.startedAt =
            Date.now() - (timerMeta.targetSec - timerMeta.pausedRemaining) * 1000;
          timerMeta.pausedRemaining = null;
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isActive]);

  // Main tick — 200ms for smooth display, computes against Date.now() to avoid drift
  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      // If tab is hidden, don't update UI (saves battery); real remaining
      // will be re-computed when the tab becomes visible again.
      if (document.hidden) return;

      const elapsed = Math.floor((Date.now() - timerMeta.startedAt) / 1000);
      const remaining = Math.max(0, timerMeta.targetSec - elapsed);

      setSecondsLeft(remaining);

      if (remaining === 0 && !timerMeta.notified) {
        timerMeta.notified = true;
        fireNotification();
        setTimerActive(false);
      }
    }, 200);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, setSecondsLeft, setTimerActive]);

  return { isActive, secondsLeft, start, stop };
}
