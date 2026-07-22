import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(SCRIPT_DIR, "..");
const CONFIG_PATH = join(
  ROOT_DIR,
  "prisma",
  "seed",
  "data",
  "exercise-videos.json",
);
const OUTPUT_DIR = join(ROOT_DIR, "public", "exercise-videos");
const MANIFEST_PATH = join(OUTPUT_DIR, "manifest.json");
const DRIVE_ID_PATTERN = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_BYTES = 200 * 1024 * 1024;

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function loadSources() {
  const config = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
  const entries = [...Object.entries(config.strength), ...Object.entries(config.warmup)];

  return entries.flatMap(([slug, entry]) => {
    if (!entry?.videoUrl) return [];
    const driveId = DRIVE_ID_PATTERN.exec(entry.videoUrl)?.[1];
    if (!driveId) return [];
    if (!SLUG_PATTERN.test(slug)) {
      throw new Error(`Slug de video inválido: ${slug}`);
    }
    return [
      {
        slug,
        nameEs: entry.nameEs,
        sourceUrl: entry.videoUrl,
        driveId,
        fileName: `${slug}.mp4`,
      },
    ];
  });
}

async function fetchVideo(source, attempt = 1) {
  const url = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(source.driveId)}&export=download`;
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(60_000),
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.startsWith("video/")) {
      throw new Error(`HTTP ${response.status}, Content-Type ${contentType || "vacío"}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_BYTES) {
      throw new Error(`Tamaño inválido: ${buffer.length} bytes`);
    }
    if (buffer.subarray(4, 8).toString("ascii") !== "ftyp") {
      throw new Error("El archivo descargado no tiene cabecera MP4");
    }
    return buffer;
  } catch (error) {
    if (attempt >= 3) throw error;
    await new Promise((resolvePromise) =>
      setTimeout(resolvePromise, attempt * 1_000),
    );
    return fetchVideo(source, attempt + 1);
  }
}

async function sync() {
  const sources = await loadSources();
  await mkdir(OUTPUT_DIR, { recursive: true });
  const manifestEntries = new Array(sources.length);
  let cursor = 0;

  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (cursor < sources.length) {
        const index = cursor++;
        const source = sources[index];
        const buffer = await fetchVideo(source);
        const outputPath = join(OUTPUT_DIR, source.fileName);
        const tempPath = `${outputPath}.tmp`;
        await writeFile(tempPath, buffer);
        await rm(outputPath, { force: true });
        await rename(tempPath, outputPath);
        manifestEntries[index] = {
          slug: source.slug,
          nameEs: source.nameEs,
          file: `/exercise-videos/${source.fileName}`,
          sourceUrl: source.sourceUrl,
          bytes: buffer.length,
          sha256: sha256(buffer),
        };
        console.log(`ok ${source.slug} (${(buffer.length / 1024 / 1024).toFixed(2)} MiB)`);
      }
    }),
  );

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    files: manifestEntries,
  };
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`\n${manifestEntries.length} videos sincronizados en ${OUTPUT_DIR}`);
}

async function verify() {
  const sources = await loadSources();
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const bySlug = new Map(manifest.files.map((entry) => [entry.slug, entry]));
  const errors = [];

  for (const source of sources) {
    const entry = bySlug.get(source.slug);
    if (!entry) {
      errors.push(`${source.slug}: falta en manifest.json`);
      continue;
    }
    const expectedFile = `/exercise-videos/${source.fileName}`;
    if (entry.file !== expectedFile || entry.sourceUrl !== source.sourceUrl) {
      errors.push(`${source.slug}: el manifest no coincide con la configuración`);
      continue;
    }
    try {
      const buffer = await readFile(join(OUTPUT_DIR, basename(entry.file)));
      if (buffer.length !== entry.bytes || sha256(buffer) !== entry.sha256) {
        errors.push(`${source.slug}: tamaño o checksum incorrecto`);
      }
      if (buffer.subarray(4, 8).toString("ascii") !== "ftyp") {
        errors.push(`${source.slug}: cabecera MP4 inválida`);
      }
    } catch {
      errors.push(`${source.slug}: archivo local ausente`);
    }
  }

  const expectedFiles = new Set(sources.map((source) => source.fileName));
  const diskFiles = (await readdir(OUTPUT_DIR)).filter((file) => file.endsWith(".mp4"));
  for (const file of diskFiles) {
    if (!expectedFiles.has(file)) errors.push(`${file}: video local sin configuración`);
  }

  if (errors.length > 0) {
    throw new Error(`Verificación de videos falló:\n- ${errors.join("\n- ")}`);
  }
  const totalBytes = manifest.files.reduce((sum, entry) => sum + entry.bytes, 0);
  console.log(
    `${sources.length} videos verificados (${(totalBytes / 1024 / 1024).toFixed(2)} MiB).`,
  );
}

const command = process.argv[2] ?? "verify";
if (command === "sync") {
  await sync();
} else if (command === "verify") {
  await verify();
} else {
  throw new Error(`Comando desconocido: ${command}. Usá sync o verify.`);
}
