-- 0002: convert item IDs from uuid → Crockford-base32 ULID.
-- ULIDs are 26 chars, MSB-first, and consist of:
--   10 chars: 48-bit timestamp (ms since epoch) base32-encoded
--   16 chars: 80 random bits base32-encoded
-- This migration is idempotent: it short-circuits if items.id is already text.

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'items'
      AND column_name = 'id'
      AND data_type = 'uuid'
  ) THEN
    RAISE NOTICE 'Converting item IDs from uuid to ULID…';

    ------------------------------------------------------------------
    -- Helpers (scoped to pg_temp so they don't leak into the schema)
    ------------------------------------------------------------------
    CREATE OR REPLACE FUNCTION pg_temp.encode_ulid_time(ts_ms bigint)
      RETURNS text
      LANGUAGE plpgsql
      IMMUTABLE
    AS $fn$
    DECLARE
      alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
      result text := '';
      i int;
      idx int;
    BEGIN
      FOR i IN 1..10 LOOP
        idx := (ts_ms >> ((10 - i) * 5)) & 31;
        result := result || substr(alphabet, idx + 1, 1);
      END LOOP;
      RETURN result;
    END;
    $fn$;

    CREATE OR REPLACE FUNCTION pg_temp.encode_ulid_random(hex20 text)
      RETURNS text
      LANGUAGE plpgsql
      IMMUTABLE
    AS $fn$
    DECLARE
      alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
      raw bytea := decode(hex20, 'hex');
      result text := '';
      i int;
      byte_idx int;
      bit_off int;
      val int;
    BEGIN
      FOR i IN 0..15 LOOP
        byte_idx := (i * 5) / 8;
        bit_off := (i * 5) % 8;
        val := (get_byte(raw, byte_idx) >> bit_off) & 31;
        IF bit_off > 3 THEN
          val := val | ((get_byte(raw, byte_idx + 1) << (8 - bit_off)) & 31);
        END IF;
        result := result || substr(alphabet, val + 1, 1);
      END LOOP;
      RETURN result;
    END;
    $fn$;

    ------------------------------------------------------------------
    -- 1. Add new text columns
    ------------------------------------------------------------------
    ALTER TABLE "items" ADD COLUMN "id_ulid" text;
    ALTER TABLE "activity_logs" ADD COLUMN "item_id_ulid" text;

    ------------------------------------------------------------------
    -- 2. Backfill items: timestamp = updated_at, randomness = md5(old id)
    ------------------------------------------------------------------
    UPDATE "items" i
    SET "id_ulid" =
      pg_temp.encode_ulid_time(
        (EXTRACT(EPOCH FROM i."updated_at") * 1000)::bigint
      ) ||
      pg_temp.encode_ulid_random(substring(md5(i."id"::text), 1, 20));

    ------------------------------------------------------------------
    -- 3. Backfill activity_logs
    --    Use the item's new id_ulid when the item still exists; for
    --    orphan logs (item deleted before this migration), build a
    --    stable ULID from the old uuid with an epoch-0 timestamp.
    ------------------------------------------------------------------
    UPDATE "activity_logs" al
    SET "item_id_ulid" = i."id_ulid"
    FROM "items" i
    WHERE al."item_id" = i."id";

    UPDATE "activity_logs" al
    SET "item_id_ulid" =
      pg_temp.encode_ulid_time(0) ||
      pg_temp.encode_ulid_random(substring(md5(al."item_id"::text), 1, 20))
    WHERE al."item_id" IS NOT NULL
      AND al."item_id_ulid" IS NULL;

    ------------------------------------------------------------------
    -- 4. Swap columns: drop uuid, rename new text column into place
    ------------------------------------------------------------------
    ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "items_pkey";
    ALTER TABLE "items" DROP COLUMN "id";
    ALTER TABLE "items" RENAME COLUMN "id_ulid" TO "id";
    ALTER TABLE "items" ALTER COLUMN "id" SET NOT NULL;
    ALTER TABLE "items" ADD PRIMARY KEY ("id");

    ALTER TABLE "activity_logs" DROP COLUMN "item_id";
    ALTER TABLE "activity_logs" RENAME COLUMN "item_id_ulid" TO "item_id";

    RAISE NOTICE 'ULID conversion complete.';
  ELSE
    RAISE NOTICE 'items.id is already text, skipping ULID conversion.';
  END IF;
END
$do$;
