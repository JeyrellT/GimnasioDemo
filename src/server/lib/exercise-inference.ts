// =============================================================================
// BLACKLINE FITNESS — Exercise metadata inference for OCR auto-create
// Owner: backend-api.
//
// Problem we solve:
//   When the OCR import detects an exercise name that doesn't exist in the
//   catalog (neither exact nor fuzzy match on nameEs), we need to create it.
//   Hardcoded defaults (FULL_BODY / OTHER / INTERMEDIATE) are useless — the
//   trainer ends up with a generic placeholder that they have to fix by hand.
//
// What this does:
//   Given the new exercise name and a snapshot of the existing catalog,
//   we score each catalog entry by token-overlap (Jaccard) with the new name,
//   then majority-vote primaryMuscle / difficulty / category from the top-K
//   neighbors. Equipment gets a hybrid treatment: if the new name contains an
//   equipment keyword ("mancuernas", "barra", "polea", "máquina", "banda",
//   "kettlebell"), that wins — otherwise the neighbors' majority equipment is
//   used. This way "Press inclinado con mancuernas" doesn't end up as BARBELL
//   just because its closest neighbor is "Press inclinado con barra".
//
// Output is a fully-typed PrismaInferredExercise, ready to feed into
// prisma.exercise.create.
//
// Pure function — no DB calls. Caller is responsible for loading the catalog
// snapshot (one query per OCR import, reused across all unmatched exercises).
// =============================================================================

import type {
  ExerciseCategory,
  ExerciseDifficulty,
  ExerciseEquipment,
  MuscleGroup,
} from "@prisma/client";

// -----------------------------------------------------------------------------
// Input/output types
// -----------------------------------------------------------------------------

/** Lean catalog snapshot — what we need from each Exercise to score it. */
export interface CatalogExercise {
  nameEs: string;
  primaryMuscle: MuscleGroup;
  equipment: ExerciseEquipment;
  difficulty: ExerciseDifficulty;
  category: ExerciseCategory;
}

/** Inferred metadata, ready to use in prisma.exercise.create.data. */
export interface InferredMetadata {
  primaryMuscle: MuscleGroup;
  equipment: ExerciseEquipment;
  difficulty: ExerciseDifficulty;
  category: ExerciseCategory;
  /** How we got here — useful for logging/debugging. */
  source: "neighbors" | "equipment-keyword-only" | "defaults";
  /** Score of the best neighbor (0..1). Null when no neighbors above threshold. */
  topScore: number | null;
  /** Number of catalog entries that survived the similarity threshold. */
  neighborCount: number;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/**
 * Spanish stopwords that appear in exercise names but carry no signal.
 * Kept short on purpose — anything more aggressive would strip useful tokens
 * (e.g., dropping "con" is safe, but dropping "alto"/"bajo" would lose info).
 */
const STOPWORDS = new Set([
  "de",
  "del",
  "con",
  "en",
  "el",
  "la",
  "los",
  "las",
  "a",
  "al",
  "y",
  "o",
  "sin",
  "para",
  "por",
]);

/**
 * Equipment keyword → enum mapping. Order does not matter; if multiple appear
 * we take the first match in the lookup order below. Watch the matching is
 * substring-based on tokens, so "mancuerna" matches both "mancuerna" and
 * "mancuernas".
 */
const EQUIPMENT_KEYWORDS: Array<{ tokens: string[]; equipment: ExerciseEquipment }> = [
  { tokens: ["mancuerna", "mancuernas", "dumbbell"], equipment: "DUMBBELL" },
  { tokens: ["barra", "barbell"], equipment: "BARBELL" },
  { tokens: ["kettlebell", "rusa"], equipment: "KETTLEBELL" }, // "pesa rusa"
  { tokens: ["polea", "poleas", "cable", "cables"], equipment: "CABLE" },
  { tokens: ["maquina", "máquina", "machine", "smith"], equipment: "MACHINE" },
  { tokens: ["banda", "bandas", "elastico", "elástico", "band"], equipment: "BAND" },
];

/** Minimum Jaccard score for a catalog entry to count as a neighbor. */
const SIMILARITY_THRESHOLD = 0.2;

/** How many top-scoring neighbors we look at when voting. */
const TOP_K = 5;

/** Safe defaults when nothing matches. */
const DEFAULTS: Omit<InferredMetadata, "source" | "topScore" | "neighborCount"> = {
  primaryMuscle: "FULL_BODY",
  equipment: "OTHER",
  difficulty: "INTERMEDIATE",
  category: "STRENGTH",
};

// -----------------------------------------------------------------------------
// Tokenization
// -----------------------------------------------------------------------------

/**
 * Lowercase, strip accents, split on non-alphanumerics, drop stopwords and
 * very short tokens. Returns a unique token set.
 */
export function tokenize(name: string): string[] {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, ""); // strip combining marks (diacritics from NFD)

  const raw = normalized.split(/[^a-z0-9]+/).filter(Boolean);

  const seen = new Set<string>();
  for (const t of raw) {
    if (t.length < 2) continue;
    if (STOPWORDS.has(t)) continue;
    seen.add(t);
  }
  return [...seen];
}

// -----------------------------------------------------------------------------
// Equipment detection
// -----------------------------------------------------------------------------

/**
 * Detect equipment from keyword presence in the tokenized name.
 * Returns null when no equipment keyword is found.
 */
export function detectEquipmentFromName(tokens: string[]): ExerciseEquipment | null {
  const tokenSet = new Set(tokens);
  for (const { tokens: keywords, equipment } of EQUIPMENT_KEYWORDS) {
    for (const kw of keywords) {
      // Normalize the keyword the same way as input tokens to compare.
      const normKw = kw
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "");
      if (tokenSet.has(normKw)) return equipment;
    }
  }
  return null;
}

// -----------------------------------------------------------------------------
// Similarity scoring (Jaccard)
// -----------------------------------------------------------------------------

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// -----------------------------------------------------------------------------
// Majority vote
// -----------------------------------------------------------------------------

function modeOf<T extends string>(values: T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | null = null;
  let bestCount = -1;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

// -----------------------------------------------------------------------------
// Main inference function
// -----------------------------------------------------------------------------

/**
 * Infer Exercise metadata for a new (uncatalogued) exercise name by looking
 * at the K most similar exercises already in the catalog.
 *
 * Resolution:
 *   1. Tokenize the new name; detect equipment keyword (if any).
 *   2. Score every catalog entry by Jaccard similarity on tokens.
 *   3. Filter to entries above SIMILARITY_THRESHOLD; keep top K by score.
 *   4. Majority-vote primaryMuscle / difficulty / category from those neighbors.
 *   5. Equipment: keyword wins if detected, else neighbors' majority,
 *      else "OTHER".
 *   6. Fall back to DEFAULTS for any field with no winner.
 */
export function inferExerciseMetadata(
  newName: string,
  catalog: CatalogExercise[],
): InferredMetadata {
  const targetTokens = tokenize(newName);
  const targetSet = new Set(targetTokens);
  const keywordEquipment = detectEquipmentFromName(targetTokens);

  // No catalog at all → can still salvage equipment from the keyword.
  if (catalog.length === 0) {
    return {
      ...DEFAULTS,
      equipment: keywordEquipment ?? DEFAULTS.equipment,
      source: keywordEquipment ? "equipment-keyword-only" : "defaults",
      topScore: null,
      neighborCount: 0,
    };
  }

  // Score every catalog entry.
  const scored: Array<{ entry: CatalogExercise; score: number }> = [];
  for (const entry of catalog) {
    const candidateTokens = tokenize(entry.nameEs);
    if (candidateTokens.length === 0) continue;
    const score = jaccard(targetSet, new Set(candidateTokens));
    if (score >= SIMILARITY_THRESHOLD) {
      scored.push({ entry, score });
    }
  }

  // No neighbors → defaults (with keyword equipment override if present).
  if (scored.length === 0) {
    return {
      ...DEFAULTS,
      equipment: keywordEquipment ?? DEFAULTS.equipment,
      source: keywordEquipment ? "equipment-keyword-only" : "defaults",
      topScore: null,
      neighborCount: 0,
    };
  }

  // Top K neighbors. We know scored.length > 0 from the early return above,
  // so neighbors is also non-empty and `top` is defined.
  scored.sort((a, b) => b.score - a.score);
  const neighbors = scored.slice(0, TOP_K);
  const [top] = neighbors;

  // Majority vote across neighbors.
  const muscleVote = modeOf(neighbors.map((n) => n.entry.primaryMuscle));
  const difficultyVote = modeOf(neighbors.map((n) => n.entry.difficulty));
  const categoryVote = modeOf(neighbors.map((n) => n.entry.category));
  const equipmentVote = modeOf(neighbors.map((n) => n.entry.equipment));

  return {
    primaryMuscle: muscleVote ?? DEFAULTS.primaryMuscle,
    equipment: keywordEquipment ?? equipmentVote ?? DEFAULTS.equipment,
    difficulty: difficultyVote ?? DEFAULTS.difficulty,
    category: categoryVote ?? DEFAULTS.category,
    source: "neighbors",
    topScore: top ? top.score : null,
    neighborCount: neighbors.length,
  };
}
