-- CreateEnum
CREATE TYPE "MedicalConditionKind" AS ENUM ('ALLERGY', 'INJURY', 'CHRONIC', 'MEDICATION', 'SURGERY', 'OTHER');

-- CreateEnum
CREATE TYPE "ConditionSeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- AlterTable
ALTER TABLE "ClientProfile"
    ADD COLUMN "medicalPromptShownAt" TIMESTAMP(3),
    ADD COLUMN "medicalConditionsReviewedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MedicalCondition" (
    "id" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "kind" "MedicalConditionKind" NOT NULL,
    "label" TEXT NOT NULL,
    "detail" TEXT,
    "severity" "ConditionSeverity",
    "startedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MedicalCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalCondition_clientUserId_isActive_idx" ON "MedicalCondition"("clientUserId", "isActive");

-- CreateIndex
CREATE INDEX "MedicalCondition_clientUserId_deletedAt_idx" ON "MedicalCondition"("clientUserId", "deletedAt");

-- AddForeignKey
ALTER TABLE "MedicalCondition" ADD CONSTRAINT "MedicalCondition_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
