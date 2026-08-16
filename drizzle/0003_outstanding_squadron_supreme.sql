-- Re-point all rows from the old Clerk org id to the new one.
-- No unique-index collisions possible: the target org had zero rows
-- in every table at migration time.

UPDATE items SET org_id = 'org_3I0GOntOUCP2Im4XorQ7HY5uuzC' WHERE org_id = 'org_3FHKNw4adVqqRLXYwR3gYFs5PmI';
UPDATE tags SET org_id = 'org_3I0GOntOUCP2Im4XorQ7HY5uuzC' WHERE org_id = 'org_3FHKNw4adVqqRLXYwR3gYFs5PmI';
UPDATE categories SET org_id = 'org_3I0GOntOUCP2Im4XorQ7HY5uuzC' WHERE org_id = 'org_3FHKNw4adVqqRLXYwR3gYFs5PmI';
UPDATE item_tags SET org_id = 'org_3I0GOntOUCP2Im4XorQ7HY5uuzC' WHERE org_id = 'org_3FHKNw4adVqqRLXYwR3gYFs5PmI';
UPDATE item_batches SET org_id = 'org_3I0GOntOUCP2Im4XorQ7HY5uuzC' WHERE org_id = 'org_3FHKNw4adVqqRLXYwR3gYFs5PmI';
UPDATE racks SET org_id = 'org_3I0GOntOUCP2Im4XorQ7HY5uuzC' WHERE org_id = 'org_3FHKNw4adVqqRLXYwR3gYFs5PmI';
UPDATE rack_items SET org_id = 'org_3I0GOntOUCP2Im4XorQ7HY5uuzC' WHERE org_id = 'org_3FHKNw4adVqqRLXYwR3gYFs5PmI';
UPDATE activity_logs SET org_id = 'org_3I0GOntOUCP2Im4XorQ7HY5uuzC' WHERE org_id = 'org_3FHKNw4adVqqRLXYwR3gYFs5PmI';
