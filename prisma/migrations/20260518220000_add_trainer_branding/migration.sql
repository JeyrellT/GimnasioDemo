-- AlterTable: add branding customization fields to TrainerProfile
ALTER TABLE "TrainerProfile"
  ADD COLUMN "brandPaletteId"    TEXT NOT NULL DEFAULT 'blue',
  ADD COLUMN "brandBusinessName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "brandLogoFull"     TEXT,
  ADD COLUMN "brandLogoMark"     TEXT;
