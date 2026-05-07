-- DropIndex
DROP INDEX "Exercise_searchVector_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT;
