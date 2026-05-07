"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserWithProfile } from "@/types/domain";

async function fetchCurrentUser(): Promise<UserWithProfile | null> {
  const res = await fetch("/api/auth/session");
  if (!res.ok) return null;
  const data = (await res.json()) as { user?: UserWithProfile } | null;
  return data?.user ?? null;
}

export function useCurrentUser() {
  return useQuery<UserWithProfile | null>({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
