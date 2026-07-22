"use client";

// =============================================================================
// BLACKLINE FITNESS — useMediaQuery
// Owner: frontend-react.
// Hook SSR-safe para media queries. Evita hydration mismatch devolviendo false
// en el primer render del servidor.
// =============================================================================

import * as React from "react";

/**
 * Returns true if the media query matches, false otherwise.
 * SSR-safe: always returns false on the server to avoid hydration mismatch.
 *
 * @example
 * const isDesktop = useMediaQuery("(min-width: 768px)");
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    function handleChange(e: MediaQueryListEvent) {
      setMatches(e.matches);
    }

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}
