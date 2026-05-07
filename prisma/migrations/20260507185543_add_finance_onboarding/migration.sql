-- CreateEnum
CREATE TYPE "LocationKind" AS ENUM ('HOME', 'GYM', 'STUDIO', 'CLIENT_HOME', 'OUTDOOR', 'OTHER');

-- CreateEnum
CREATE TYPE "LocationCostModel" AS ENUM ('FLAT', 'PER_KM', 'HYBRID');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('TRANSPORTE', 'ALQUILER_ESPACIO', 'EQUIPO', 'MARKETING', 'EDUCACION', 'SOFTWARE', 'COMIDAS', 'IMPUESTOS', 'SERVICIOS_PROFESIONALES', 'OTROS');

-- CreateEnum
CREATE TYPE "ExpenseSource" AS ENUM ('MANUAL', 'LOCATION_VISIT', 'RECURRING_RENT');

-- CreateEnum
CREATE TYPE "IncomeCategory" AS ENUM ('SESION_PT', 'EVALUACION_INICIAL', 'PLAN_NUTRICIONAL', 'CLASE_GRUPAL', 'ASESORIA_ONLINE', 'PRODUCTO', 'OTROS');

-- CreateEnum
CREATE TYPE "OneOffPaidStatus" AS ENUM ('PAID', 'PENDING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OnboardingMode" AS ENUM ('TRAINER_SIDE', 'INVITE');

-- CreateTable
CREATE TABLE "TrainerLocation" (
    "id" TEXT NOT NULL,
    "trainerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "kind" "LocationKind" NOT NULL,
    "costModel" "LocationCostModel" NOT NULL DEFAULT 'FLAT',
    "costPerVisitCRC" DECIMAL(10,2),
    "costPerKmCRC" DECIMAL(10,2),
    "defaultKm" DECIMAL(6,2),
    "monthlyRentCRC" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TrainerLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationVisit" (
    "id" TEXT NOT NULL,
    "trainerUserId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL,
    "kmTraveled" DECIMAL(6,2),
    "computedCostCRC" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LocationVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerExpense" (
    "id" TEXT NOT NULL,
    "trainerUserId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "amountCRC" DECIMAL(10,2) NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "locationId" TEXT,
    "description" TEXT,
    "receiptKey" TEXT,
    "source" "ExpenseSource" NOT NULL DEFAULT 'MANUAL',
    "visitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TrainerExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneOffSale" (
    "id" TEXT NOT NULL,
    "trainerUserId" TEXT NOT NULL,
    "clientUserId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "amountCRC" DECIMAL(10,2) NOT NULL,
    "category" "IncomeCategory" NOT NULL,
    "description" TEXT,
    "paymentMethod" TEXT,
    "paidStatus" "OneOffPaidStatus" NOT NULL DEFAULT 'PAID',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OneOffSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingDraft" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "mode" "OnboardingMode" NOT NULL,
    "invitationId" TEXT,
    "clientUserId" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "dataJson" JSONB NOT NULL,
    "aiConsentGranted" BOOLEAN NOT NULL DEFAULT false,
    "aiConsentGrantedAt" TIMESTAMP(3),
    "cedulaExtractionCount" INTEGER NOT NULL DEFAULT 0,
    "workoutPhotoExtractionCount" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainerLocation_trainerUserId_deletedAt_idx" ON "TrainerLocation"("trainerUserId", "deletedAt");

-- CreateIndex
CREATE INDEX "LocationVisit_trainerUserId_visitedAt_idx" ON "LocationVisit"("trainerUserId", "visitedAt" DESC);

-- CreateIndex
CREATE INDEX "LocationVisit_locationId_visitedAt_idx" ON "LocationVisit"("locationId", "visitedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "TrainerExpense_visitId_key" ON "TrainerExpense"("visitId");

-- CreateIndex
CREATE INDEX "TrainerExpense_trainerUserId_occurredAt_idx" ON "TrainerExpense"("trainerUserId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "TrainerExpense_trainerUserId_category_occurredAt_idx" ON "TrainerExpense"("trainerUserId", "category", "occurredAt");

-- CreateIndex
CREATE INDEX "OneOffSale_trainerUserId_occurredAt_idx" ON "OneOffSale"("trainerUserId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "OneOffSale_trainerUserId_category_occurredAt_idx" ON "OneOffSale"("trainerUserId", "category", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingDraft_invitationId_key" ON "OnboardingDraft"("invitationId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingDraft_clientUserId_key" ON "OnboardingDraft"("clientUserId");

-- CreateIndex
CREATE INDEX "OnboardingDraft_trainerId_completedAt_idx" ON "OnboardingDraft"("trainerId", "completedAt");

-- CreateIndex
CREATE INDEX "OnboardingDraft_expiresAt_idx" ON "OnboardingDraft"("expiresAt");

-- AddForeignKey
ALTER TABLE "TrainerLocation" ADD CONSTRAINT "TrainerLocation_trainerUserId_fkey" FOREIGN KEY ("trainerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationVisit" ADD CONSTRAINT "LocationVisit_trainerUserId_fkey" FOREIGN KEY ("trainerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationVisit" ADD CONSTRAINT "LocationVisit_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "TrainerLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerExpense" ADD CONSTRAINT "TrainerExpense_trainerUserId_fkey" FOREIGN KEY ("trainerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerExpense" ADD CONSTRAINT "TrainerExpense_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "TrainerLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerExpense" ADD CONSTRAINT "TrainerExpense_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "LocationVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneOffSale" ADD CONSTRAINT "OneOffSale_trainerUserId_fkey" FOREIGN KEY ("trainerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneOffSale" ADD CONSTRAINT "OneOffSale_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingDraft" ADD CONSTRAINT "OnboardingDraft_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingDraft" ADD CONSTRAINT "OnboardingDraft_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
