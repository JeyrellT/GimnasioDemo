-- Add ONVO as a payment provider + webhook idempotency.

-- AlterEnum: add the ONVO value to PaymentEventType.
ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'ONVO';

-- CreateIndex: idempotency for provider webhooks (ONVO). At most one
-- PaymentEvent per (provider type, external payment-intent id). Rows with a
-- NULL externalId are exempt (Postgres treats NULLs as distinct).
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentEvent_type_externalId_key"
  ON "PaymentEvent" ("type", "externalId");
