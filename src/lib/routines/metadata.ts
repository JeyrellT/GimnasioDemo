export const ROUTINE_AUDIENCES = [
  {
    value: "UNISEX",
    label: "Unisex",
    description: "Adecuada para cualquier persona",
  },
  {
    value: "MALE",
    label: "Hombre",
    description: "Diseñada con enfoque masculino",
  },
  {
    value: "FEMALE",
    label: "Mujer",
    description: "Diseñada con enfoque femenino",
  },
] as const;

export type RoutineAudienceValue = (typeof ROUTINE_AUDIENCES)[number]["value"];

export const BUILT_IN_ROUTINE_GOALS = [
  { value: "HYPERTROPHY", label: "Hipertrofia" },
  { value: "MUSCLE_GAIN", label: "Volumen / ganancia muscular" },
  { value: "DEFINITION", label: "Definición" },
  { value: "FAT_LOSS", label: "Pérdida de grasa" },
  { value: "STRENGTH", label: "Fuerza" },
  { value: "ENDURANCE", label: "Resistencia" },
  { value: "GENERAL", label: "General / mantenimiento" },
] as const;

export function getRoutineAudienceLabel(
  audience: string | null | undefined,
): string {
  return (
    ROUTINE_AUDIENCES.find((option) => option.value === audience)?.label ??
    "Unisex"
  );
}

export function getRoutineGoalLabel(goal: string): string {
  return (
    BUILT_IN_ROUTINE_GOALS.find((option) => option.value === goal)?.label ??
    goal
  );
}

export function isRoutineAudience(
  value: unknown,
): value is RoutineAudienceValue {
  return ROUTINE_AUDIENCES.some((option) => option.value === value);
}
