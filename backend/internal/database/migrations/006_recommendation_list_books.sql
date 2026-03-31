CREATE TABLE IF NOT EXISTS recommendation_list_books (
    recommendation_list_id UUID NOT NULL REFERENCES recommendation_lists(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (recommendation_list_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_recommendation_list_books_list_position
    ON recommendation_list_books(recommendation_list_id, position, created_at);

CREATE INDEX IF NOT EXISTS idx_recommendation_list_books_book_id
    ON recommendation_list_books(book_id);
