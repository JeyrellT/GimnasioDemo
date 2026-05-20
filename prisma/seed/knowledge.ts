// =============================================================================
// BLACKLINE FITNESS — KnowledgeChunk seeder (RAG corpus)
// Owner: ai-orchestrator + database-architect.
//
// Ingestión idempotente del corpus científico documentado en:
//   prisma/seed/data/knowledge/*.md
//
// Estrategia de chunking:
//   - Un chunk por encabezado H4 (`#### `) — granularidad ideal para RAG.
//   - Las secciones sin H4 (TL;DR, Key Findings, Recommendations, Caveats,
//     Referencias, Sección 8 "Fortaleza de evidencia") se emiten como un solo
//     chunk con el último H2 como section.
//   - Los headings H3 (`### `) actualizan el contexto de section.
//
// Idempotencia:
//   - El slug es estable: `<sourceDocument>__<sectionSlug>__<chunkSlug>`.
//   - upsert por slug: edita si existe, crea si no.
//   - Si el `version` del archivo cambia, todos los chunks se actualizan
//     (porque también los re-emite el parser con sus nuevos contenidos).
// =============================================================================

import { promises as fs } from "node:fs";
import { basename, join } from "node:path";

import type { PrismaClient } from "@prisma/client";

const KNOWLEDGE_DIR = join(__dirname, "data", "knowledge");

// Mapeo curado de palabras clave → tags. Cada chunk hereda todos los tags cuya
// keyword aparece en su title + content (case-insensitive). Mantener corto.
const TAG_KEYWORDS: Array<{ tag: string; keywords: RegExp }> = [
	{
		tag: "hipertrofia",
		keywords: /\bhipertrofia|muscle\s+mass|mTOR|tensión\s+mecánica\b/i,
	},
	{
		tag: "fuerza",
		keywords: /\bfuerza\s+m[áa]xima|1RM|powerlifting|strength\b/i,
	},
	{
		tag: "cardio",
		keywords: /\bcardio|VO2|VO₂|HIIT|zona\s+2|aer[oó]bic|HRV\b/i,
	},
	{
		tag: "movilidad",
		keywords: /\bmovilidad|estiramiento|flexibilidad|ROM|RAMP|CARs\b/i,
	},
	{
		tag: "recuperacion",
		keywords: /\bsue[ñn]o|recuperaci[óo]n|deload|sobreentrenamiento|DOMS\b/i,
	},
	{ tag: "nutricion", keywords: /\bprote[íi]na|leucina|d[éeè]ficit\b/i },
	{
		tag: "principiante",
		keywords: /\bprincipiante|0-6\s+meses|StrongLifts|Starting\s+Strength\b/i,
	},
	{
		tag: "intermedio",
		keywords: /\bintermedio|6-24\s+meses|upper\/lower|PPL\b/i,
	},
	{
		tag: "avanzado",
		keywords: /\bavanzado|>?\s*2\s*a[ñn]os|periodizaci[oó]n\s+en\s+bloques\b/i,
	},
	{
		tag: "periodizacion",
		keywords: /\bperiodizaci[oó]n|lineal|DUP|bloques|Matveyev|Issurin\b/i,
	},
	{ tag: "volumen", keywords: /\bvolumen|MEV|MAV|MRV|series\/sem\b/i },
	{
		tag: "biomecanica",
		keywords: /\bbiomec[áa]nica|planos|palancas|lesi[oó]n\b/i,
	},
	{
		tag: "anatomia",
		keywords:
			/\banatom[íi]a|grupos\s+musculares|cu[áa]driceps|gl[úu]teo|dorsal\b/i,
	},
	{
		tag: "evaluacion",
		keywords: /\bPAR-Q|FMS|Y-Balance|Beighton|assessment\b/i,
	},
	{
		tag: "coaching",
		keywords:
			/\bautodeterminaci[oó]n|entrevista\s+motivacional|COM-B|h[áa]bitos\b/i,
	},
	{
		tag: "atletas-cr",
		keywords:
			/\bClaudia\s+Poll|Andrea\s+Vargas|Noelia\s+Vargas|Hanna\s+Gabriels|Chicho\s+Quesada|Amalia\s+Ortu[ñn]o|Anthony\s+Orozco|Keylor\s+Navas\b/i,
	},
	{
		tag: "instituciones-cr",
		keywords:
			/\bICODER|CIEMHCAVI|EDUFI|CIMOHU|CIDISAD|FECOA|FECOFIDEA|WABBA\b/i,
	},
	{
		tag: "costa-rica",
		keywords: /\bCosta\s+Rica|UCR|UNA|costarricense|pura\s+vida|GAM\b/i,
	},
	{
		tag: "certificaciones",
		keywords: /\bNSCA|ACSM-CPT|NASM|ACE|ISSA|NCCA|certificaci[oó]n\b/i,
	},
	{
		tag: "tendencias-2026",
		keywords: /\bACSM\s+2026|wearable|HIIT.*cay[óo]|Hyrox|tendencias\b/i,
	},
	{
		tag: "evidencia",
		keywords: /\bmeta-an[áa]lisis|fortaleza\s+de\s+evidencia|IC\s+95%\b/i,
	},
	{
		tag: "taxonomia",
		keywords: /\btaxonom[íi]a|squat|hinge|push|pull|lunge|carry|patrones\b/i,
	},
];

// Marcadores explícitos de fortaleza de evidencia en el corpus actual.
const EVIDENCE_KEYWORDS: Array<{ strength: string; pattern: RegExp }> = [
	{ strength: "STRONG", pattern: /Muy fuerte|Fuerte(?!\s+en)/i },
	{ strength: "MODERATE", pattern: /Moderada(?!-fuerte)/i },
	{ strength: "EMERGING", pattern: /Emergente|preliminar/i },
	{
		strength: "CONTESTED",
		pattern: /D[ée]bil|contradice|cuestionado|debatida/i,
	},
];

// -----------------------------------------------------------------------------
// Slugify helper
// -----------------------------------------------------------------------------

function slugify(s: string): string {
	return s
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 80);
}

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

interface ParsedChunk {
	slug: string;
	section: string;
	title: string;
	content: string;
	tags: string[];
	evidenceStrength: string | null;
	wordCount: number;
}

/**
 * Parse a markdown file into chunks. Chunking rule:
 *  - When we hit a H4 (`#### `), close the current chunk and start a new one
 *    with the H4 as title and the most recent H3 (`### `) as section.
 *  - Top-level H2 (`## `) like "TL;DR", "Key Findings", "Recommendations",
 *    "Caveats", "Referencias" generate a single chunk each (no H4 inside).
 *  - Section 8 ("### 8. Fortaleza de la evidencia") has no H4 either —
 *    emitted as one chunk.
 */
function parseMarkdownToChunks(
	markdown: string,
	sourceDocument: string,
): ParsedChunk[] {
	const lines = markdown.split(/\r?\n/);

	let currentSection = ""; // last H3 we saw
	let currentH2 = ""; // last H2 we saw (used as section when there are no H3/H4 underneath)
	const chunks: ParsedChunk[] = [];

	let buf: string[] = [];
	let bufTitle = "";
	let bufSection = "";
	let bufIsExplicit = false;

	function flush() {
		const content = buf.join("\n").trim();
		if (!content || !bufTitle) {
			buf = [];
			return;
		}
		const slug = `${sourceDocument}__${slugify(bufSection || bufTitle)}__${slugify(bufTitle)}`;
		const titleAndContent = `${bufTitle}\n${content}`;
		const tags = inferTags(titleAndContent);
		const evidenceStrength = inferEvidenceStrength(content);
		const wordCount = content.split(/\s+/).filter(Boolean).length;
		chunks.push({
			slug,
			section: bufSection || bufTitle,
			title: bufTitle,
			content,
			tags,
			evidenceStrength,
			wordCount,
		});
		buf = [];
		bufIsExplicit = false;
	}

	for (const rawLine of lines) {
		const line = rawLine.replace(/\s+$/u, "");

		// H2 — flush + start a single-chunk block for top-level non-Detail sections
		const h2Match = line.match(/^##\s+(.+)$/);
		if (h2Match?.[1]) {
			flush();
			currentH2 = h2Match[1].trim();
			// For "Details" section we don't emit a chunk; only its H3/H4 children do.
			if (currentH2.toLowerCase() === "details") {
				continue;
			}
			// Start a single chunk for this H2.
			bufTitle = currentH2;
			bufSection = currentH2;
			bufIsExplicit = true;
			continue;
		}

		// H3 — update section context. Inside "Details", this is "1. Fundamentos…",
		// "2. Anatomía…", etc., and we DO NOT emit a chunk for it — its H4s do.
		// Outside "Details" (e.g. section 8 has no H4s under it), we emit a chunk.
		const h3Match = line.match(/^###\s+(.+)$/);
		if (h3Match?.[1]) {
			flush();
			currentSection = h3Match[1].trim();
			// Section 8 ("8. Fortaleza de la evidencia") has no H4s — emit as a chunk.
			if (
				/^\d+\.\s+/.test(currentSection) &&
				!/^[1-6]\./.test(currentSection)
			) {
				bufTitle = currentSection;
				bufSection = currentSection;
				bufIsExplicit = true;
			}
			continue;
		}

		// H4 — close previous, start new chunk
		const h4Match = line.match(/^####\s+(.+)$/);
		if (h4Match?.[1]) {
			flush();
			bufTitle = h4Match[1].trim();
			bufSection = currentSection || currentH2 || bufTitle;
			bufIsExplicit = true;
			continue;
		}

		// Horizontal rule — close any open implicit chunk
		if (/^---+$/.test(line)) {
			if (bufIsExplicit) {
				flush();
			}
			continue;
		}

		// Normal content line — append to current buffer if we have a title
		if (bufTitle) {
			buf.push(rawLine);
		}
	}
	flush();

	return chunks;
}

// -----------------------------------------------------------------------------
// Tag + evidence inference
// -----------------------------------------------------------------------------

function inferTags(text: string): string[] {
	const tags = new Set<string>();
	for (const { tag, keywords } of TAG_KEYWORDS) {
		if (keywords.test(text)) tags.add(tag);
	}
	return Array.from(tags);
}

function inferEvidenceStrength(text: string): string | null {
	// Only mark when language is unambiguous and the chunk is short enough
	// (long chunks may mention multiple strengths in different rows).
	for (const { strength, pattern } of EVIDENCE_KEYWORDS) {
		if (pattern.test(text)) return strength;
	}
	return null;
}

// -----------------------------------------------------------------------------
// Public entry point
// -----------------------------------------------------------------------------

export async function seedKnowledge(prisma: PrismaClient): Promise<{
	created: number;
	updated: number;
	skipped: number;
}> {
	console.log("[knowledge] Scanning prisma/seed/data/knowledge/...");

	let files: string[];
	try {
		const entries = await fs.readdir(KNOWLEDGE_DIR);
		files = entries.filter((f) => f.endsWith(".md"));
	} catch (e) {
		console.warn(
			`[knowledge] No directory found at ${KNOWLEDGE_DIR}, skipping.`,
		);
		return { created: 0, updated: 0, skipped: 0 };
	}

	let created = 0;
	let updated = 0;
	let skipped = 0;

	for (const filename of files) {
		const filepath = join(KNOWLEDGE_DIR, filename);
		const sourceDocument = basename(filename, ".md");
		const md = await fs.readFile(filepath, "utf-8");
		const chunks = parseMarkdownToChunks(md, sourceDocument);

		console.log(
			`[knowledge] ${sourceDocument}: ${chunks.length} chunks parsed`,
		);

		for (const chunk of chunks) {
			const existing = await prisma.knowledgeChunk.findUnique({
				where: { slug: chunk.slug },
				select: { id: true, content: true, version: true },
			});

			if (existing && existing.content === chunk.content) {
				skipped++;
				continue;
			}

			const data = {
				section: chunk.section,
				title: chunk.title,
				content: chunk.content,
				tags: chunk.tags,
				evidenceStrength: chunk.evidenceStrength,
				sourceDocument,
				wordCount: chunk.wordCount,
				locale: "es-CR",
				version: existing ? existing.version + 1 : 1,
			};

			if (existing) {
				await prisma.knowledgeChunk.update({
					where: { slug: chunk.slug },
					data,
				});
				updated++;
			} else {
				await prisma.knowledgeChunk.create({
					data: { slug: chunk.slug, ...data },
				});
				created++;
			}
		}
	}

	console.log(
		`[knowledge] Done. created=${created} updated=${updated} skipped=${skipped}`,
	);
	return { created, updated, skipped };
}
