# Base de conocimiento del asistente (RAG)

Contenido científico que alimenta el tool `search_knowledge` del asistente Gemini.

## Cómo se usa

1. Cada `.md` aquí es un documento fuente independiente; el nombre del archivo (sin extensión) se vuelve `sourceDocument` en la DB.
2. `prisma/seed/knowledge.ts` parsea cada documento, lo trocea por encabezados H4 (y emite chunks de un solo bloque para los H2 que viven sueltos, como TL;DR, Caveats, Referencias), infiere `tags` y `evidenceStrength`, y hace upsert por `slug` (idempotente).
3. El asistente, vía `searchKnowledgeTool` en `src/lib/ai/agent/tool-registry.ts`, llama a la action `searchKnowledge` (full-text con `to_tsquery('spanish', ...)` + ranking `ts_rank`).

## Comandos en el repo principal

Aplicar la migración + correr el seed (asume `.env.local` con `DATABASE_URL` válido):

```bash
# 1. Aplicar la migración a Postgres
pnpm db:migrate

# 2. Regenerar el cliente Prisma (incluye KnowledgeChunk)
pnpm db:generate

# 3. Correr el seed (idempotente — re-ingesta cuando edites el .md)
pnpm seed
```

El seed reporta al final:

```
[seed] Knowledge chunks (RAG corpus)...
  ok  knowledge  37 created, 0 updated, 0 skipped
```

## Editar contenido

- Editar el `.md` directamente. El parser detecta cambios por contenido (diff por `slug`) y bumpea `version` en la DB.
- Si renombrás una sección (`#### `), el slug cambia y se crea un chunk nuevo — el viejo queda huérfano hasta que lo borres a mano (`prisma studio` → filtrá por `sourceDocument`).
- Si querés agregar tags nuevos: editá el mapa `TAG_KEYWORDS` en `prisma/seed/knowledge.ts` y volvé a correr `pnpm seed`.

## Tags actuales (inferidos por keyword)

`hipertrofia`, `fuerza`, `cardio`, `movilidad`, `recuperacion`, `nutricion`, `principiante`, `intermedio`, `avanzado`, `periodizacion`, `volumen`, `biomecanica`, `anatomia`, `evaluacion`, `coaching`, `atletas-cr`, `instituciones-cr`, `costa-rica`, `certificaciones`, `tendencias-2026`, `evidencia`, `taxonomia`.

## Por qué tsvector y no embeddings

- Reusa el patrón ya en producción (`Exercise.searchVector`) — sin nuevas dependencias ni infra.
- A escala de ~40 chunks por documento, ts_rank con tokenización en español + prefix-match es lo suficientemente bueno para preguntas factuales.
- Migrar a embeddings (pgvector) cuando: el corpus crezca >500 chunks, o aparezcan queries semánticas que tsvector no captura (sinonimia profunda, intent inference). La interfaz del tool no cambia.
