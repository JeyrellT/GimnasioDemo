"use server";

// =============================================================================
// BLACKLINE FITNESS — Server Actions: Exercise Library
// Owner: backend-api.
//
// All functions are "use server" boundaries. Every async operation is wrapped
// in tryCatch() so callers always receive Result<T, AppError> — never raw throws.
//
// Auth model:
//   - Searching/viewing: any authenticated user (trainer or client).
//   - Creating/editing/deleting: trainers only; ownership enforced on write.
//
// Soft-delete convention: all queries filter `deletedAt: null` unless the
// function's purpose is to list deleted items (not applicable here).
// =============================================================================

import { prisma } from "@/server/db";
import { requireUser, requireTrainer } from "@/server/guards";
import { tryCatch } from "@/lib/result";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/lib/errors";
import { logInfo } from "@/lib/logger";
import { deriveVideoThumbnail } from "@/lib/media/video-url";
import type { ActionResult, ExerciseSearchResult } from "@/types/api";
import type { Exercise, MuscleGroup, ExerciseEquipment, ExerciseDifficulty, ExerciseCategory } from "@prisma/client";
import { Prisma } from "@prisma/client";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Convert a Spanish display name into a URL-safe slug. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Map a full Exercise row to the lean ExerciseSearchResult shape. */
function toSearchResult(ex: Exercise): ExerciseSearchResult {
  return {
    id: ex.id,
    slug: ex.slug,
    nameEs: ex.nameEs,
    nameEn: ex.nameEn ?? null,
    primaryMuscle: ex.primaryMuscle,
    equipment: ex.equipment,
    difficulty: ex.difficulty,
    category: ex.category ?? "STRENGTH",
    gifUrl: ex.gifUrl,
    thumbnailUrl: ex.thumbnailUrl,
  };
}

/** Ensure a muscle filter value is a valid MuscleGroup enum member. */
function parseMuscle(value: string | undefined): MuscleGroup | undefined {
  const valid: MuscleGroup[] = [
    "CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS", "FOREARMS",
    "ABS", "OBLIQUES", "GLUTES", "QUADS", "HAMSTRINGS", "CALVES",
    "NECK", "FULL_BODY",
  ];
  return valid.includes(value as MuscleGroup)
    ? (value as MuscleGroup)
    : undefined;
}

/** Ensure a equipment filter value is a valid ExerciseEquipment enum member. */
function parseEquipment(value: string | undefined): ExerciseEquipment | undefined {
  const valid: ExerciseEquipment[] = [
    "BODYWEIGHT", "BARBELL", "DUMBBELL", "KETTLEBELL",
    "MACHINE", "CABLE", "BAND", "OTHER",
  ];
  return valid.includes(value as ExerciseEquipment)
    ? (value as ExerciseEquipment)
    : undefined;
}

/** Ensure a difficulty filter value is a valid ExerciseDifficulty enum member. */
function parseDifficulty(value: string | undefined): ExerciseDifficulty | undefined {
  const valid: ExerciseDifficulty[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
  return valid.includes(value as ExerciseDifficulty)
    ? (value as ExerciseDifficulty)
    : undefined;
}

/** Ensure a category filter value is a valid ExerciseCategory enum member. */
function parseCategory(value: string | undefined): ExerciseCategory | undefined {
  const valid: ExerciseCategory[] = ["STRENGTH", "WARMUP"];
  return valid.includes(value as ExerciseCategory)
    ? (value as ExerciseCategory)
    : undefined;
}

/** Validate the owner filter value. */
function parseOwner(value: string | undefined): "mine" | "public" | undefined {
  if (value === "mine" || value === "public") return value;
  return undefined;
}

// -----------------------------------------------------------------------------
// searchExercises
// -----------------------------------------------------------------------------

export interface SearchExercisesInput {
  query?: string;
  primaryMuscle?: string;
  equipment?: string;
  difficulty?: string;
  category?: string;
  muscle?: string;
  owner?: "mine" | "public";
  page?: number;
  limit?: number;
}

/**
 * Full-text or filter-based exercise search.
 *
 * Accepts either a plain string query or a SearchExercisesInput object.
 *
 * When `query` is provided, uses PostgreSQL tsvector full-text search against
 * the `searchVector` column (maintained by DB trigger, language: spanish).
 * When no query, falls back to standard filter with Prisma findMany.
 *
 * Visibility: isPublic=true OR createdById=currentUser.
 */
export async function searchExercises(
  queryOrInput?: string | SearchExercisesInput,
  filters?: {
    muscle?: string;
    equipment?: string;
    difficulty?: string;
    category?: string;
    owner?: "mine" | "public";
  },
  page = 1,
  limit = 20,
): Promise<ActionResult<{ exercises: ExerciseSearchResult[]; total: number }>> {
  // Normalize: if first arg is an object, extract fields
  if (queryOrInput !== undefined && typeof queryOrInput === "object") {
    const inp = queryOrInput;
    return searchExercises(
      inp.query ?? "",
      { muscle: inp.primaryMuscle ?? inp.muscle, equipment: inp.equipment, difficulty: inp.difficulty, category: inp.category, owner: inp.owner },
      inp.page ?? 1,
      inp.limit ?? 20,
    );
  }
  const query = (queryOrInput ?? "") as string;
  return tryCatch(async () => {
    const user = await requireUser();

    const offset = (Math.max(1, page) - 1) * limit;
    const muscle = parseMuscle(filters?.muscle);
    const equipment = parseEquipment(filters?.equipment);
    const difficulty = parseDifficulty(filters?.difficulty);
    const category = parseCategory(filters?.category);
    const owner = parseOwner(filters?.owner);

    if (query.trim().length > 0) {
      // Sanitize query: replace non-alphanumeric/space with space, join tokens
      // with & for AND semantics in tsquery.
      const sanitized = query
        .trim()
        .replace(/[^a-záéíóúüñ\s]/gi, " ")
        .split(/\s+/)
        .filter(Boolean)
        .join(" & ");

      // Raw query: tsvector FTS with optional enum filters.
      // We build a parameterized query to avoid SQL injection.
      // Visibility: public OR owned by current user.
      type RawRow = {
        id: string;
        slug: string;
        nameEs: string;
        nameEn: string | null;
        primaryMuscle: MuscleGroup;
        equipment: ExerciseEquipment;
        difficulty: ExerciseDifficulty;
        category: ExerciseCategory;
        gifUrl: string | null;
        thumbnailUrl: string | null;
        count: bigint;
      };

      // Build dynamic WHERE clauses for optional enum filters.
      // Prisma.$queryRaw uses tagged template literals for safe parameterization.
      // We use a two-query approach: one for rows, one for total count.
      const muscleSql = muscle
        ? Prisma.sql`AND e."primaryMuscle" = ${muscle}::"MuscleGroup"`
        : Prisma.empty;
      const equipmentSql = equipment
        ? Prisma.sql`AND e."equipment" = ${equipment}::"ExerciseEquipment"`
        : Prisma.empty;
      const difficultySql = difficulty
        ? Prisma.sql`AND e."difficulty" = ${difficulty}::"ExerciseDifficulty"`
        : Prisma.empty;
      const categorySql = category
        ? Prisma.sql`AND e."category" = ${category}::"ExerciseCategory"`
        : Prisma.empty;
      const ownerSql = owner === "mine"
        ? Prisma.sql`AND e."createdById" = ${user.id}`
        : owner === "public"
          ? Prisma.sql`AND e."isPublic" = true`
          : Prisma.sql`AND (e."isPublic" = true OR e."createdById" = ${user.id})`;

      const rows = await prisma.$queryRaw<RawRow[]>`
        SELECT
          e.id,
          e.slug,
          e."nameEs",
          e."nameEn",
          e."primaryMuscle",
          e.equipment,
          e.difficulty,
          e.category,
          e."gifUrl",
          e."thumbnailUrl",
          COUNT(*) OVER () AS count
        FROM "Exercise" e
        WHERE e."deletedAt" IS NULL
          ${ownerSql}
          AND e."searchVector" @@ to_tsquery('spanish', ${sanitized})
          ${muscleSql}
          ${equipmentSql}
          ${difficultySql}
          ${categorySql}
        ORDER BY ts_rank(e."searchVector", to_tsquery('spanish', ${sanitized})) DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const total = rows.length > 0 ? Number(rows[0]!.count) : 0;

      const overrides = await fetchTrainerMediaOverrides(
        user.id,
        rows.map((r) => r.id),
      );

      logInfo("exercises.searchExercises.fts", {
        userId: user.id,
        query,
        total,
        page,
      });

      return {
        exercises: rows.map((r) => {
          const o = overrides.get(r.id);
          return {
            id: r.id,
            slug: r.slug,
            nameEs: r.nameEs,
            nameEn: r.nameEn ?? null,
            primaryMuscle: r.primaryMuscle,
            equipment: r.equipment,
            difficulty: r.difficulty,
            category: r.category ?? "STRENGTH",
            gifUrl: r.gifUrl,
            thumbnailUrl: o?.thumbnailUrl ?? r.thumbnailUrl,
          };
        }),
        total,
      };
    }

    // No query: use Prisma findMany with filters
    const visibilityFilter: Prisma.ExerciseWhereInput =
      owner === "mine"
        ? { createdById: user.id }
        : owner === "public"
          ? { isPublic: true }
          : { OR: [{ isPublic: true }, { createdById: user.id }] };

    const where: Prisma.ExerciseWhereInput = {
      deletedAt: null,
      ...visibilityFilter,
      ...(muscle && { primaryMuscle: muscle }),
      ...(equipment && { equipment }),
      ...(difficulty && { difficulty }),
      ...(category && { category }),
    };

    const [exercises, total] = await Promise.all([
      prisma.exercise.findMany({
        where,
        select: {
          id: true,
          slug: true,
          nameEs: true,
          nameEn: true,
          primaryMuscle: true,
          equipment: true,
          difficulty: true,
          category: true,
          gifUrl: true,
          thumbnailUrl: true,
        },
        orderBy: [{ nameEs: "asc" }],
        skip: offset,
        take: limit,
      }),
      prisma.exercise.count({ where }),
    ]);

    const overrides = await fetchTrainerMediaOverrides(
      user.id,
      exercises.map((e) => e.id),
    );
    const overlaid = exercises.map((e) => {
      const o = overrides.get(e.id);
      if (!o?.thumbnailUrl) return e;
      return { ...e, thumbnailUrl: o.thumbnailUrl };
    });

    logInfo("exercises.searchExercises.filter", {
      userId: user.id,
      filters,
      total,
      page,
    });

    return { exercises: overlaid, total };
  });
}

// -----------------------------------------------------------------------------
// Trainer media override helpers
//
// `TrainerExerciseMedia` lets a coach attach a personal Drive/YouTube/Vimeo
// link to ANY exercise (including public seed entries) without mutating the
// shared catalog row. These helpers fetch the overrides for the current
// trainer in batch so callers can overlay them on lists/details cheaply.
// -----------------------------------------------------------------------------

interface TrainerMediaOverlay {
  mediaUrl: string | null;
  thumbnailUrl: string | null;
}

/**
 * Look up the trainer's overrides for a set of exercise IDs and return a map
 * `exerciseId → { mediaUrl, thumbnailUrl(derived) }`. Skips work if the caller
 * is not a trainer or the set is empty.
 */
async function fetchTrainerMediaOverrides(
  trainerUserId: string,
  exerciseIds: Iterable<string>,
): Promise<Map<string, TrainerMediaOverlay>> {
  const ids = [...new Set([...exerciseIds])];
  if (ids.length === 0) return new Map();

  const rows = await prisma.trainerExerciseMedia.findMany({
    where: { trainerUserId, exerciseId: { in: ids }, deletedAt: null },
    select: { exerciseId: true, mediaUrl: true },
  });

  return new Map(
    rows.map((r) => [
      r.exerciseId,
      {
        mediaUrl: r.mediaUrl,
        thumbnailUrl: deriveVideoThumbnail(r.mediaUrl),
      },
    ]),
  );
}

// -----------------------------------------------------------------------------
// getExercise
// -----------------------------------------------------------------------------

/**
 * Load a single exercise by ID.
 * Returns the full Exercise row including instructions.
 * Enforces visibility: public OR owned by current user.
 */
export async function getExercise(id: string | { id: string }): Promise<ActionResult<Exercise>> {
  if (typeof id === "object") return getExercise(id.id);
  return tryCatch(async () => {
    const user = await requireUser();

    const exercise = await prisma.exercise.findUnique({
      where: { id, deletedAt: null },
    });

    if (!exercise) {
      throw new NotFoundError("EXERCISE_NOT_FOUND", "Ejercicio no encontrado.");
    }

    if (!exercise.isPublic && exercise.createdById !== user.id) {
      throw new ForbiddenError(
        "EXERCISE_ACCESS_DENIED",
        "No tenés acceso a este ejercicio.",
      );
    }

    // Apply the calling trainer's media override (if any) on top of the
    // catalog row. For clients/admins the override map is empty and the
    // exercise is returned untouched.
    const overrides = await fetchTrainerMediaOverrides(user.id, [exercise.id]);
    const override = overrides.get(exercise.id);
    if (!override) return exercise;
    return {
      ...exercise,
      mediaUrl: override.mediaUrl ?? exercise.mediaUrl,
      thumbnailUrl: override.thumbnailUrl ?? exercise.thumbnailUrl,
    };
  });
}

// -----------------------------------------------------------------------------
// setExerciseTrainerMedia — write a video link for this trainer / exercise pair
// -----------------------------------------------------------------------------

export interface SetExerciseTrainerMediaInput {
  exerciseId: string;
  mediaUrl: string | null;
}

/**
 * Set or clear the video URL for an exercise from the current trainer's
 * perspective. Smart routing:
 *
 *  - If the trainer owns a PRIVATE exercise, we write to `Exercise.mediaUrl`
 *    directly (their personal catalog row).
 *  - Otherwise (public seed entry or someone else's exercise), we upsert a
 *    row in `TrainerExerciseMedia` so the change stays scoped to this trainer.
 *
 * Passing `mediaUrl = null` (or empty string) clears the override / catalog
 * value.
 */
export async function setExerciseTrainerMedia(
  input: SetExerciseTrainerMediaInput,
): Promise<ActionResult<{ ok: true; mediaUrl: string | null }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();
    const normalized =
      !input.mediaUrl || input.mediaUrl.trim() === "" ? null : input.mediaUrl.trim();

    if (normalized !== null) {
      // Light URL sanity check — full embed support is decided at render time.
      try {
        // throws on invalid URL
        new URL(normalized);
      } catch {
        throw new ValidationError("INVALID_URL", "El link de video no es una URL válida.");
      }
    }

    const exercise = await prisma.exercise.findUnique({
      where: { id: input.exerciseId, deletedAt: null },
      select: { id: true, isPublic: true, createdById: true },
    });
    if (!exercise) {
      throw new NotFoundError("EXERCISE_NOT_FOUND", "Ejercicio no encontrado.");
    }

    const ownsPrivate =
      !exercise.isPublic && exercise.createdById === user.id;

    if (ownsPrivate) {
      await prisma.exercise.update({
        where: { id: exercise.id },
        data: { mediaUrl: normalized },
      });
    } else if (normalized === null) {
      await prisma.trainerExerciseMedia.deleteMany({
        where: { trainerUserId: user.id, exerciseId: exercise.id },
      });
    } else {
      await prisma.trainerExerciseMedia.upsert({
        where: {
          trainerUserId_exerciseId: {
            trainerUserId: user.id,
            exerciseId: exercise.id,
          },
        },
        create: {
          trainerUserId: user.id,
          exerciseId: exercise.id,
          mediaUrl: normalized,
        },
        update: { mediaUrl: normalized, deletedAt: null },
      });
    }

    logInfo("exercises.setExerciseTrainerMedia", {
      userId: user.id,
      exerciseId: exercise.id,
      cleared: normalized === null,
      ownsPrivate,
    });

    return { ok: true as const, mediaUrl: normalized };
  });
}

// -----------------------------------------------------------------------------
// createExercise
// -----------------------------------------------------------------------------

export interface CreateExerciseInput {
  nameEs: string;
  nameEn?: string;
  instructionsEs?: string;
  instructionsEn?: string;
  primaryMuscle: string;
  secondaryMuscles?: string | string[];
  equipment: string;
  difficulty: string;
  category?: string;
  mediaUrl?: string;
  gifUrl?: string;
  thumbnailUrl?: string;
}

/**
 * Create a private exercise owned by the current trainer.
 *
 * The slug is generated from `nameEs`; on collision, appends a timestamp
 * suffix to guarantee uniqueness.
 */
export async function createExercise(
  input: CreateExerciseInput | FormData,
): Promise<ActionResult<{ exerciseId: string }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const formData = input instanceof FormData ? input : null;
    const typed = formData === null ? (input as CreateExerciseInput) : null;

    const nameEs = typed ? typed.nameEs.trim() : formData!.get("nameEs")?.toString().trim();
    const nameEn = typed ? (typed.nameEn?.trim() ?? "") : (formData!.get("nameEn")?.toString().trim() ?? "");
    const instructionsEs = typed ? (typed.instructionsEs?.trim() ?? "") : (formData!.get("instructionsEs")?.toString().trim() ?? "");
    const instructionsEn = typed ? typed.instructionsEn?.trim() : formData!.get("instructionsEn")?.toString().trim() ?? undefined;
    const primaryMuscleRaw = typed ? typed.primaryMuscle : formData!.get("primaryMuscle")?.toString();
    const secondaryMusclesRaw = typed
      ? (Array.isArray(typed.secondaryMuscles) ? typed.secondaryMuscles.join(",") : (typed.secondaryMuscles ?? ""))
      : formData!.get("secondaryMuscles")?.toString();
    const equipmentRaw = typed ? typed.equipment : formData!.get("equipment")?.toString();
    const difficultyRaw = typed ? typed.difficulty : formData!.get("difficulty")?.toString();
    const categoryRaw = typed ? typed.category : formData!.get("category")?.toString();
    const mediaUrl = typed ? (typed.mediaUrl ?? undefined) : (formData!.get("mediaUrl")?.toString() ?? undefined);
    const gifUrl = typed ? (typed.gifUrl ?? undefined) : (formData!.get("gifUrl")?.toString() ?? undefined);
    const thumbnailUrl = typed ? (typed.thumbnailUrl ?? undefined) : (formData!.get("thumbnailUrl")?.toString() ?? undefined);

    if (!nameEs) {
      throw new ValidationError("NAME_REQUIRED", "El nombre en español es obligatorio.");
    }

    const primaryMuscle = parseMuscle(primaryMuscleRaw);
    if (!primaryMuscle) {
      throw new ValidationError("INVALID_MUSCLE", "Grupo muscular primario inválido.");
    }

    const equipment = parseEquipment(equipmentRaw);
    if (!equipment) {
      throw new ValidationError("INVALID_EQUIPMENT", "Equipamiento inválido.");
    }

    const difficulty = parseDifficulty(difficultyRaw);
    if (!difficulty) {
      throw new ValidationError("INVALID_DIFFICULTY", "Dificultad inválida.");
    }

    const secondaryMuscles: MuscleGroup[] = secondaryMusclesRaw
      ? (secondaryMusclesRaw
          .split(",")
          .map((m) => parseMuscle(m.trim()))
          .filter((m): m is MuscleGroup => m !== undefined))
      : [];

    // Build slug; if taken, append timestamp for uniqueness
    let slug = slugify(nameEs);
    const existing = await prisma.exercise.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const exerciseCategory = parseCategory(categoryRaw) ?? "STRENGTH";

    const exercise = await prisma.exercise.create({
      data: {
        slug,
        nameEs,
        nameEn,
        instructionsEs,
        instructionsEn,
        primaryMuscle,
        secondaryMuscles,
        equipment,
        difficulty,
        category: exerciseCategory,
        mediaUrl,
        gifUrl,
        thumbnailUrl,
        isPublic: false,
        createdById: user.id,
      },
      select: { id: true },
    });

    logInfo("exercises.createExercise", {
      userId: user.id,
      exerciseId: exercise.id,
      slug,
    });

    return { exerciseId: exercise.id };
  });
}

// -----------------------------------------------------------------------------
// updateExercise
// -----------------------------------------------------------------------------

export interface UpdateExerciseInput {
  id: string;
  nameEs?: string;
  nameEn?: string;
  instructionsEs?: string;
  instructionsEn?: string;
  primaryMuscle?: string;
  secondaryMuscles?: string | string[];
  equipment?: string;
  difficulty?: string;
  category?: string;
  mediaUrl?: string | null;
  gifUrl?: string | null;
  thumbnailUrl?: string | null;
}

/**
 * Update a private exercise. Only the creator can edit.
 * Public (seeded) exercises are read-only.
 */
export async function updateExercise(
  idOrInput: string | UpdateExerciseInput,
  formData?: FormData,
): Promise<ActionResult<{ updated: true; exerciseId?: string }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    // Normalize: if first arg is an object, extract id and fields
    const id = typeof idOrInput === "object" ? idOrInput.id : idOrInput;
    const typed = typeof idOrInput === "object" ? idOrInput : null;
    const fd = formData ?? null;

    const exercise = await prisma.exercise.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, isPublic: true, createdById: true },
    });

    if (!exercise) {
      throw new NotFoundError("EXERCISE_NOT_FOUND", "Ejercicio no encontrado.");
    }
    if (exercise.isPublic) {
      throw new ForbiddenError(
        "EXERCISE_PUBLIC_READONLY",
        "Los ejercicios públicos no se pueden editar.",
      );
    }
    if (exercise.createdById !== user.id) {
      throw new ForbiddenError(
        "EXERCISE_NOT_OWNED",
        "Este ejercicio no te pertenece.",
      );
    }

    const patch: Prisma.ExerciseUpdateInput = {};

    const nameEs = typed ? typed.nameEs?.trim() : fd?.get("nameEs")?.toString().trim();
    if (nameEs) patch.nameEs = nameEs;

    const nameEn = typed ? typed.nameEn?.trim() : fd?.get("nameEn")?.toString().trim();
    if (nameEn !== undefined) patch.nameEn = nameEn;

    const instructionsEs = typed ? typed.instructionsEs?.trim() : fd?.get("instructionsEs")?.toString().trim();
    if (instructionsEs !== undefined) patch.instructionsEs = instructionsEs;

    const instructionsEn = typed ? typed.instructionsEn?.trim() : fd?.get("instructionsEn")?.toString().trim();
    if (instructionsEn !== undefined) patch.instructionsEn = instructionsEn;

    const primaryMuscleRaw = typed ? typed.primaryMuscle : fd?.get("primaryMuscle")?.toString();
    const primaryMuscle = parseMuscle(primaryMuscleRaw);
    if (primaryMuscle) patch.primaryMuscle = primaryMuscle;

    const secondaryMusclesRaw = typed
      ? (Array.isArray(typed.secondaryMuscles) ? typed.secondaryMuscles.join(",") : typed.secondaryMuscles)
      : fd?.get("secondaryMuscles")?.toString();
    if (secondaryMusclesRaw !== null && secondaryMusclesRaw !== undefined) {
      patch.secondaryMuscles = secondaryMusclesRaw
        .split(",")
        .map((m) => parseMuscle(m.trim()))
        .filter((m): m is MuscleGroup => m !== undefined);
    }

    const equipmentRaw = typed ? typed.equipment : fd?.get("equipment")?.toString();
    const equipment = parseEquipment(equipmentRaw);
    if (equipment) patch.equipment = equipment;

    const difficultyRaw = typed ? typed.difficulty : fd?.get("difficulty")?.toString();
    const difficulty = parseDifficulty(difficultyRaw);
    if (difficulty) patch.difficulty = difficulty;

    const categoryRaw = typed ? typed.category : fd?.get("category")?.toString();
    const cat = parseCategory(categoryRaw);
    if (cat) patch.category = cat;

    const mediaUrl = typed ? typed.mediaUrl : fd?.get("mediaUrl")?.toString();
    // undefined  → omit (don't touch DB column)
    // null / ""  → explicit clear, set to NULL
    // non-empty  → set to that value
    if (mediaUrl !== undefined) patch.mediaUrl = (mediaUrl === "" || mediaUrl === null) ? null : mediaUrl;

    const gifUrl = typed ? typed.gifUrl : fd?.get("gifUrl")?.toString();
    if (gifUrl !== undefined) patch.gifUrl = (gifUrl === "" || gifUrl === null) ? null : gifUrl;

    const thumbnailUrl = typed ? typed.thumbnailUrl : fd?.get("thumbnailUrl")?.toString();
    if (thumbnailUrl !== undefined) patch.thumbnailUrl = (thumbnailUrl === "" || thumbnailUrl === null) ? null : thumbnailUrl;

    await prisma.exercise.update({ where: { id }, data: patch });

    logInfo("exercises.updateExercise", { userId: user.id, exerciseId: id });

    return { updated: true as const, exerciseId: id };
  });
}

// -----------------------------------------------------------------------------
// updateExerciseInstructions — any trainer can edit instructions on any exercise
// -----------------------------------------------------------------------------

export async function updateExerciseInstructions(
  input: { id: string; instructionsEs: string },
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const exercise = await prisma.exercise.findUnique({
      where: { id: input.id, deletedAt: null },
      select: { id: true },
    });

    if (!exercise) {
      throw new NotFoundError("EXERCISE_NOT_FOUND", "Ejercicio no encontrado.");
    }

    await prisma.exercise.update({
      where: { id: input.id },
      data: { instructionsEs: input.instructionsEs.trim() },
    });

    logInfo("exercises.updateExerciseInstructions", {
      userId: user.id,
      exerciseId: input.id,
    });

    return { updated: true as const };
  });
}

// -----------------------------------------------------------------------------
// deleteExercise
// -----------------------------------------------------------------------------

/**
 * Soft-delete a private exercise. Only the creator can delete.
 * Public exercises are protected.
 */
export async function deleteExercise(
  id: string,
): Promise<ActionResult<{ deleted: true }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const exercise = await prisma.exercise.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, isPublic: true, createdById: true },
    });

    if (!exercise) {
      throw new NotFoundError("EXERCISE_NOT_FOUND", "Ejercicio no encontrado.");
    }
    if (exercise.isPublic) {
      throw new ForbiddenError(
        "EXERCISE_PUBLIC_READONLY",
        "Los ejercicios públicos no se pueden eliminar.",
      );
    }
    if (exercise.createdById !== user.id) {
      throw new ForbiddenError(
        "EXERCISE_NOT_OWNED",
        "Este ejercicio no te pertenece.",
      );
    }

    await prisma.exercise.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    logInfo("exercises.deleteExercise", { userId: user.id, exerciseId: id });

    return { deleted: true as const };
  });
}

// -----------------------------------------------------------------------------
// Bridges — accept plain objects from the frontend and convert to FormData
// internally. This matches how react-hook-form sends data.
// -----------------------------------------------------------------------------

/**
 * getExerciseDetail — accepts string ID or `{ id }` object (demo compat).
 */
export async function getExerciseDetail(
  idOrObj: string | { id?: string },
): Promise<ActionResult<Exercise>> {
  const id = typeof idOrObj === "string" ? idOrObj : idOrObj.id;
  if (!id) {
    return { ok: false, error: { code: "EXERCISE_INPUT", message: "ID requerido." } } as ActionResult<Exercise>;
  }
  return getExercise(id);
}

/**
 * createPrivateExercise — accepts a plain object from exercise-form.
 * Builds FormData internally and delegates to createExercise.
 */
export async function createPrivateExercise(
  input: {
    nameEs: string;
    nameEn?: string;
    instructionsEs: string;
    primaryMuscle: string;
    secondaryMuscles?: string[];
    equipment: string;
    difficulty: string;
    category?: string;
    thumbnailUrl?: string;
    gifUrl?: string;
    mediaUrl?: string;
  },
): Promise<ActionResult<{ exerciseId: string }>> {
  const fd = new FormData();
  fd.set("nameEs", input.nameEs);
  if (input.nameEn) fd.set("nameEn", input.nameEn);
  fd.set("instructionsEs", input.instructionsEs);
  fd.set("primaryMuscle", input.primaryMuscle);
  if (input.secondaryMuscles?.length) {
    fd.set("secondaryMuscles", input.secondaryMuscles.join(","));
  }
  fd.set("equipment", input.equipment);
  fd.set("difficulty", input.difficulty);
  if (input.category) fd.set("category", input.category);
  if (input.thumbnailUrl) fd.set("thumbnailUrl", input.thumbnailUrl);
  if (input.gifUrl) fd.set("gifUrl", input.gifUrl);
  if (input.mediaUrl) fd.set("mediaUrl", input.mediaUrl);
  return createExercise(fd);
}

/**
 * updateExerciseFromForm — accepts `{ id, ...patch }` from exercise-form.
 * Builds FormData and delegates to updateExercise.
 * Returns `{ exerciseId }` for navigation redirect.
 */
export async function updateExerciseFromForm(
  input: {
    id: string;
    nameEs?: string;
    nameEn?: string;
    instructionsEs?: string;
    primaryMuscle?: string;
    secondaryMuscles?: string[];
    equipment?: string;
    difficulty?: string;
    category?: string;
    thumbnailUrl?: string;
    gifUrl?: string;
    mediaUrl?: string;
  },
): Promise<ActionResult<{ exerciseId: string }>> {
  const fd = new FormData();
  if (input.nameEs) fd.set("nameEs", input.nameEs);
  if (input.nameEn !== undefined) fd.set("nameEn", input.nameEn);
  if (input.instructionsEs !== undefined) fd.set("instructionsEs", input.instructionsEs);
  if (input.primaryMuscle) fd.set("primaryMuscle", input.primaryMuscle);
  if (input.secondaryMuscles) fd.set("secondaryMuscles", input.secondaryMuscles.join(","));
  if (input.equipment) fd.set("equipment", input.equipment);
  if (input.difficulty) fd.set("difficulty", input.difficulty);
  if (input.category) fd.set("category", input.category);
  if (input.thumbnailUrl !== undefined) fd.set("thumbnailUrl", input.thumbnailUrl);
  if (input.gifUrl !== undefined) fd.set("gifUrl", input.gifUrl);
  if (input.mediaUrl !== undefined) fd.set("mediaUrl", input.mediaUrl);

  const result = await updateExercise(input.id, fd);
  if (!result.ok) return result as unknown as ActionResult<{ exerciseId: string }>;
  return { ok: true, value: { exerciseId: input.id } };
}
