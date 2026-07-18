CREATE TABLE "item_tags" (
	"org_id" text NOT NULL,
	"item_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "item_tags_item_id_tag_id_pk" PRIMARY KEY("item_id","tag_id")
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
ALTER TABLE "items" ADD COLUMN "required_role" text;--> statement-breakpoint
CREATE INDEX "idx_item_tags_org_id" ON "item_tags" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_item_tags_tag_id" ON "item_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_org_name_unique" ON "tags" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX "idx_tags_org_id" ON "tags" USING btree ("org_id");