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
			cover_palette,
			rank_position
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
			ARRAY[]::TEXT[],
			COALESCE((SELECT MAX(rank_position) + 1 FROM books WHERE user_id = $1), 1)
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
			b.cover_palette,
			b.created_at
		FROM books b
		JOIN users u ON u.id = b.user_id
		WHERE b.id::text = $1
		  AND (b.is_public OR b.user_id::text = $2);
	`

	var (
		book       BookDetails
		rating     sql.NullInt64
		createdAt  time.Time
		colorStops []string
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

func buildOpinionPreview(opinion string) string {
	trimmed := strings.TrimSpace(opinion)
	runes := []rune(trimmed)
	if len(runes) <= 120 {
		return trimmed
	}

	return strings.TrimSpace(string(runes[:117])) + "..."
}
