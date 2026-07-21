CREATE TYPE "public"."print_size" AS ENUM('small', 'medium', 'large');--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "print_size" "print_size" DEFAULT 'medium' NOT NULL;