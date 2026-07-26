import { describe, it, expect } from "vitest";
import { evaluateSubscriptionAccess } from "@/lib/subscription";

// Fixed "now" for deterministic date math.
const NOW = new Date("2026-07-25T12:00:00Z");
const daysFromNow = (n: number) =>
  new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

describe("evaluateSubscriptionAccess — muro de renovación", () => {
  it("TRIAL vigente (trialEndsAt en el futuro) → activo, sin muro", () => {
    const r = evaluateSubscriptionAccess(
      { status: "TRIAL", trialEndsAt: daysFromNow(5), currentPeriodEnd: daysFromNow(5) },
      NOW,
    );
    expect(r).toEqual({ active: true, locked: false, reason: "ACTIVE" });
  });

  it("TRIAL vencido (trialEndsAt en el pasado) → bloqueado con muro", () => {
    const r = evaluateSubscriptionAccess(
      { status: "TRIAL", trialEndsAt: daysFromNow(-1), currentPeriodEnd: daysFromNow(-1) },
      NOW,
    );
    expect(r.active).toBe(false);
    expect(r.locked).toBe(true);
    expect(r.reason).toBe("TRIAL_EXPIRED");
  });

  it("TRIAL justo en el límite (now === trialEndsAt) sigue activo", () => {
    const r = evaluateSubscriptionAccess(
      { status: "TRIAL", trialEndsAt: new Date(NOW), currentPeriodEnd: new Date(NOW) },
      NOW,
    );
    expect(r.active).toBe(true);
    expect(r.locked).toBe(false);
  });

  it("TRIAL sin trialEndsAt cae a currentPeriodEnd", () => {
    const r = evaluateSubscriptionAccess(
      { status: "TRIAL", trialEndsAt: null, currentPeriodEnd: daysFromNow(-2) },
      NOW,
    );
    expect(r.reason).toBe("TRIAL_EXPIRED");
    expect(r.locked).toBe(true);
  });

  it("ACTIVE con período vigente → activo", () => {
    const r = evaluateSubscriptionAccess(
      { status: "ACTIVE", trialEndsAt: null, currentPeriodEnd: daysFromNow(20) },
      NOW,
    );
    expect(r).toEqual({ active: true, locked: false, reason: "ACTIVE" });
  });

  it("ACTIVE con período vencido → bloqueado (PERIOD_EXPIRED)", () => {
    const r = evaluateSubscriptionAccess(
      { status: "ACTIVE", trialEndsAt: null, currentPeriodEnd: daysFromNow(-1) },
      NOW,
    );
    expect(r.active).toBe(false);
    expect(r.locked).toBe(true);
    expect(r.reason).toBe("PERIOD_EXPIRED");
  });

  it("PAST_DUE → bloqueado con muro", () => {
    const r = evaluateSubscriptionAccess(
      { status: "PAST_DUE", trialEndsAt: null, currentPeriodEnd: daysFromNow(10) },
      NOW,
    );
    expect(r.active).toBe(false);
    expect(r.locked).toBe(true);
    expect(r.reason).toBe("PAST_DUE");
  });

  it("CANCELLED → bloqueado con muro", () => {
    const r = evaluateSubscriptionAccess(
      { status: "CANCELLED", trialEndsAt: null, currentPeriodEnd: daysFromNow(10) },
      NOW,
    );
    expect(r.locked).toBe(true);
    expect(r.reason).toBe("CANCELLED");
  });

  it("READ_ONLY → escritura bloqueada pero SIN muro (herramienta admin)", () => {
    const r = evaluateSubscriptionAccess(
      { status: "READ_ONLY", trialEndsAt: null, currentPeriodEnd: daysFromNow(10) },
      NOW,
    );
    expect(r.active).toBe(false);
    expect(r.locked).toBe(false);
    expect(r.reason).toBe("READ_ONLY");
  });

  it("sin suscripción → escritura bloqueada, SIN muro (no lockear por hueco de datos)", () => {
    const r = evaluateSubscriptionAccess(null, NOW);
    expect(r.active).toBe(false);
    expect(r.locked).toBe(false);
    expect(r.reason).toBe("NO_SUBSCRIPTION");
  });
});
