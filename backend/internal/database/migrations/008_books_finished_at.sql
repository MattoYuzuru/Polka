ALTER TABLE books
    ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ NULL;

UPDATE books
SET finished_at = created_at
WHERE status = 'Прочитал'
  AND finished_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_books_user_id_finished_at
    ON books(user_id, finished_at DESC);
