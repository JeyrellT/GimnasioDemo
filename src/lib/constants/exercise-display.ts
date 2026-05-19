// Muscle group Spanish labels
export const MUSCLE_LABELS: Record<string, string> = {
  CHEST: "Pecho",
  BACK: "Espalda",
  SHOULDERS: "Hombros",
  BICEPS: "Bíceps",
  TRICEPS: "Tríceps",
  FOREARMS: "Antebrazos",
  ABS: "Abdomen",
  OBLIQUES: "Oblicuos",
  GLUTES: "Glúteos",
  QUADS: "Cuádriceps",
  HAMSTRINGS: "Isquiotibiales",
  CALVES: "Gemelos",
  NECK: "Cuello",
  FULL_BODY: "Cuerpo entero",
};

// Muscle group colors (Tailwind classes)
export const MUSCLE_COLORS: Record<string, { bg: string; text: string }> = {
  CHEST:      { bg: "bg-[#EF4444]/20", text: "text-[#EF4444]" },
  BACK:       { bg: "bg-brand-primary/20", text: "text-brand-primary" },
  SHOULDERS:  { bg: "bg-[#F59E0B]/20", text: "text-[#F59E0B]" },
  BICEPS:     { bg: "bg-[#A855F7]/20", text: "text-[#A855F7]" },
  TRICEPS:    { bg: "bg-[#EC4899]/20", text: "text-[#EC4899]" },
  FOREARMS:   { bg: "bg-[#84CC16]/20", text: "text-[#84CC16]" },
  ABS:        { bg: "bg-[#06B6D4]/20", text: "text-[#06B6D4]" },
  OBLIQUES:   { bg: "bg-[#0EA5E9]/20", text: "text-[#0EA5E9]" },
  GLUTES:     { bg: "bg-[#F97316]/20", text: "text-[#F97316]" },
  QUADS:      { bg: "bg-[#22C55E]/20", text: "text-[#22C55E]" },
  HAMSTRINGS: { bg: "bg-[#14B8A6]/20", text: "text-[#14B8A6]" },
  CALVES:     { bg: "bg-[#6366F1]/20", text: "text-[#6366F1]" },
  NECK:       { bg: "bg-[#A1A1AA]/20", text: "text-[#A1A1AA]" },
  FULL_BODY:  { bg: "bg-[#8B5CF6]/20", text: "text-[#8B5CF6]" },
  BODY_WEIGHT: { bg: "bg-[#27272A]", text: "text-[#A1A1AA]" },
};

// Equipment Spanish labels
export const EQUIPMENT_LABELS: Record<string, string> = {
  BODYWEIGHT:  "Peso corporal",
  BODY_WEIGHT: "Peso corporal",
  BARBELL:     "Barra",
  DUMBBELL:    "Mancuerna",
  KETTLEBELL:  "Kettlebell",
  MACHINE:     "Máquina",
  CABLE:       "Cable",
  BAND:        "Banda",
  OTHER:       "Otro",
};

// Difficulty display meta
export const DIFFICULTY_META: Record<string, { label: string; filled: 1 | 2 | 3 }> = {
  BEGINNER:     { label: "Principiante", filled: 1 },
  INTERMEDIATE: { label: "Intermedio",   filled: 2 },
  ADVANCED:     { label: "Avanzado",     filled: 3 },
};
