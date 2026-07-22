import { describe, it, expect } from "vitest";
import {
  medicalConditionItemSchema,
  saveMedicalConditionsInput,
  MEDICAL_CONDITION_KINDS,
  CONDITION_SEVERITIES,
} from "@/lib/validation/medical-conditions.schema";

describe("medical-conditions.schema", () => {
  // ── medicalConditionItemSchema ──────────────────────────────────────────────

  describe("medicalConditionItemSchema", () => {
    it("accepts a minimal valid item (required fields only)", () => {
      const result = medicalConditionItemSchema.safeParse({
        kind: "ALLERGY",
        label: "Penicilina",
        isActive: true,
      });
      expect(result.success).toBe(true);
    });

    it("accepts a fully populated item", () => {
      const result = medicalConditionItemSchema.safeParse({
        id: "clxxxxxxxxxxxxxxxxxxxxxx",
        kind: "INJURY",
        label: "Lesión de rodilla",
        detail: "Desgarro parcial de ligamento lateral interno",
        severity: "MODERATE",
        startedAt: "2024-01-15",
        isActive: true,
      });
      expect(result.success).toBe(true);
    });

    it("rejects an empty label", () => {
      const result = medicalConditionItemSchema.safeParse({
        kind: "CHRONIC",
        label: "",
        isActive: true,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("vacío");
      }
    });

    it("rejects a label exceeding 80 characters", () => {
      const result = medicalConditionItemSchema.safeParse({
        kind: "OTHER",
        label: "a".repeat(81),
        isActive: false,
      });
      expect(result.success).toBe(false);
    });

    it("rejects a detail exceeding 500 characters", () => {
      const result = medicalConditionItemSchema.safeParse({
        kind: "MEDICATION",
        label: "Metformina",
        detail: "x".repeat(501),
        isActive: true,
      });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid kind value", () => {
      const result = medicalConditionItemSchema.safeParse({
        kind: "UNKNOWN_KIND",
        label: "Algo",
        isActive: true,
      });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid severity value", () => {
      const result = medicalConditionItemSchema.safeParse({
        kind: "SURGERY",
        label: "Cirugía de menisco",
        severity: "CRITICAL", // not in enum
        isActive: false,
      });
      expect(result.success).toBe(false);
    });

    it("accepts null startedAt", () => {
      const result = medicalConditionItemSchema.safeParse({
        kind: "ALLERGY",
        label: "Látex",
        startedAt: null,
        isActive: true,
      });
      expect(result.success).toBe(true);
    });

    it("accepts omitted optional fields", () => {
      // detail, severity, startedAt are all optional
      const result = medicalConditionItemSchema.safeParse({
        kind: "CHRONIC",
        label: "Hipertensión",
        isActive: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.detail).toBeUndefined();
        expect(result.data.severity).toBeUndefined();
        expect(result.data.startedAt).toBeUndefined();
      }
    });
  });

  // ── saveMedicalConditionsInput ──────────────────────────────────────────────

  describe("saveMedicalConditionsInput", () => {
    const validItem = { kind: "ALLERGY" as const, label: "Polen", isActive: true };

    it("accepts a valid payload with reviewed: true", () => {
      const result = saveMedicalConditionsInput.safeParse({
        items: [validItem],
        reviewed: true,
      });
      expect(result.success).toBe(true);
    });

    it("accepts an empty items array (client cleared the list)", () => {
      const result = saveMedicalConditionsInput.safeParse({
        items: [],
        reviewed: true,
      });
      expect(result.success).toBe(true);
    });

    it("rejects reviewed: false", () => {
      const result = saveMedicalConditionsInput.safeParse({
        items: [validItem],
        reviewed: false,
      });
      expect(result.success).toBe(false);
    });

    it("rejects items array exceeding 30 entries", () => {
      const items = Array.from({ length: 31 }, (_, i) => ({
        kind: "OTHER" as const,
        label: `Condición ${i + 1}`,
        isActive: true,
      }));
      const result = saveMedicalConditionsInput.safeParse({
        items,
        reviewed: true,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("30");
      }
    });

    it("accepts exactly 30 items", () => {
      const items = Array.from({ length: 30 }, (_, i) => ({
        kind: "OTHER" as const,
        label: `Condición ${i + 1}`,
        isActive: true,
      }));
      const result = saveMedicalConditionsInput.safeParse({
        items,
        reviewed: true,
      });
      expect(result.success).toBe(true);
    });

    it("fails when a nested item is invalid (propagates item errors)", () => {
      const result = saveMedicalConditionsInput.safeParse({
        items: [{ kind: "ALLERGY", label: "", isActive: true }], // empty label
        reviewed: true,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Enum constants ──────────────────────────────────────────────────────────

  describe("exported enum arrays", () => {
    it("MEDICAL_CONDITION_KINDS contains all 6 expected values", () => {
      expect(MEDICAL_CONDITION_KINDS).toHaveLength(6);
      expect(MEDICAL_CONDITION_KINDS).toContain("ALLERGY");
      expect(MEDICAL_CONDITION_KINDS).toContain("INJURY");
      expect(MEDICAL_CONDITION_KINDS).toContain("CHRONIC");
      expect(MEDICAL_CONDITION_KINDS).toContain("MEDICATION");
      expect(MEDICAL_CONDITION_KINDS).toContain("SURGERY");
      expect(MEDICAL_CONDITION_KINDS).toContain("OTHER");
    });

    it("CONDITION_SEVERITIES contains all 3 expected values", () => {
      expect(CONDITION_SEVERITIES).toHaveLength(3);
      expect(CONDITION_SEVERITIES).toContain("MILD");
      expect(CONDITION_SEVERITIES).toContain("MODERATE");
      expect(CONDITION_SEVERITIES).toContain("SEVERE");
    });
  });
});
