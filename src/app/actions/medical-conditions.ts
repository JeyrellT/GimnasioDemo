"use server";

// PRODUCTION — re-exports from real server actions (Prisma / PostgreSQL)
export {
  listMyMedicalConditions,
  listClientMedicalConditions,
  saveMyMedicalConditions,
  markMedicalPromptShown,
  needsMedicalPrompt,
} from "@/server/actions/medical-conditions.actions";
