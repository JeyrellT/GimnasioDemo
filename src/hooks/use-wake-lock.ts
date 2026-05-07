"use client";

import { useEffect, useRef, useCallback } from "react";

type WakeLockSentinel = {
  release: () => Promise<void>;
  released: boolean;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinel>;
  };
};

export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const nav = navigator as NavigatorWithWakeLock;

  const request = useCallback(async () => {
    if (!nav.wakeLock) return;
    try {
      sentinelRef.current = await nav.wakeLock.request("screen");
    } catch {
      // Wake lock not available or denied — silent, no crash
    }
  }, [nav]);

  const release = useCallback(async () => {
    if (sentinelRef.current && !sentinelRef.current.released) {
      await sentinelRef.current.release();
      sentinelRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (active) {
      void request();
    } else {
      void release();
    }

    return () => {
      void release();
    };
  }, [active, request, release]);

  // Re-acquire on visibility change (user tabs back)
  useEffect(() => {
    if (!active) return;

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void request();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [active, request]);
}
