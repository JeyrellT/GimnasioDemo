import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const uid = 'cmpb7afq20000l73suazpqvnl';
const [tp, cp, acct, sub] = await Promise.all([
  prisma.trainerProfile.findUnique({ where: { userId: uid } }),
  prisma.clientProfile.findUnique({ where: { userId: uid } }),
  prisma.account.findMany({ where: { userId: uid } }),
  prisma.trainerSubscription.findMany({ where: { trainerUserId: uid } }),
]);
console.log('TrainerProfile:', tp);
console.log('ClientProfile:', cp);
console.log('Accounts:', acct);
console.log('Subscriptions:', sub);
await prisma.$disconnect();
