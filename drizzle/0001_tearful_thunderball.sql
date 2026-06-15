CREATE TYPE "public"."activity_action" AS ENUM('created', 'updated', 'deleted', 'checked_out', 'checked_in', 'reported_damaged', 'moved', 'condition_changed');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid,
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_activity_logs_item_id" ON "activity_logs" USING btree ("item_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_created_at" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_user_id" ON "activity_logs" USING btree ("user_id","created_at");