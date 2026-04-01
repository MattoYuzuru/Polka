package books

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (repository *PostgresRepository) Create(
	ctx context.Context,
	ownerUserID string,
	input CreateBookInput,
) (BookDetails, error) {
	tx, err := repository.pool.Begin(ctx)
	if err != nil {
		return BookDetails{}, fmt.Errorf("begin create book transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	const createBookQuery = `
		INSERT INTO books (
			id,
			user_id,
			author,
			title,
			description,
			year,
			publisher,
			age_rating,
			genre,
			is_public,
			status,
			rating,
			opinion_preview,
			cover_object_key,
			cover_palette,
			rank_position,
			finished_at
		)
		VALUES (
			gen_random_uuid(),
			$1,
			$2,
			$3,
			$4,
			$5,
			$6,
			$7,
			$8,
			$9,
			$10,
			$11,
			$12,
			NULLIF($13, ''),
			$14,
			COALESCE((SELECT MAX(rank_position) + 1 FROM books WHERE user_id = $1), 1),
			CASE WHEN $10 = 'Прочитал' THEN NOW() ELSE NULL END
		)
		RETURNING id::text;
	`

	var bookID string

	if err := tx.QueryRow(
		ctx,
		createBookQuery,
		ownerUserID,
		strings.TrimSpace(input.Author),
		strings.TrimSpace(input.Title),
		strings.TrimSpace(input.Description),
		input.Year,
		strings.TrimSpace(input.Publisher),
		strings.TrimSpace(input.AgeRating),
		strings.TrimSpace(input.Genre),
		input.IsPublic,
		strings.TrimSpace(input.Status),
		input.Rating,
		buildOpinionPreview(input.Opinion),
		strings.TrimSpace(input.CoverObjectKey),
		input.CoverPalette,
	).Scan(&bookID); err != nil {
		return BookDetails{}, fmt.Errorf("insert book: %w", err)
	}

	if quote := strings.TrimSpace(input.Quote); quote != "" {
		if _, err := tx.Exec(
			ctx,
			`INSERT INTO quotes (id, book_id, content) VALUES (gen_random_uuid(), $1, $2)`,
			bookID,
			quote,
		); err != nil {
			return BookDetails{}, fmt.Errorf("insert quote: %w", err)
		}
	}

	if opinion := strings.TrimSpace(input.Opinion); opinion != "" {
		if _, err := tx.Exec(
			ctx,
			`INSERT INTO opinions (id, book_id, content) VALUES (gen_random_uuid(), $1, $2)`,
			bookID,
			opinion,
		); err != nil {
			return BookDetails{}, fmt.Errorf("insert opinion: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return BookDetails{}, fmt.Errorf("commit create book transaction: %w", err)
	}

	return repository.FindByID(ctx, bookID, ownerUserID)
}

func (repository *PostgresRepository) FindByID(
	ctx context.Context,
	bookID string,
	viewerUserID string,
) (BookDetails, error) {
	const query = `
		SELECT
			b.id::text,
			b.user_id::text,
			u.nickname,
			b.title,
			b.author,
			b.description,
			b.year,
			b.publisher,
			b.age_rating,
			b.genre,
			b.is_public,
			b.status,
			b.rating,
			b.opinion_preview,
			b.cover_object_key,
			b.cover_palette,
			b.created_at
		FROM books b
		JOIN users u ON u.id = b.user_id
		WHERE b.id::text = $1
		  AND (b.is_public OR b.user_id::text = $2);
	`

	var (
		book           BookDetails
		rating         sql.NullInt64
		createdAt      time.Time
		coverObjectKey sql.NullString
		colorStops     []string
	)

	err := repository.pool.QueryRow(ctx, query, bookID, viewerUserID).Scan(
		&book.ID,
		&book.OwnerID,
		&book.OwnerNickname,
		&book.Title,
		&book.Author,
		&book.Description,
		&book.Year,
		&book.Publisher,
		&book.AgeRating,
		&book.Genre,
		&book.IsPublic,
		&book.Status,
		&rating,
		&book.OpinionPreview,
		&coverObjectKey,
		&colorStops,
		&createdAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return BookDetails{}, ErrNotFound
		}

		return BookDetails{}, fmt.Errorf("find book by id: %w", err)
	}

	if rating.Valid {
		ratingValue := int(rating.Int64)
		book.Rating = &ratingValue
	}

	book.ViewerCanEdit = viewerUserID != "" && viewerUserID == book.OwnerID
	book.CoverPalette = colorStops
	if coverObjectKey.Valid && strings.TrimSpace(coverObjectKey.String) != "" {
		book.CoverObjectKey = coverObjectKey.String
	}
	book.CreatedAt = createdAt.Format(time.RFC3339)

	quotes, err := repository.loadQuotes(ctx, book.ID)
	if err != nil {
		return BookDetails{}, err
	}

	opinions, err := repository.loadOpinions(ctx, book.ID)
	if err != nil {
		return BookDetails{}, err
	}

	book.Quotes = quotes
	book.Opinions = opinions

	return book, nil
}

func (repository *PostgresRepository) Update(
	ctx context.Context,
	ownerUserID string,
	bookID string,
	input UpdateBookInput,
) (BookDetails, error) {
	tx, err := repository.pool.Begin(ctx)
	if err != nil {
		return BookDetails{}, fmt.Errorf("begin update book transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	const updateBookQuery = `
		UPDATE books
		SET
			author = $3,
			title = $4,
			description = $5,
			year = $6,
			publisher = $7,
			age_rating = $8,
			genre = $9,
			is_public = $10,
			status = $11,
			rating = $12,
			opinion_preview = CASE
				WHEN $13 THEN $14
				ELSE opinion_preview
			END,
			cover_object_key = CASE
				WHEN $15 THEN NULL
				WHEN NULLIF($16, '') IS NOT NULL THEN $16
				ELSE cover_object_key
			END,
			cover_palette = CASE
				WHEN $15 THEN ARRAY[]::TEXT[]
				WHEN NULLIF($16, '') IS NOT NULL THEN $17
				ELSE cover_palette
			END,
			finished_at = CASE
				WHEN $11 = 'Прочитал' THEN COALESCE(finished_at, NOW())
				ELSE NULL
			END
		WHERE id::text = $1
		  AND user_id::text = $2
		RETURNING id::text;
	`

	var updatedID string
	updateOpinionPreview := input.Opinion != nil
	opinionPreview := ""
	if input.Opinion != nil {
		opinionPreview = buildOpinionPreview(strings.TrimSpace(*input.Opinion))
	}

	if err := tx.QueryRow(
		ctx,
		updateBookQuery,
		bookID,
		ownerUserID,
		strings.TrimSpace(input.Author),
		strings.TrimSpace(input.Title),
		strings.TrimSpace(input.Description),
		input.Year,
		strings.TrimSpace(input.Publisher),
		strings.TrimSpace(input.AgeRating),
		strings.TrimSpace(input.Genre),
		input.IsPublic,
		strings.TrimSpace(input.Status),
		input.Rating,
		updateOpinionPreview,
		opinionPreview,
		input.RemoveCover,
		strings.TrimSpace(input.CoverObjectKey),
		input.CoverPalette,
	).Scan(&updatedID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return BookDetails{}, ErrNotFound
		}

		return BookDetails{}, fmt.Errorf("update book: %w", err)
	}

	if input.Quote != nil {
		if _, err := tx.Exec(ctx, `DELETE FROM quotes WHERE book_id::text = $1`, updatedID); err != nil {
			return BookDetails{}, fmt.Errorf("delete old quotes: %w", err)
		}

		if quote := strings.TrimSpace(*input.Quote); quote != "" {
			if _, err := tx.Exec(
				ctx,
				`INSERT INTO quotes (id, book_id, content) VALUES (gen_random_uuid(), $1, $2)`,
				updatedID,
				quote,
			); err != nil {
				return BookDetails{}, fmt.Errorf("insert updated quote: %w", err)
			}
		}
	}

	if input.Opinion != nil {
		if _, err := tx.Exec(ctx, `DELETE FROM opinions WHERE book_id::text = $1`, updatedID); err != nil {
			return BookDetails{}, fmt.Errorf("delete old opinions: %w", err)
		}

		if opinion := strings.TrimSpace(*input.Opinion); opinion != "" {
			if _, err := tx.Exec(
				ctx,
				`INSERT INTO opinions (id, book_id, content) VALUES (gen_random_uuid(), $1, $2)`,
				updatedID,
				opinion,
			); err != nil {
				return BookDetails{}, fmt.Errorf("insert updated opinion: %w", err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return BookDetails{}, fmt.Errorf("commit update book transaction: %w", err)
	}

	return repository.FindByID(ctx, updatedID, ownerUserID)
}

func (repository *PostgresRepository) CreateQuote(
	ctx context.Context,
	ownerUserID string,
	bookID string,
	content string,
) (BookDetails, error) {
	var updatedID string

	err := repository.pool.QueryRow(
		ctx,
		`
			INSERT INTO quotes (id, book_id, content)
			SELECT gen_random_uuid(), b.id, $3
			FROM books b
			WHERE b.id::text = $1
			  AND b.user_id::text = $2
			RETURNING book_id::text;
		`,
		bookID,
		ownerUserID,
		content,
	).Scan(&updatedID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return BookDetails{}, ErrNotFound
		}

		return BookDetails{}, fmt.Errorf("create quote: %w", err)
	}

	return repository.FindByID(ctx, updatedID, ownerUserID)
}

func (repository *PostgresRepository) UpdateQuote(
	ctx context.Context,
	ownerUserID string,
	bookID string,
	quoteID string,
	content string,
) (BookDetails, error) {
	var updatedID string

	err := repository.pool.QueryRow(
		ctx,
		`
			UPDATE quotes q
			SET content = $4
			FROM books b
			WHERE q.id::text = $2
			  AND q.book_id = b.id
			  AND b.id::text = $1
			  AND b.user_id::text = $3
			RETURNING b.id::text;
		`,
		bookID,
		quoteID,
		ownerUserID,
		content,
	).Scan(&updatedID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return BookDetails{}, ErrNotFound
		}

		return BookDetails{}, fmt.Errorf("update quote: %w", err)
	}

	return repository.FindByID(ctx, updatedID, ownerUserID)
}

func (repository *PostgresRepository) DeleteQuote(
	ctx context.Context,
	ownerUserID string,
	bookID string,
	quoteID string,
) (BookDetails, error) {
	var updatedID string

	err := repository.pool.QueryRow(
		ctx,
		`
			DELETE FROM quotes q
			USING books b
			WHERE q.id::text = $2
			  AND q.book_id = b.id
			  AND b.id::text = $1
			  AND b.user_id::text = $3
			RETURNING b.id::text;
		`,
		bookID,
		quoteID,
		ownerUserID,
	).Scan(&updatedID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return BookDetails{}, ErrNotFound
		}

		return BookDetails{}, fmt.Errorf("delete quote: %w", err)
	}

	return repository.FindByID(ctx, updatedID, ownerUserID)
}

func (repository *PostgresRepository) CreateOpinion(
	ctx context.Context,
	ownerUserID string,
	bookID string,
	content string,
) (BookDetails, error) {
	tx, err := repository.pool.Begin(ctx)
	if err != nil {
		return BookDetails{}, fmt.Errorf("begin create opinion transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var updatedID string

	if err := tx.QueryRow(
		ctx,
		`
			INSERT INTO opinions (id, book_id, content)
			SELECT gen_random_uuid(), b.id, $3
			FROM books b
			WHERE b.id::text = $1
			  AND b.user_id::text = $2
			RETURNING book_id::text;
		`,
		bookID,
		ownerUserID,
		content,
	).Scan(&updatedID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return BookDetails{}, ErrNotFound
		}

		return BookDetails{}, fmt.Errorf("create opinion: %w", err)
	}

	if err := repository.syncOpinionPreviewTx(ctx, tx, updatedID); err != nil {
		return BookDetails{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return BookDetails{}, fmt.Errorf("commit create opinion transaction: %w", err)
	}

	return repository.FindByID(ctx, updatedID, ownerUserID)
}

func (repository *PostgresRepository) UpdateOpinion(
	ctx context.Context,
	ownerUserID string,
	bookID string,
	opinionID string,
	content string,
) (BookDetails, error) {
	tx, err := repository.pool.Begin(ctx)
	if err != nil {
		return BookDetails{}, fmt.Errorf("begin update opinion transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var updatedID string

	if err := tx.QueryRow(
		ctx,
		`
			UPDATE opinions o
			SET content = $4
			FROM books b
			WHERE o.id::text = $2
			  AND o.book_id = b.id
			  AND b.id::text = $1
			  AND b.user_id::text = $3
			RETURNING b.id::text;
		`,
		bookID,
		opinionID,
		ownerUserID,
		content,
	).Scan(&updatedID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return BookDetails{}, ErrNotFound
		}

		return BookDetails{}, fmt.Errorf("update opinion: %w", err)
	}

	if err := repository.syncOpinionPreviewTx(ctx, tx, updatedID); err != nil {
		return BookDetails{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return BookDetails{}, fmt.Errorf("commit update opinion transaction: %w", err)
	}

	return repository.FindByID(ctx, updatedID, ownerUserID)
}

func (repository *PostgresRepository) DeleteOpinion(
	ctx context.Context,
	ownerUserID string,
	bookID string,
	opinionID string,
) (BookDetails, error) {
	tx, err := repository.pool.Begin(ctx)
	if err != nil {
		return BookDetails{}, fmt.Errorf("begin delete opinion transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var updatedID string

	if err := tx.QueryRow(
		ctx,
		`
			DELETE FROM opinions o
			USING books b
			WHERE o.id::text = $2
			  AND o.book_id = b.id
			  AND b.id::text = $1
			  AND b.user_id::text = $3
			RETURNING b.id::text;
		`,
		bookID,
		opinionID,
		ownerUserID,
	).Scan(&updatedID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return BookDetails{}, ErrNotFound
		}

		return BookDetails{}, fmt.Errorf("delete opinion: %w", err)
	}

	if err := repository.syncOpinionPreviewTx(ctx, tx, updatedID); err != nil {
		return BookDetails{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return BookDetails{}, fmt.Errorf("commit delete opinion transaction: %w", err)
	}

	return repository.FindByID(ctx, updatedID, ownerUserID)
}

func (repository *PostgresRepository) FindCoverObjectKey(
	ctx context.Context,
	bookID string,
) (string, error) {
	var objectKey sql.NullString

	err := repository.pool.QueryRow(
		ctx,
		`SELECT cover_object_key FROM books WHERE id::text = $1 LIMIT 1`,
		bookID,
	).Scan(&objectKey)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}

		return "", fmt.Errorf("find book cover object key: %w", err)
	}

	if !objectKey.Valid || strings.TrimSpace(objectKey.String) == "" {
		return "", ErrNotFound
	}

	return objectKey.String, nil
}

func (repository *PostgresRepository) FindOwnedCoverObjectKey(
	ctx context.Context,
	ownerUserID string,
	bookID string,
) (string, error) {
	var objectKey sql.NullString

	err := repository.pool.QueryRow(
		ctx,
		`
			SELECT cover_object_key
			FROM books
			WHERE id::text = $1
			  AND user_id::text = $2
			LIMIT 1;
		`,
		bookID,
		ownerUserID,
	).Scan(&objectKey)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}

		return "", fmt.Errorf("find owner book cover object key: %w", err)
	}

	if !objectKey.Valid {
		return "", nil
	}

	return objectKey.String, nil
}

func (repository *PostgresRepository) SetVisibility(
	ctx context.Context,
	ownerUserID string,
	bookID string,
	isPublic bool,
) (BookDetails, error) {
	var updatedID string

	if err := repository.pool.QueryRow(
		ctx,
		`
			UPDATE books
			SET is_public = $3
			WHERE id::text = $1
			  AND user_id::text = $2
			RETURNING id::text;
		`,
		bookID,
		ownerUserID,
		isPublic,
	).Scan(&updatedID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return BookDetails{}, ErrNotFound
		}

		return BookDetails{}, fmt.Errorf("set book visibility: %w", err)
	}

	return repository.FindByID(ctx, updatedID, ownerUserID)
}

func (repository *PostgresRepository) Delete(
	ctx context.Context,
	ownerUserID string,
	bookID string,
) error {
	commandTag, err := repository.pool.Exec(
		ctx,
		`DELETE FROM books WHERE id::text = $1 AND user_id::text = $2`,
		bookID,
		ownerUserID,
	)
	if err != nil {
		return fmt.Errorf("delete book: %w", err)
	}

	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (repository *PostgresRepository) Reorder(
	ctx context.Context,
	ownerUserID string,
	input ReorderBooksInput,
) error {
	tx, err := repository.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin reorder books transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var booksCount int

	if err := tx.QueryRow(
		ctx,
		`SELECT COUNT(*) FROM books WHERE user_id::text = $1`,
		ownerUserID,
	).Scan(&booksCount); err != nil {
		return fmt.Errorf("count owner books for reorder: %w", err)
	}

	if booksCount != len(input.BookIDs) {
		return ErrInvalidInput
	}

	var availableBooksCount int

	if err := tx.QueryRow(
		ctx,
		`
			SELECT COUNT(*)
			FROM books
			WHERE user_id::text = $1
			  AND id::text = ANY($2);
		`,
		ownerUserID,
		input.BookIDs,
	).Scan(&availableBooksCount); err != nil {
		return fmt.Errorf("count provided books for reorder: %w", err)
	}

	if availableBooksCount != len(input.BookIDs) {
		return ErrInvalidInput
	}

	for index, bookID := range input.BookIDs {
		if _, err := tx.Exec(
			ctx,
			`
				UPDATE books
				SET rank_position = $3
				WHERE id::text = $1
				  AND user_id::text = $2;
			`,
			bookID,
			ownerUserID,
			index+1,
		); err != nil {
			return fmt.Errorf("update book rank position: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit reorder books transaction: %w", err)
	}

	return nil
}

func (repository *PostgresRepository) loadQuotes(ctx context.Context, bookID string) ([]Quote, error) {
	rows, err := repository.pool.Query(
		ctx,
		`SELECT id::text, content, created_at FROM quotes WHERE book_id::text = $1 ORDER BY created_at DESC`,
		bookID,
	)
	if err != nil {
		return nil, fmt.Errorf("query quotes: %w", err)
	}
	defer rows.Close()

	quotes := make([]Quote, 0)

	for rows.Next() {
		var (
			quote     Quote
			createdAt time.Time
		)

		if err := rows.Scan(&quote.ID, &quote.Content, &createdAt); err != nil {
			return nil, fmt.Errorf("scan quote row: %w", err)
		}

		quote.CreatedAt = createdAt.Format(time.RFC3339)
		quotes = append(quotes, quote)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate quotes rows: %w", err)
	}

	return quotes, nil
}

func (repository *PostgresRepository) loadOpinions(ctx context.Context, bookID string) ([]Opinion, error) {
	rows, err := repository.pool.Query(
		ctx,
		`SELECT id::text, content, created_at FROM opinions WHERE book_id::text = $1 ORDER BY created_at DESC`,
		bookID,
	)
	if err != nil {
		return nil, fmt.Errorf("query opinions: %w", err)
	}
	defer rows.Close()

	opinions := make([]Opinion, 0)

	for rows.Next() {
		var (
			opinion   Opinion
			createdAt time.Time
		)

		if err := rows.Scan(&opinion.ID, &opinion.Content, &createdAt); err != nil {
			return nil, fmt.Errorf("scan opinion row: %w", err)
		}

		opinion.CreatedAt = createdAt.Format(time.RFC3339)
		opinions = append(opinions, opinion)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate opinions rows: %w", err)
	}

	return opinions, nil
}

func (repository *PostgresRepository) syncOpinionPreviewTx(
	ctx context.Context,
	tx pgx.Tx,
	bookID string,
) error {
	var latestOpinion string

	if err := tx.QueryRow(
		ctx,
		`
			SELECT COALESCE((
				SELECT content
				FROM opinions
				WHERE book_id::text = $1
				ORDER BY created_at DESC
				LIMIT 1
			), '');
		`,
		bookID,
	).Scan(&latestOpinion); err != nil {
		return fmt.Errorf("load latest opinion for preview: %w", err)
	}

	if _, err := tx.Exec(
		ctx,
		`UPDATE books SET opinion_preview = $2 WHERE id::text = $1`,
		bookID,
		buildOpinionPreview(latestOpinion),
	); err != nil {
		return fmt.Errorf("sync opinion preview: %w", err)
	}

	return nil
}

func buildOpinionPreview(opinion string) string {
	trimmed := strings.TrimSpace(opinion)
	runes := []rune(trimmed)
	if len(runes) <= 120 {
		return trimmed
	}

	return strings.TrimSpace(string(runes[:117])) + "..."
}
