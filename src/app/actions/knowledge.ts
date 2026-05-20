// PRODUCTION — re-exports from real server actions (Prisma / PostgreSQL).
export {
  searchKnowledge,
  listKnowledgeSections,
} from "@/server/actions/knowledge.actions";

export type {
  KnowledgeSearchHit,
  SearchKnowledgeInput,
} from "@/server/actions/knowledge.actions";
