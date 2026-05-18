-- =============================================================================
-- Migration: add SUPER_ADMIN role + User moderation fields
-- =============================================================================
-- Extends the UserRole enum with SUPER_ADMIN and adds suspension tracking
-- columns on User so admins can disable accounts without deleting them.
--
-- NOTE on enum changes in PostgreSQL:
-- ALTER TYPE ... ADD VALUE must run outside a transaction in PG < 12.
-- Prisma migrate runs each migration in its own transaction; PG 12+ allows
-- ADD VALUE within a tx (Supabase / Railway use PG 14+).
-- =============================================================================

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "User"
    ADD COLUMN "suspendedAt" TIMESTAMP(3),
    ADD COLUMN "suspendedReason" TEXT;
