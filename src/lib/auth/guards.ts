// =============================================================================
// VIZION — Demo mode auth guards
// All functions return the hardcoded demo trainer immediately.
// No DB, no session checks, no redirects (except role-mismatch).
// =============================================================================

import { redirect } from "next/navigation";

const DEMO_TRAINER = {
  id: "trainer-demo-001",
  name: "Coach Demo",
  email: "demo@vizion.app",
  role: "TRAINER" as const,
  emailVerified: new Date("2024-01-01"),
  pushOptIn: false,
  avatarUrl: null,
  gender: "MALE" as const,
  dateOfBirth: new Date("1985-01-01"),
  passwordHash: null,
  locale: "es-CR",
  theme: "dark",
  trainerProfile: {
    id: "trainer-profile-demo",
    userId: "trainer-demo-001",
    tradeName: "Vizion Demo Gym",
    specialty: "Hipertrofia y pérdida de grasa",
    bio: "Cuenta demo para presentación.",
    defaultMonthlyPriceCRC: { toString: () => "60000" },
  },
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date(),
  deletedAt: null,
};

const DEMO_SUBSCRIPTION = {
  id: "sub-demo",
  trainerUserId: "trainer-demo-001",
  tier: "PRO" as const,
  status: "ACTIVE" as const,
  currentPeriodStart: new Date("2024-01-01"),
  currentPeriodEnd: new Date("2099-12-31"),
};

export async function getCurrentUser() {
  return DEMO_TRAINER;
}

export async function requireUser() {
  return DEMO_TRAINER;
}

export async function requireRole(_role: string) {
  return DEMO_TRAINER;
}

export async function requireTrainer() {
  return DEMO_TRAINER;
}

export async function requireClient(): Promise<never> {
  redirect("/inicio");
}

export async function requireAdmin(): Promise<never> {
  redirect("/inicio");
}

export async function assertOwnsClient(
  _trainerId: string,
  _clientId: string,
): Promise<void> {
  // No-op in demo
}

export async function getActiveTrainerSubscription(
  _trainerId?: string,
) {
  return DEMO_SUBSCRIPTION;
}

export async function requireActiveSubscription(
  _trainerId?: string,
) {
  return DEMO_SUBSCRIPTION;
}

export async function assertHasConsent(
  _userId: string,
  _type: string,
): Promise<void> {
  // No-op in demo
}
