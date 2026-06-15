-- 0003: rewrite items.qr_code (and activity_logs.item_qr_code snapshots)
-- as a clean `XXXX-XXXX` short id. Drops the legacy area/category/period/
-- sequence encoding (e.g. `STG-SOF-2606-0042`).
--
-- Mapping is deterministic: each new short id is derived from
-- md5(old_qr_code), split into two 16-hex groups and base32-encoded
-- separately, then joined with a dash. Same approach for orphan logs
-- (item deleted before migration).

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'items'
      AND column_name = 'qr_code'
      AND (data_type = 'text' AND character_maximum_length IS NULL)
  ) THEN
    ------------------------------------------------------------------
    -- Helper: derive a `XXXX-XXXX` short id from any input string.
    -- Two independent 16-hex / 64-bit chunks are base32-encoded
    -- into 4 chars each, then joined with a dash.
    ------------------------------------------------------------------
    CREATE OR REPLACE FUNCTION pg_temp.short_id_from_input(input text)
      RETURNS text
      LANGUAGE plpgsql
      IMMUTABLE
    AS $fn$
    DECLARE
      alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
      hash_hex text := md5(input);
      group_a_hex text := substring(hash_hex from 1 for 16);
      group_b_hex text := substring(hash_hex from 17 for 16);
      group_a bytea := decode(group_a_hex, 'hex');
      group_b bytea := decode(group_b_hex, 'hex');
      part_a text := '';
      part_b text := '';
      i int;
      byte_idx int;
      bit_off int;
      val int;
    BEGIN
      FOR i IN 0..3 LOOP
        byte_idx := (i * 5) / 8;
        bit_off := (i * 5) % 8;
        val := (get_byte(group_a, byte_idx) >> bit_off) & 31;
        IF bit_off > 3 THEN
          val := val | ((get_byte(group_a, byte_idx + 1) << (8 - bit_off)) & 31);
        END IF;
        part_a := part_a || substr(alphabet, val + 1, 1);
      END LOOP;
      FOR i IN 0..3 LOOP
        byte_idx := (i * 5) / 8;
        bit_off := (i * 5) % 8;
        val := (get_byte(group_b, byte_idx) >> bit_off) & 31;
        IF bit_off > 3 THEN
          val := val | ((get_byte(group_b, byte_idx + 1) << (8 - bit_off)) & 31);
        END IF;
        part_b := part_b || substr(alphabet, val + 1, 1);
      END LOOP;
      RETURN part_a || '-' || part_b;
    END;
    $fn$;

    ------------------------------------------------------------------
    -- 1. Add new columns
    ------------------------------------------------------------------
    ALTER TABLE "items" ADD COLUMN "qr_code_new" text;
    ALTER TABLE "activity_logs" ADD COLUMN "item_qr_code_new" text;

    ------------------------------------------------------------------
    -- 2. Backfill items
    ------------------------------------------------------------------
    UPDATE "items"
    SET "qr_code_new" = pg_temp.short_id_from_input("qr_code");

    ------------------------------------------------------------------
    -- 3. Backfill activity_logs
    --    Use the item's new short id when the item still exists; for
    --    orphan logs, build a short id from the old qr code text.
    ------------------------------------------------------------------
    UPDATE "activity_logs" al
    SET "item_qr_code_new" = i."qr_code_new"
    FROM "items" i
    WHERE al."item_id" = i."id"
      AND al."item_qr_code" IS NOT NULL;

    UPDATE "activity_logs" al
    SET "item_qr_code_new" = pg_temp.short_id_from_input(al."item_qr_code")
    WHERE al."item_qr_code" IS NOT NULL
      AND al."item_qr_code_new" IS NULL;

    ------------------------------------------------------------------
    -- 4. Swap columns
    ------------------------------------------------------------------
    ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "items_qr_code_unique";
    ALTER TABLE "items" DROP COLUMN "qr_code";
    ALTER TABLE "items" RENAME COLUMN "qr_code_new" TO "qr_code";
    ALTER TABLE "items" ADD CONSTRAINT "items_qr_code_unique" UNIQUE ("qr_code");

    ALTER TABLE "activity_logs" DROP COLUMN "item_qr_code";
    ALTER TABLE "activity_logs" RENAME COLUMN "item_qr_code_new" TO "item_qr_code";

    RAISE NOTICE 'Short id migration complete.';
  ELSE
    RAISE NOTICE 'items.qr_code is not a plain text column, skipping.';
  END IF;
END
$do$;
