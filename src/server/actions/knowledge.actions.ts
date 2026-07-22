"use server";

// =============================================================================
// BLACKLINE FITNESS — Server Actions: Knowledge base (RAG)
// Owner: ai-orchestrator + database-architect.
//
// Provee búsqueda full-text sobre KnowledgeChunk para el asistente IA. Es la
// fuente de verdad cuando el coach pregunta por ciencia, evidencia, dosis-
// respuesta, referentes costarricenses, instituciones, certificaciones, etc.
//
// Auth model: cualquier usuario autenticado puede leer la base de conocimiento
// (es un corpus público compartido por todos los coaches de Blackline). Los
// datos del coach o de sus clientes NO viven aquí.
// =============================================================================

import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { tryCatch } from "@/lib/result";
import { logInfo } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import { Prisma } from "@prisma/client";

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export interface KnowledgeSearchHit {
  id: string;
  slug: string;
  section: string;
  title: string;
  /** Recorte del contenido — limitado para no inundar el contexto del modelo. */
  excerpt: string;
  tags: string[];
  evidenceStrength: string | null;
  sourceDocument: string;
  /** ts_rank score (0-1). Útil para que el modelo decida cuánto pesar el chunk. */
  rank: number;
}

export interface SearchKnowledgeInput {
  query: string;
  /** Si se pasa, filtra a chunks que tengan TODOS estos tags. */
  tags?: string[];
  /** Si se pasa, restringe a un sourceDocument específico. */
  sourceDocument?: string;
  /** Default: 5. Cap a 15 para proteger el context window del modelo. */
  limit?: number;
  /** Largo máximo del excerpt en caracteres. Default: 800. */
  excerptChars?: number;
}

// -----------------------------------------------------------------------------
// Sanitize query string for to_tsquery
// -----------------------------------------------------------------------------

/**
 * Convierte una query libre del coach o del modelo en una expresión tsquery
 * segura. Mismo enfoque que searchExercises:
 *   - Solo letras (incl. acentos), números y espacios.
 *   - Tokens unidos con `&` (AND semantics).
 *   - Cada token con prefix-match (`:*`) para tolerar conjugaciones.
 */
function sanitizeTsquery(query: string): string | null {
  const sanitized = query
    .trim()
    .replace(/[^a-z0-9áéíóúüñ\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map((t) => `${t}:*`)
    .join(" & ");
  return sanitized.length > 0 ? sanitized : null;
}

// -----------------------------------------------------------------------------
// searchKnowledge
// -----------------------------------------------------------------------------

/**
 * Búsqueda full-text sobre KnowledgeChunk con ranking por ts_rank.
 *
 * - Filtra opcionalmente por tags (intersección) y sourceDocument.
 * - El excerpt se recorta a `excerptChars` (default 800) preservando
 *   el inicio del chunk — los chunks ya son ~300-600 tokens, así que esto
 *   suele devolver el contenido completo.
 * - Si no hay query (`""` o solo símbolos), cae a un listado por tags.
 */
export async function searchKnowledge(
  input: SearchKnowledgeInput,
): Promise<ActionResult<{ hits: KnowledgeSearchHit[]; total: number }>> {
  return tryCatch(async () => {
    const user = await requireUser();

    const limit = Math.min(Math.max(input.limit ?? 5, 1), 15);
    const excerptChars = Math.min(Math.max(input.excerptChars ?? 800, 200), 2000);
    const tags = input.tags?.filter((t) => t.trim().length > 0) ?? [];
    const sourceDocument = input.sourceDocument?.trim() || null;

    const tsquery = sanitizeTsquery(input.query ?? "");

    type Row = {
      id: string;
      slug: string;
      section: string;
      title: string;
      content: string;
      tags: string[];
      evidenceStrength: string | null;
      sourceDocument: string;
      rank: number;
    };

    let rows: Row[];

    if (tsquery) {
      // FTS path with ranking.
      const tagFilterSql =
        tags.length > 0 ? Prisma.sql`AND "tags" @> ${tags}::text[]` : Prisma.empty;
      const sourceFilterSql = sourceDocument
        ? Prisma.sql`AND "sourceDocument" = ${sourceDocument}`
        : Prisma.empty;

      rows = await prisma.$queryRaw<Row[]>`
        SELECT
          id, slug, section, title, content, tags,
          "evidenceStrength", "sourceDocument",
          ts_rank("searchVector", to_tsquery('spanish', ${tsquery})) AS rank
        FROM "KnowledgeChunk"
        WHERE "searchVector" @@ to_tsquery('spanish', ${tsquery})
          ${tagFilterSql}
          ${sourceFilterSql}
        ORDER BY rank DESC
        LIMIT ${limit}
      `;
    } else if (tags.length > 0 || sourceDocument) {
      // Tag-only fallback: top N most recent matching chunks.
      rows = await prisma.knowledgeChunk.findMany({
        where: {
          ...(tags.length > 0 && { tags: { hasEvery: tags } }),
          ...(sourceDocument && { sourceDocument }),
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        select: {
          id: true,
          slug: true,
          section: true,
          title: true,
          content: true,
          tags: true,
          evidenceStrength: true,
          sourceDocument: true,
        },
      }).then((items) =>
        items.map((it) => ({ ...it, rank: 0 } as Row)),
      );
    } else {
      // Empty query and no filters — refuse rather than dump random chunks.
      return { hits: [], total: 0 };
    }

    const hits: KnowledgeSearchHit[] = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      section: r.section,
      title: r.title,
      excerpt: r.content.length > excerptChars
        ? `${r.content.slice(0, excerptChars).trimEnd()}…`
        : r.content,
      tags: r.tags,
      evidenceStrength: r.evidenceStrength,
      sourceDocument: r.sourceDocument,
      rank: r.rank,
    }));

    logInfo("knowledge.searchKnowledge", {
      userId: user.id,
      query: input.query.slice(0, 80),
      tags,
      total: hits.length,
    });

    return { hits, total: hits.length };
  });
}

// -----------------------------------------------------------------------------
// listKnowledgeSections — secciones disponibles, para debugging / catálogo
// -----------------------------------------------------------------------------

export async function listKnowledgeSections(): Promise<
  ActionResult<Array<{ section: string; chunkCount: number; tags: string[] }>>
> {
  return tryCatch(async () => {
    await requireUser();

    const grouped = await prisma.knowledgeChunk.groupBy({
      by: ["section"],
      _count: { _all: true },
      orderBy: { section: "asc" },
    });

    // Pull a small sample of tags per section so the catalog is browsable.
    const sections = await Promise.all(
      grouped.map(async (g) => {
        const sample = await prisma.knowledgeChunk.findMany({
          where: { section: g.section },
          select: { tags: true },
          take: 5,
        });
        const tagSet = new Set<string>();
        for (const s of sample) for (const t of s.tags) tagSet.add(t);
        return {
          section: g.section,
          chunkCount: g._count._all,
          tags: Array.from(tagSet).slice(0, 8),
        };
      }),
    );

    return sections;
  });
}
