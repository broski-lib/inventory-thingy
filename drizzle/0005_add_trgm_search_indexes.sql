CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "idx_items_name_trgm" ON "items" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_items_qr_code_trgm" ON "items" USING gin ("qr_code" gin_trgm_ops);