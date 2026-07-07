-- Add binary avatars stored in Postgres.
-- User.avatarUrl keeps a small route URL; bytes live here to avoid bloating JWT cookies.

CREATE TABLE "UserAvatar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAvatar_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserAvatar_userId_key" ON "UserAvatar"("userId");
CREATE INDEX "UserAvatar_updatedAt_idx" ON "UserAvatar"("updatedAt");

ALTER TABLE "UserAvatar"
ADD CONSTRAINT "UserAvatar_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
