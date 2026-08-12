CREATE TYPE "public"."activity_action" AS ENUM('created', 'updated', 'deleted', 'checked_out', 'checked_in', 'reported_damaged', 'moved', 'condition_changed');--> statement-breakpoint
CREATE TYPE "public"."condition" AS ENUM('Excellent', 'Good', 'Worn', 'Repair');--> statement-breakpoint
CREATE TYPE "public"."item_kind" AS ENUM('unit', 'bulk');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('Available', 'In Storage', 'Reserved', 'Staged', 'Repair', 'Retired', 'Pending Tag');--> statement-breakpoint
CREATE TYPE "public"."print_size" AS ENUM('small', 'medium', 'large');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"item_id" text,
	"user_id" text NOT NULL,
	"user_name" text DEFAULT '' NOT NULL,
	"user_email" text DEFAULT '' NOT NULL,
	"action" "activity_action" NOT NULL,
	"item_name" text DEFAULT '' NOT NULL,
	"item_qr_code" text DEFAULT '' NOT NULL,
	"from_location" text,
	"to_location" text,
	"from_condition" "condition",
	"to_condition" "condition",
	"quantity" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "item_tags" (
	"org_id" text NOT NULL,
	"item_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "item_tags_item_id_tag_id_pk" PRIMARY KEY("item_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"kind" "item_kind" DEFAULT 'unit' NOT NULL,
	"qr_code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"condition" "condition" DEFAULT 'Good' NOT NULL,
	"location" text NOT NULL,
	"status" "item_status" DEFAULT 'In Storage' NOT NULL,
	"taken_out_at" timestamp with time zone,
	"image_url" text DEFAULT '' NOT NULL,
	"image_key" text,
	"created_by" text DEFAULT '' NOT NULL,
	"required_role" text,
	"print_size" "print_size" DEFAULT 'medium' NOT NULL,
	"tagged" boolean DEFAULT true NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rack_items" (
	"rack_id" text NOT NULL,
	"org_id" text NOT NULL,
	"item_id" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "rack_items_rack_id_item_id_pk" PRIMARY KEY("rack_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "racks" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"qr_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6b7280' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_activity_logs_org_id" ON "activity_logs" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_item_id" ON "activity_logs" USING btree ("item_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_created_at" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_user_id" ON "activity_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_item_batches_org_id" ON "item_batches" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_item_batches_item_id" ON "item_batches" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_item_batches_location" ON "item_batches" USING btree ("location");--> statement-breakpoint
CREATE INDEX "idx_item_batches_status" ON "item_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_item_tags_org_id" ON "item_tags" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_item_tags_tag_id" ON "item_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "items_org_qr_unique" ON "items" USING btree ("org_id","qr_code");--> statement-breakpoint
CREATE INDEX "idx_items_org_id" ON "items" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_items_qr_code" ON "items" USING btree ("qr_code");--> statement-breakpoint
CREATE INDEX "idx_items_status" ON "items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_items_name" ON "items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_rack_items_org_id" ON "rack_items" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_rack_items_rack_id" ON "rack_items" USING btree ("rack_id");--> statement-breakpoint
CREATE INDEX "idx_rack_items_item_id" ON "rack_items" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "racks_org_qr_unique" ON "racks" USING btree ("org_id","qr_code");--> statement-breakpoint
CREATE INDEX "idx_racks_org_id" ON "racks" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_org_name_unique" ON "tags" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX "idx_tags_org_id" ON "tags" USING btree ("org_id");