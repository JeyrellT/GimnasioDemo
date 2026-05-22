// =============================================================================
// Valida DATABASE_URL del entorno sin imprimir secrets.
// Uso:
//   node --env-file=.env.local scripts/check-db-url.mjs
// =============================================================================

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("FAIL: DATABASE_URL no está seteada en el entorno.");
  console.error("      Asegurate de correr con `--env-file=.env.local` o exportar la var.");
  process.exit(1);
}

console.log(`DATABASE_URL length: ${url.length} chars`);
console.log(`Starts with        : ${JSON.stringify(url.slice(0, 13))}`);

// Detect schema
const schemaMatch = url.match(/^([a-z][a-z0-9+.-]*):\/\//i);
if (!schemaMatch) {
  console.error("\nFAIL: La URL no empieza con un schema válido (ej: postgresql://).");
  process.exit(2);
}
const schema = schemaMatch[1];
console.log(`Schema             : ${schema}`);

// ── Manual structural check (sin URL constructor) ─────────────────────────
const afterSchema = url.slice(schema.length + 3); // remueve "postgresql://"
console.log(`After schema length: ${afterSchema.length} chars`);

// Cuenta separadores
const atCount = (afterSchema.match(/@/g) || []).length;
console.log(`'@' count          : ${atCount}  (debe ser 1)`);

// Detecta caracteres sospechosos (invisibles, control, espacios)
const suspicious = [];
for (let i = 0; i < url.length; i++) {
  const code = url.charCodeAt(i);
  // Char válidos: 0x21..0x7E (printables ASCII) menos los que requieren encode
  if (code < 0x20 || code === 0x7f) {
    suspicious.push({ index: i, code: `0x${code.toString(16).padStart(2, "0")}`, name: "control char" });
  } else if (code === 0x20) {
    suspicious.push({ index: i, code: "0x20", name: "space" });
  } else if (code > 0x7e) {
    suspicious.push({ index: i, code: `0x${code.toString(16).padStart(4, "0")}`, name: "non-ASCII" });
  }
}
if (suspicious.length > 0) {
  console.error("\nFAIL: Caracteres invisibles / no-ASCII detectados:");
  for (const s of suspicious.slice(0, 10)) {
    console.error(`  - pos ${s.index}: ${s.name} (${s.code})`);
  }
  if (suspicious.length > 10) console.error(`  ... y ${suspicious.length - 10} más`);
  console.error("\n  Solución: re-tipear la URL a mano o copy/paste de nuevo.");
  process.exit(5);
}

// Estructura esperada: USER:PASS@HOST:PORT/DB[?...]
// Si hay >1 '@', es porque el password tiene '@' literal sin encodear.
if (atCount === 0) {
  console.error("\nFAIL: No hay '@' separando credenciales del host. URL incompleta.");
  process.exit(6);
}
if (atCount > 1) {
  console.error(`\nFAIL: La URL tiene ${atCount} signos '@'. Solo el último debería separar password de host.`);
  console.error("      Causa: tu password contiene '@' literal. Reemplazalo por '%40'.");
  console.error(`      Ejemplo: si tu password es "p@ss#1", debe ir como "p%40ss%231".`);
  process.exit(7);
}

// Solo 1 '@'. Verifiquemos el segmento "user:pass"
const lastAt = afterSchema.lastIndexOf("@");
const credsRaw = afterSchema.slice(0, lastAt);
const hostAndAfter = afterSchema.slice(lastAt + 1);

// En "user:pass": user no debería tener ':', pero pass puede. URL constructor
// asume el PRIMER ':' separa user de pass. Si pass tiene ':' literal, debe ir
// como %3A (pero el constructor en realidad lo tolera). Más común: caracteres
// como #, ?, /, [, ] en password.
const passwordChars = credsRaw.includes(":") ? credsRaw.slice(credsRaw.indexOf(":") + 1) : "";
const problematicInPass = [];
for (const ch of ["#", "?", "/", "[", "]"]) {
  if (passwordChars.includes(ch)) problematicInPass.push(ch);
}
if (problematicInPass.length > 0) {
  console.error(`\nFAIL: Password contiene caracteres que rompen el parser: ${problematicInPass.join(", ")}`);
  console.error("      Tabla de URL-encoding:");
  console.error("        @ → %40   : → %3A   / → %2F");
  console.error("        ? → %3F   # → %23   [ → %5B   ] → %5D   espacio → %20");
  console.error("\n      Tip: en bash/PowerShell podés generar el encoding con:");
  console.error("        node -e \"console.log(encodeURIComponent('TU_PASSWORD'))\"");
  process.exit(8);
}

// Diagnóstico del host
const hostPart = hostAndAfter.split("/")[0].split("?")[0];
const [hostOnly, portStr] = hostPart.includes(":") ? hostPart.split(":") : [hostPart, null];
console.log(`Host (parsed)      : ${hostOnly || "(empty)"}`);
console.log(`Port (parsed)      : ${portStr || "(default)"}`);
if (hostOnly && /[^a-z0-9.\-_]/i.test(hostOnly)) {
  const badChars = [...new Set(hostOnly.match(/[^a-z0-9.\-_]/gi) || [])];
  console.error(`\nFAIL: Host contiene char(s) inválido(s): ${JSON.stringify(badChars)}`);
  console.error("      El host de Postgres debe ser solo letras, dígitos, '.', '-' o '_'.");
  process.exit(9);
}
if (portStr !== null && !/^\d+$/.test(portStr)) {
  console.error(`\nFAIL: Port no es numérico: ${JSON.stringify(portStr)}`);
  process.exit(10);
}

// Si llegamos hasta acá, intentamos URL constructor como último check
try {
  const parsed = new URL(url);
  console.log(`\nok  URL parsea limpio con URL constructor.`);
  console.log(`    hostname: ${parsed.hostname}`);
  console.log(`    port    : ${parsed.port || "(default)"}`);
  console.log(`    pathname: ${parsed.pathname || "(empty)"}`);
} catch (e) {
  console.error(`\nFAIL: URL constructor falla pero no detecté qué: ${e.message}`);
  console.error("     Pegame este output completo y lo diagnostico.");
  process.exit(11);
}
