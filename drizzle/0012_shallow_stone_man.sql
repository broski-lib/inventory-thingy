UPDATE "items" SET "location" = 'Storage Unit', "updated_at" = now() WHERE "location" = 'Warehouse A, Bay 1';--> statement-breakpoint
UPDATE "itemBatches" SET "location" = 'Storage Unit', "updated_at" = now() WHERE "location" = 'Warehouse A, Bay 1';
