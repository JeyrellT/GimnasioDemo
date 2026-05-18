import { PrismaClient } from '@prisma/client';

const ITERATIONS = 200_000;
const HASH_LEN = 32;
const SALT_LEN = 16;

function bufToBase64(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function hashPassword(plaintext) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const enc = new TextEncoder().encode(plaintext.normalize('NFKC'));
  const key = await crypto.subtle.importKey('raw', enc, { name: 'PBKDF2' }, false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    HASH_LEN * 8,
  );
  return `pbkdf2|${ITERATIONS}|${bufToBase64(salt)}|${bufToBase64(new Uint8Array(derived))}`;
}

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const hash = await hashPassword('test12345');
await prisma.user.update({
  where: { id: 'cmpamosp40000pk1x3kath68e' },
  data: { passwordHash: hash },
});
console.log('Password updated for gerencia@jcanalytic.com');
await prisma.$disconnect();
