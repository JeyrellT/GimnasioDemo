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

// Step 1: Delete ALL users (cascade through FK references)
console.log('Finding FK references to User table...');
const tables = await prisma.$queryRawUnsafe(`
  SELECT tc.table_name, kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'User'
  ORDER BY tc.table_name;
`);

const allUsers = await prisma.$queryRawUnsafe(`SELECT id, email, role FROM "User"`);
console.log('Users to delete:', allUsers);

for (const user of allUsers) {
  for (const { table_name, column_name } of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table_name}" WHERE "${column_name}" = $1`, user.id);
    } catch {}
  }
  // Retry pass
  for (const { table_name, column_name } of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table_name}" WHERE "${column_name}" = $1`, user.id);
    } catch {}
  }
  await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id = $1`, user.id);
  console.log(`Deleted user ${user.email}`);
}

// Step 2: Create fresh SUPER_ADMIN user
const passwordHash = await hashPassword('test12345');
const newUser = await prisma.user.create({
  data: {
    email: 'gerencia@jcanalytic.com',
    name: 'JC Admin',
    role: 'SUPER_ADMIN',
    passwordHash,
    emailVerified: new Date(),
  },
});
console.log('Created SUPER_ADMIN:', { id: newUser.id, email: newUser.email, role: newUser.role });

// Verify
const remaining = await prisma.$queryRawUnsafe(`SELECT id, email, role FROM "User"`);
console.log('All users now:', remaining);

await prisma.$disconnect();
