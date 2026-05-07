"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "@/stores/session-store";

export function useRestTimer() {
  const isActive = useSessionStore((s) => s.restTimerActive);
  const secondsLeft = useSessionStore((s) => s.restTimerSecondsLeft);
  const setTimerActive = useSessionStore((s) => s.setRestTimerActive);
  const setSecondsLeft = useSessionStore((s) => s.setRestTimerSecondsLeft);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(
    (seconds: number) => {
      setSecondsLeft(seconds);
      setTimerActive(true);
    },
    [setSecondsLeft, setTimerActive],
  );

  const stop = useCallback(() => {
    setTimerActive(false);
    setSecondsLeft(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [setTimerActive, setSecondsLeft]);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Timer done — notify + vibrate
          if (typeof window !== "undefined") {
            if ("vibrate" in navigator) {
              navigator.vibrate([200, 100, 200]);
            }
            // Push notification via Service Worker if registered
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
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, setSecondsLeft, setTimerActive]);

  return { isActive, secondsLeft, start, stop };
}
