"use server";

import { err } from "@/lib/result";
import { ValidationError } from "@/lib/errors";
import type { ActionResult } from "@/types/api";

export async function uploadExerciseThumbnail(
  _formData: FormData,
): Promise<ActionResult<{ url: string; key: string }>> {
  return err(new ValidationError("NOT_IMPLEMENTED", "Carga de imagenes aun no esta disponible."));
}

export async function deleteExerciseThumbnail(
  _exerciseId: string,
): Promise<ActionResult<void>> {
  return err(new ValidationError("NOT_IMPLEMENTED", "Eliminacion de imagenes aun no esta disponible."));
}
