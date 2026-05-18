import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const idsToDelete = [
  'cmpaf7wjd0000s31xqil6qm17',
  'cmpaivnl80000nx1xy8srf0l8',
];

// Get all table names that reference "User"
const tables = await prisma.$queryRawUnsafe(`
  SELECT tc.table_name, kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'User'
  ORDER BY tc.table_name;
`);

console.log('Tables referencing User:', tables.map(t => `${t.table_name}.${t.column_name}`));

for (const id of idsToDelete) {
  // Delete from all referencing tables first
  for (const { table_name, column_name } of tables) {
    try {
      const count = await prisma.$executeRawUnsafe(
        `DELETE FROM "${table_name}" WHERE "${column_name}" = $1`, id
      );
      if (count > 0) console.log(`  Deleted ${count} rows from ${table_name}`);
    } catch (e) {
      // Some tables might have deeper FKs - skip and retry
    }
  }

  // Retry any that failed due to ordering
  for (const { table_name, column_name } of tables) {
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "${table_name}" WHERE "${column_name}" = $1`, id
      );
    } catch {}
  }

  // Delete the user
  await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id = $1`, id);
  console.log(`Deleted user ${id}`);
}

const remaining = await prisma.$queryRawUnsafe(`SELECT id, email, role FROM "User"`);
console.log('Remaining users:', remaining);
await prisma.$disconnect();
