-- One-off data migration (2026-08-16):
-- Move every item whose name mentions a comforter into Textiles & Bedding / Comforters
-- and every item whose name mentions a pillow into Textiles & Bedding / Pillows.
-- Category ids resolved against org_3I0GOntOUCP2Im4XorQ7HY5uuzC:
--   Textiles & Bedding = e1f7edc93bb843c5b1a50518f1
--   Comforters        = 06G0RYK50W31PPE8Y0KAV6ZXKY
--   Pillows           = 06G0RZKE84DMJJXHQ4K7M0T397

BEGIN;

UPDATE items
SET category_id = '06G0RYK50W31PPE8Y0KAV6ZXKY',
    updated_at = now()
WHERE org_id = 'org_3I0GOntOUCP2Im4XorQ7HY5uuzC'
  AND category_id IS DISTINCT FROM '06G0RYK50W31PPE8Y0KAV6ZXKY'
  AND LOWER(name) LIKE '%comforter%';

UPDATE items
SET category_id = '06G0RZKE84DMJJXHQ4K7M0T397',
    updated_at = now()
WHERE org_id = 'org_3I0GOntOUCP2Im4XorQ7HY5uuzC'
  AND category_id IS DISTINCT FROM '06G0RZKE84DMJJXHQ4K7M0T397'
  AND LOWER(name) LIKE '%pillow%';

COMMIT;
