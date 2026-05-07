// DEMO MODE — re-exports from src/lib/demo/actions/
// "use server" intentionally removed: these are client-side Dexie actions.
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
  updateTrainerProfile,
  recordTrainerNoteUpdate,
} from "@/lib/demo/actions/clients";
