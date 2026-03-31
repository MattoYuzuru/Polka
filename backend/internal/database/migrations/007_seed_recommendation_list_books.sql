INSERT INTO recommendation_list_books (recommendation_list_id, book_id, position, created_at) VALUES
(
    'a821ff32-c3f8-4b25-8965-4f45a1bff001',
    'f691ff32-c3f8-4b25-8965-4f45a1bff001',
    1,
    '2024-11-10T09:00:00Z'
),
(
    'a821ff32-c3f8-4b25-8965-4f45a1bff001',
    'f691ff32-c3f8-4b25-8965-4f45a1bff002',
    2,
    '2024-11-10T09:01:00Z'
),
(
    'a821ff32-c3f8-4b25-8965-4f45a1bff001',
    'f691ff32-c3f8-4b25-8965-4f45a1bff003',
    3,
    '2024-11-10T09:02:00Z'
),
(
    'a821ff32-c3f8-4b25-8965-4f45a1bff002',
    'f691ff32-c3f8-4b25-8965-4f45a1bff002',
    1,
    '2024-12-01T09:00:00Z'
),
(
    'a821ff32-c3f8-4b25-8965-4f45a1bff002',
    'f691ff32-c3f8-4b25-8965-4f45a1bff003',
    2,
    '2024-12-01T09:01:00Z'
),
(
    'a821ff32-c3f8-4b25-8965-4f45a1bff003',
    'f691ff32-c3f8-4b25-8965-4f45a1bff001',
    1,
    '2024-12-15T09:00:00Z'
),
(
    'a821ff32-c3f8-4b25-8965-4f45a1bff003',
    'f691ff32-c3f8-4b25-8965-4f45a1bff002',
    2,
    '2024-12-15T09:01:00Z'
),
(
    'a821ff32-c3f8-4b25-8965-4f45a1bff003',
    'f691ff32-c3f8-4b25-8965-4f45a1bff004',
    3,
    '2024-12-15T09:02:00Z'
) ON CONFLICT (recommendation_list_id, book_id) DO NOTHING;

UPDATE recommendation_lists rl
SET books_count = (
    SELECT COUNT(*)
    FROM recommendation_list_books rlb
    WHERE rlb.recommendation_list_id = rl.id
);
