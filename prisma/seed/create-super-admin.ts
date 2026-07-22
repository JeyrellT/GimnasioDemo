// =============================================================================
// BLACKLINE FITNESS — SUPER_ADMIN one-shot bootstrap seed
// Owner: backend-api.
//
// Crea o promueve un usuario SUPER_ADMIN en un solo paso.
//
// A diferencia de `super-admin.ts` (que solo promueve un email ya existente),
// este script:
//   - Si el usuario NO existe → lo crea con email + passwordHash + role.
//   - Si el usuario YA existe sin SUPER_ADMIN → lo promueve.
//   - Si el usuario YA es SUPER_ADMIN → no-op (idempotente).
//   - Si se suministra SUPER_ADMIN_PASSWORD y la cuenta existe, rota el hash
//     (útil para recuperación de contraseña perdida del único SUPER_ADMIN).
//   - Si la cuenta estaba suspendida, la desuspende.
//
// Usage (local):
//
//   SUPER_ADMIN_EMAIL=you@example.com \
//   SUPER_ADMIN_PASSWORD=ChangeMe!ComplexEnough \
//   SUPER_ADMIN_NAME="Super Admin" \
//     pnpm db:create-super-admin
//
// Usage (Railway):
//
//   railway run --service <service> pnpm db:create-super-admin
//   (con las 3 vars seteadas en el dashboard de Railway)
//
// Security:
//   - Password se hashea con PBKDF2 SHA-256 200_000 iters (src/lib/crypto/passwords.ts).
//   - `emailVerified` se setea a `now()` para evitar friction de magic-link
//     en el primer login del bootstrap.
//   - `mustChangePassword = false`: el operador eligió la contraseña.
//   - Una vez logueado por primera vez, recomendamos limpiar las env vars y
//     cambiar la contraseña desde la UI o vía DB.
//
// Idempotencia:
//   - Re-correr el script con el mismo email es seguro: no-op si todo está
//     en el estado deseado, ajusta lo que difiera, nunca duplica filas.
// =============================================================================

import { PrismaClient, UserRole } from "@prisma/client";

import { hashPassword } from "../../src/lib/crypto/passwords";

const prisma = new PrismaClient({ log: ["warn", "error"] });

interface EnvInput {
  email: string;
  password: string | null;
  name: string;
}

function readEnv(): EnvInput {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD?.trim() || null;
  const name = process.env.SUPER_ADMIN_NAME?.trim() || "Super Admin";

  if (!email) {
    console.error(
      "[create-super-admin] SUPER_ADMIN_EMAIL is required.\n" +
        "  Example:\n" +
        "    SUPER_ADMIN_EMAIL=you@example.com \\\n" +
        "    SUPER_ADMIN_PASSWORD=ChangeMe!ComplexEnough \\\n" +
        "    SUPER_ADMIN_NAME=\"Super Admin\" \\\n" +
        "      pnpm db:create-super-admin",
    );
    process.exit(1);
  }

  // Minimal email sanity check — full validation is enforced by Prisma's
  // unique constraint and by NextAuth at login time.
  if (!email.includes("@") || email.length < 5) {
    console.error(`[create-super-admin] Invalid email: "${email}".`);
    process.exit(1);
  }

  // If the user is brand-new we need a password.
  // (For "promote existing" flow the password is optional — covered below.)
  if (password !== null && password.length < 12) {
    console.error(
      "[create-super-admin] SUPER_ADMIN_PASSWORD must be at least 12 characters.",
    );
    process.exit(1);
  }

  return { email, password, name };
}

async function main(): Promise<void> {
  const { email, password, name } = readEnv();

  const existing = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      name: true,
      suspendedAt: true,
      passwordHash: true,
      deletedAt: true,
    },
  });

  // -- Branch A: user does not exist → create with SUPER_ADMIN role -----------
  if (!existing) {
    if (!password) {
      console.error(
        `[create-super-admin] User "${email}" does not exist yet.\n  Set SUPER_ADMIN_PASSWORD to create the account in one step,\n  or register the email manually via /registrarse and then run\n  this script again (without SUPER_ADMIN_PASSWORD) to promote.`,
      );
      process.exit(1);
    }

    const passwordHash = await hashPassword(password);

    const created = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        emailVerified: new Date(),
        mustChangePassword: false,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    console.log(
      `[create-super-admin] ok  Created SUPER_ADMIN ${created.email} ` +
        `(${created.name}) — id ${created.id}`,
    );
    return;
  }

  // -- Branch B: soft-deleted account — refuse and explain --------------------
  if (existing.deletedAt) {
    console.error(
      `[create-super-admin] User "${email}" was soft-deleted on ${existing.deletedAt.toISOString()}.\n  Restoring deleted accounts is not supported by this script — it\n  would bypass the LPDP audit trail. Pick a different email.`,
    );
    process.exit(1);
  }

  // -- Branch C: user already exists → promote / rotate / unsuspend ----------
  const updates: Record<string, unknown> = {};
  const actions: string[] = [];

  if (existing.role !== UserRole.SUPER_ADMIN) {
    updates.role = UserRole.SUPER_ADMIN;
    actions.push(`promoted from ${existing.role}`);
  }

  if (existing.suspendedAt) {
    updates.suspendedAt = null;
    updates.suspendedReason = null;
    actions.push("unsuspended");
  }

  if (password) {
    updates.passwordHash = await hashPassword(password);
    updates.mustChangePassword = false;
    actions.push("password rotated");
  } else if (!existing.passwordHash) {
    // Existing account with no password hash (magic-link only) and no new
    // password supplied — flag this so the operator notices, but don't fail.
    console.warn(
      `[create-super-admin] note  ${email} has no passwordHash set (magic-link only). Sign-in will require a magic link until you set\n  SUPER_ADMIN_PASSWORD and re-run.`,
    );
  }

  if (Object.keys(updates).length === 0) {
    console.log(
      `[create-super-admin] ok  ${email} is already SUPER_ADMIN. No-op.`,
    );
    return;
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: updates,
  });

  console.log(
    `[create-super-admin] ok  ${email} — ${actions.join(", ")}.`,
  );
}

main()
  .catch((err: unknown) => {
    console.error("[create-super-admin] FAILED");
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
