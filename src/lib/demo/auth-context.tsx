"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: "TRAINER";
}

const DEMO_USER: DemoUser = {
  id: "trainer-demo-001",
  name: "Coach Demo",
  email: "demo@forja.app",
  role: "TRAINER",
};

const DemoAuthContext = createContext<DemoUser>(DEMO_USER);

export function DemoAuthProvider({ children }: { children: ReactNode }) {
  return (
    <DemoAuthContext.Provider value={DEMO_USER}>
      {children}
    </DemoAuthContext.Provider>
  );
}

export function useDemoUser(): DemoUser {
  return useContext(DemoAuthContext);
}
