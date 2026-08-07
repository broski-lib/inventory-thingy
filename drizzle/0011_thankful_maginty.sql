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
CREATE INDEX "idx_rack_items_org_id" ON "rack_items" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_rack_items_rack_id" ON "rack_items" USING btree ("rack_id");--> statement-breakpoint
CREATE INDEX "idx_rack_items_item_id" ON "rack_items" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "racks_org_qr_unique" ON "racks" USING btree ("org_id","qr_code");--> statement-breakpoint
CREATE INDEX "idx_racks_org_id" ON "racks" USING btree ("org_id");