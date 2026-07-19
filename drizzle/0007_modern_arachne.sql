CREATE TYPE "public"."item_kind" AS ENUM('unit', 'bulk');--> statement-breakpoint
CREATE TABLE "item_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"item_id" text NOT NULL,
	"qty" integer NOT NULL,
	"location" text NOT NULL,
	"status" "item_status" DEFAULT 'In Storage' NOT NULL,
	"condition" "condition" DEFAULT 'Good' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "quantity" integer;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "kind" "item_kind" DEFAULT 'unit' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_item_batches_org_id" ON "item_batches" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_item_batches_item_id" ON "item_batches" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_item_batches_location" ON "item_batches" USING btree ("location");--> statement-breakpoint
CREATE INDEX "idx_item_batches_status" ON "item_batches" USING btree ("status");