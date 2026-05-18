import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, createdAt: true } });
console.table(users);
await prisma.$disconnect();
