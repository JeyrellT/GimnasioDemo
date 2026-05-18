"use server";

// DEMO MODE — exercise media uploads are disabled in the static demo.

import { err } from "@/lib/result";
import { ValidationError } from "@/lib/errors";
import type { ActionResult } from "@/types/api";

export async function uploadExerciseThumbnail(
  _formData: FormData,
): Promise<ActionResult<{ url: string; key: string }>> {
  return err(new ValidationError("DEMO_MODE", "Carga de imágenes no disponible en modo demo."));
}

export async function deleteExerciseThumbnail(
  _exerciseId: string,
): Promise<ActionResult<void>> {
  return err(new ValidationError("DEMO_MODE", "Eliminación de imágenes no disponible en modo demo."));
}
