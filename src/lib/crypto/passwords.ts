/**
 * Password hashing — Vizion
 * ────────────────────────────────────────────────────────────────────────────
 * Uses Web Crypto API (PBKDF2-SHA-256) — works in both Node 18+ and Edge
 * runtime without any `node:` imports. PBKDF2 is FIPS-approved and widely
 * supported.
 *
 * Encoded format is portable and self-describing:
 *
 *   pbkdf2|iterations|saltBase64|hashBase64
 *
 * Default cost: 200,000 iterations. ~80ms on a modern laptop. To raise cost
 * later, bump iterations and the verifier still understands the old hashes
 * because the count is encoded in the string.
 *
 * Hash length: 32 bytes (256 bits). Salt length: 16 bytes (128 bits).
 */

const ITERATIONS = 200_000;
const HASH_LEN = 32;
const SALT_LEN = 16;

function getCrypto(): Crypto {
  // Both modern Node (>=20) and Edge runtime expose `crypto` as a global.
  // Older Node versions need the `node:crypto` webcrypto export, but Vizion
  // targets Node 22+.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: Crypto | undefined = (globalThis as any).crypto;
  if (!c?.subtle) {
    throw new Error("Web Crypto API not available in this runtime");
  }
  return c;
}

function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  // btoa is a global in both Node 18+ and browsers/Edge.
  return btoa(binary);
}

function base64ToBuf(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= (a[i] as number) ^ (b[i] as number);
  }
  return diff === 0;
}

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number,
  bytes: number,
): Promise<Uint8Array> {
  const c = getCrypto();
  const passwordBytes = new TextEncoder().encode(password.normalize("NFKC"));

  const baseKey = await c.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const derived = await c.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as unknown as ArrayBuffer,
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    bytes * 8,
  );

  return new Uint8Array(derived);
}

/**
 * Hash a plaintext password. Returns a self-describing string ready to persist
 * in `User.passwordHash`.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("Password is required");
  }
  if (plaintext.length > 1024) {
    throw new Error("Password is too long");
  }

  const c = getCrypto();
  const salt = c.getRandomValues(new Uint8Array(SALT_LEN));
  const derived = await deriveBits(plaintext, salt, ITERATIONS, HASH_LEN);

  return `pbkdf2|${ITERATIONS}|${bufToBase64(salt)}|${bufToBase64(derived)}`;
}

/**
 * Verify a plaintext against a stored hash. Constant-time comparison.
 * Returns false on any error to avoid timing/oracle leaks.
 */
export async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  if (typeof plaintext !== "string" || plaintext.length === 0) return false;
  if (typeof stored !== "string" || stored.length === 0) return false;

  try {
    const parts = stored.split("|");
    if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

    const iterations = Number.parseInt(parts[1] ?? "", 10);
    const saltB64 = parts[2] ?? "";
    const hashB64 = parts[3] ?? "";

    if (!Number.isFinite(iterations) || iterations <= 0 || iterations > 5_000_000) {
      return false;
    }
    if (!saltB64 || !hashB64) return false;

    const salt = base64ToBuf(saltB64);
    const expected = base64ToBuf(hashB64);
    if (salt.length === 0 || expected.length === 0) return false;

    const candidate = await deriveBits(plaintext, salt, iterations, expected.length);
    return constantTimeEqual(candidate, expected);
  } catch {
    return false;
  }
}
