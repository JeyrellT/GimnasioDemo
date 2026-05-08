"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { db } from "@/lib/offline/db";

export type DemoRole = "TRAINER" | "CLIENT";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: DemoRole;
  avatarInitials: string;
}

export const DEMO_PROFILES: DemoUser[] = [
  {
    id: "trainer-demo-001",
    name: "Coach Demo",
    email: "demo@forja.app",
    role: "TRAINER",
    avatarInitials: "CD",
  },
  {
    id: "client-ana",
    name: "Ana Solís Mora",
    email: "ana.solis@demo.local",
    role: "CLIENT",
    avatarInitials: "AS",
  },
  {
    id: "client-bruno",
    name: "Bruno Jiménez Rojas",
    email: "bruno.jimenez@demo.local",
    role: "CLIENT",
    avatarInitials: "BJ",
  },
  {
    id: "client-diana",
    name: "Diana Mora Quesada",
    email: "diana.mora@demo.local",
    role: "CLIENT",
    avatarInitials: "DM",
  },
];

const STORAGE_KEY = "forja-demo-profile";

function avatarKey(userId: string) {
  return `avatar-${userId}`;
}

function getStoredProfile(): DemoUser {
  if (typeof window === "undefined") return DEMO_PROFILES[0];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const id = JSON.parse(stored) as string;
      return DEMO_PROFILES.find((p) => p.id === id) ?? DEMO_PROFILES[0];
    }
  } catch {}
  return DEMO_PROFILES[0];
}

interface DemoAuthContextValue {
  user: DemoUser;
  avatarUrl: string | null;
  setProfile: (id: string) => void;
  setAvatar: (file: File) => Promise<void>;
  removeAvatar: () => Promise<void>;
}

const DemoAuthContext = createContext<DemoAuthContextValue>({
  user: DEMO_PROFILES[0],
  avatarUrl: null,
  setProfile: () => {},
  setAvatar: async () => {},
  removeAvatar: async () => {},
});

export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser>(DEMO_PROFILES[0]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const loadAvatar = useCallback(async (userId: string) => {
    try {
      const entry = await db.kvStore.get(avatarKey(userId));
      setAvatarUrl((entry?.value as string) ?? null);
    } catch {
      setAvatarUrl(null);
    }
  }, []);

  useEffect(() => {
    const profile = getStoredProfile();
    setUser(profile);
    loadAvatar(profile.id);
  }, [loadAvatar]);

  function setProfile(id: string) {
    const profile = DEMO_PROFILES.find((p) => p.id === id) ?? DEMO_PROFILES[0];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile.id));
    setUser(profile);
    loadAvatar(profile.id);
  }

  async function setAvatar(file: File) {
    const dataUrl = await fileToDataUrl(file);
    await db.kvStore.put({ key: avatarKey(user.id), value: dataUrl });
    setAvatarUrl(dataUrl);
  }

  async function removeAvatar() {
    await db.kvStore.delete(avatarKey(user.id));
    setAvatarUrl(null);
  }

  return (
    <DemoAuthContext.Provider
      value={{ user, avatarUrl, setProfile, setAvatar, removeAvatar }}
    >
      {children}
    </DemoAuthContext.Provider>
  );
}

export function useDemoUser(): DemoUser {
  return useContext(DemoAuthContext).user;
}

export function useDemoAuth(): DemoAuthContextValue {
  return useContext(DemoAuthContext);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
