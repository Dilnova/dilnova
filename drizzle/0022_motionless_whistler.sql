ALTER TABLE "tax_classes" DROP CONSTRAINT IF EXISTS "tax_classes_code_unique";--> statement-breakpoint
ALTER TABLE "tax_classes" DROP CONSTRAINT IF EXISTS "tax_classes_code_key";--> statement-breakpoint
DROP INDEX IF EXISTS "tax_classes_code_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "tax_classes_code_key";--> statement-breakpoint
ALTER TABLE "tax_classes" ADD COLUMN IF NOT EXISTS "org_id" text;