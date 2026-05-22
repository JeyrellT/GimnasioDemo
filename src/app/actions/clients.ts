// PRODUCTION — re-exports from real server actions (Prisma / PostgreSQL)
export {
  listMyClients,
  getClientDetail,
  getClientProfileDetail,
  createInvitation,
  acceptInvitation,
  validateInvitationToken,
  updateClientPrice,
  updateTrainerNotes,
  updateTrainerClientNotes,
  pauseClient,
  resumeClient,
  endRelationship,
  getLpdpRequests,
  saveClientGoal,
  recordTrainerNoteUpdate,
  quickAddClient,
  completeFirstLogin,
  recordClientParq,
  needsParqPrompt,
} from "@/server/actions/clients.actions";

// updateTrainerProfile lives in auth.actions.ts (mutates User + TrainerProfile).
export { updateTrainerProfile } from "@/server/actions/auth.actions";
