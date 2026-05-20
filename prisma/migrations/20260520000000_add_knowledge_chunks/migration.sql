-- =============================================================================
-- BLACKLINE FITNESS — KnowledgeChunk para RAG del asistente IA
-- Owner: database-architect.
--
-- Patrón: espejo del setup de Exercise.searchVector — tsvector mantenido por
-- trigger BEFORE INSERT/UPDATE, indexado con GIN para queries sub-segundo.
--
-- Pesos del tsvector:
--   A = title  (relevancia máxima — el coach suele buscar por nombre del tema)
--   B = tags   (sinónimos curados a mano)
--   C = content (cuerpo del chunk, peso menor)
-- =============================================================================

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidenceStrength" TEXT,
    "sourceDocument" TEXT NOT NULL DEFAULT 'fitness-base-cr-v1',
    "version" INTEGER NOT NULL DEFAULT 1,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "locale" TEXT NOT NULL DEFAULT 'es-CR',
    "searchVector" tsvector,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeChunk_slug_key" ON "KnowledgeChunk"("slug");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_sourceDocument_idx" ON "KnowledgeChunk"("sourceDocument");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_section_idx" ON "KnowledgeChunk"("section");

-- Trigger function — keeps searchVector synced with title + tags + content.
CREATE OR REPLACE FUNCTION knowledge_chunk_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('spanish', coalesce(NEW."title", '')),                           'A') ||
    setweight(to_tsvector('spanish', coalesce(array_to_string(NEW."tags", ' '), '')),      'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW."content", '')),                         'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_chunk_search_vector_update
  BEFORE INSERT OR UPDATE OF "title", "tags", "content"
  ON "KnowledgeChunk"
  FOR EACH ROW
  EXECUTE FUNCTION knowledge_chunk_search_vector_trigger();

-- GIN index — required for sub-second @@ tsquery lookups.
CREATE INDEX "KnowledgeChunk_searchVector_idx" ON "KnowledgeChunk" USING gin ("searchVector");

-- GIN index on tags array — permite hasSome / contains filtering rápido.
CREATE INDEX "KnowledgeChunk_tags_idx" ON "KnowledgeChunk" USING gin ("tags");
