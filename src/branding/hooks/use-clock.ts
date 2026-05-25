"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Devuelve un string HH:MM:SS CST que tickea cada segundo.
 * Empieza vacío ("—") para evitar hydration mismatch — se hidrata client-side.
 */
export function useClock() {
  const [time, setTime] = useState("—");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} CST`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}
