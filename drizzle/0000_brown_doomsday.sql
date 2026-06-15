CREATE TYPE "public"."condition" AS ENUM('Excellent', 'Good', 'Worn', 'Repair');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('Available', 'In Storage', 'Reserved', 'Staged', 'Repair', 'Retired');--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qr_code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"condition" "condition" DEFAULT 'Good' NOT NULL,
	"location" text NOT NULL,
	"status" "item_status" DEFAULT 'In Storage' NOT NULL,
	"taken_out_at" timestamp with time zone,
	"image_url" text DEFAULT '' NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_qr_code_unique" UNIQUE("qr_code")
);
--> statement-breakpoint
CREATE INDEX "idx_items_qr_code" ON "items" USING btree ("qr_code");--> statement-breakpoint
CREATE INDEX "idx_items_status" ON "items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_items_name" ON "items" USING btree ("name");