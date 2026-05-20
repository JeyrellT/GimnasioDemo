"use server";

import {
  listMyMedicalConditions as _listMy,
  listClientMedicalConditions as _listClient,
  saveMyMedicalConditions as _saveMy,
  markMedicalPromptShown as _markShown,
  needsMedicalPrompt as _needsPrompt,
} from "@/server/actions/medical-conditions.actions";

import type { SaveMedicalConditionsInput } from "@/lib/validation/medical-conditions.schema";

export async function listMyMedicalConditions() {
  return _listMy();
}

export async function listClientMedicalConditions(clientUserId: string) {
  return _listClient(clientUserId);
}

export async function saveMyMedicalConditions(input: SaveMedicalConditionsInput) {
  return _saveMy(input);
}

export async function markMedicalPromptShown() {
  return _markShown();
}

export async function needsMedicalPrompt() {
  return _needsPrompt();
}
