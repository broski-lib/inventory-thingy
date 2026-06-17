ALTER TABLE "items" DROP CONSTRAINT "items_qr_code_unique";--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "org_id" text NOT NULL DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "org_id" text NOT NULL DEFAULT 'legacy';--> statement-breakpoint
CREATE INDEX "idx_activity_logs_org_id" ON "activity_logs" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "items_org_qr_unique" ON "items" USING btree ("org_id","qr_code");--> statement-breakpoint
CREATE INDEX "idx_items_org_id" ON "items" USING btree ("org_id");--> statement-breakpoint
ALTER TABLE "activity_logs" ALTER COLUMN "org_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "org_id" DROP DEFAULT;