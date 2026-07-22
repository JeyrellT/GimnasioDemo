// =============================================================================
// BLACKLINE FITNESS — SUPER_ADMIN bootstrap seed
// Owner: database-architect.
//
// Promotes the user identified by SUPER_ADMIN_EMAIL to the SUPER_ADMIN role.
// Idempotent — runs safely on every deploy:
//   - If the user does not exist: prints a clear error and exits non-zero.
//   - If the user already has SUPER_ADMIN: no-op, prints a confirmation.
//   - If the user has any other role: promotes them and logs the change.
//
// Usage:
//   SUPER_ADMIN_EMAIL=admin@example.com pnpm db:seed:super-admin
//
// Why a separate entry point (not folded into seed/index.ts):
//   - Production deploys run seed:super-admin only, not the demo data block.
//   - Decouples role promotion from subscription-plan / exercise seeding so
//     the operator can re-run it without re-importing 800 exercises.
// =============================================================================

import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient({ log: ["warn", "error"] });

async function main(): Promise<void> {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();

  if (!email) {
    console.error("[seed:super-admin] SUPER_ADMIN_EMAIL is not set.");
    console.error(
      "  Set it in your .env.local or shell, then re-run: " +
        "SUPER_ADMIN_EMAIL=you@example.com pnpm db:seed:super-admin",
    );
    process.exit(1);
  }

  console.log(`[seed:super-admin] Promoting ${email} to SUPER_ADMIN...`);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, name: true, suspendedAt: true },
  });

  if (!user) {
    console.error(
      `[seed:super-admin] User with email "${email}" not found in DB.`,
    );
    console.error(
      "  The user must already exist (sign up via the app first) before " +
        "running this script.",
    );
    process.exit(1);
  }

  if (user.suspendedAt) {
    console.warn(
      `[seed:super-admin] WARNING: ${email} is currently suspended. ` +
        "Clearing suspension as part of promotion.",
    );
  }

  if (user.role === UserRole.SUPER_ADMIN && !user.suspendedAt) {
    console.log(
      `[seed:super-admin] ${email} is already SUPER_ADMIN. No-op.`,
    );
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      role: UserRole.SUPER_ADMIN,
      suspendedAt: null,
      suspendedReason: null,
    },
  });

  console.log(
    `[seed:super-admin] ok  ${email} (${user.name}) is now SUPER_ADMIN.`,
  );
}

main()
  .catch((err: unknown) => {
    console.error("[seed:super-admin] FAILED");
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
