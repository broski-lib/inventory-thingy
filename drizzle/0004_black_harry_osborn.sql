-- Re-point rows from the old Clerk user id to the new one.
-- No uniqueness concerns: these are plain text columns without constraints.

UPDATE items SET created_by = 'user_3HyAJzQxYfKFwwgz9tpus0CBZ7v' WHERE created_by = 'user_3FHKMNtUL6GnzCNNDUslW6TzzQZ';
UPDATE activity_logs SET user_id = 'user_3HyAJzQxYfKFwwgz9tpus0CBZ7v' WHERE user_id = 'user_3FHKMNtUL6GnzCNNDUslW6TzzQZ';
