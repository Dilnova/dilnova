ALTER TABLE "tax_classes" DROP CONSTRAINT "tax_classes_code_unique";--> statement-breakpoint
ALTER TABLE "tax_classes" ADD COLUMN "org_id" text;