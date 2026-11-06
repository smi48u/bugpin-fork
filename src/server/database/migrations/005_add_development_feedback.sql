BEGIN TRANSACTION;
ALTER TABLE reports ADD COLUMN type TEXT NOT NULL DEFAULT 'bug';
ALTER TABLE reports ADD COLUMN requested_change TEXT;
ALTER TABLE reports ADD COLUMN expected_result TEXT;
ALTER TABLE reports ADD COLUMN acceptance_criteria TEXT;
ALTER TABLE reports ADD COLUMN selected_element JSON;
COMMIT;
