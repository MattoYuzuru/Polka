package recommendationlists

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
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
	input CreateInput,
) (Details, error) {
	tx, err := repository.pool.Begin(ctx)
	if err != nil {
		return Details{}, fmt.Errorf("begin create recommendation list transaction: %w", err)
	}
	defer tx.Rollback(ctx)

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
		return Details{}, fmt.Errorf("count available books for recommendation list: %w", err)
	}

	if availableBooksCount != len(input.BookIDs) {
		return Details{}, ErrInvalidInput
	}

	var listID string

	if err := tx.QueryRow(
		ctx,
		`
			INSERT INTO recommendation_lists (
				id,
				user_id,
				title,
				description,
				books_count,
				is_public
			)
			VALUES (
				gen_random_uuid(),
				$1,
				$2,
				$3,
				$4,
				$5
			)
			RETURNING id::text;
		`,
		ownerUserID,
		input.Title,
		input.Description,
		len(input.BookIDs),
		input.IsPublic,
	).Scan(&listID); err != nil {
		return Details{}, fmt.Errorf("insert recommendation list: %w", err)
	}

	for index, bookID := range input.BookIDs {
		if _, err := tx.Exec(
			ctx,
			`
				INSERT INTO recommendation_list_books (
					recommendation_list_id,
					book_id,
					position
				)
				VALUES ($1, $2, $3);
			`,
			listID,
			bookID,
			index+1,
		); err != nil {
			return Details{}, fmt.Errorf("insert recommendation list book relation: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return Details{}, fmt.Errorf("commit create recommendation list transaction: %w", err)
	}

	return repository.FindByID(ctx, listID, ownerUserID)
}

func (repository *PostgresRepository) FindByID(
	ctx context.Context,
	listID string,
	viewerUserID string,
) (Details, error) {
	var (
		details   Details
		createdAt time.Time
		updatedAt time.Time
	)

	if err := repository.pool.QueryRow(
		ctx,
		`
			SELECT
				rl.id::text,
				rl.user_id::text,
				u.nickname,
				rl.title,
				rl.description,
				rl.is_public,
				rl.created_at,
				rl.updated_at
			FROM recommendation_lists rl
			JOIN users u ON u.id = rl.user_id
			WHERE rl.id::text = $1
			  AND (rl.is_public OR rl.user_id::text = $2)
			LIMIT 1;
		`,
		listID,
		viewerUserID,
	).Scan(
		&details.ID,
		&details.OwnerID,
		&details.OwnerNickname,
		&details.Title,
		&details.Description,
		&details.IsPublic,
		&createdAt,
		&updatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Details{}, ErrNotFound
		}

		return Details{}, fmt.Errorf("find recommendation list by id: %w", err)
	}

	details.ViewerCanEdit = viewerUserID != "" && viewerUserID == details.OwnerID
	details.CreatedAt = formatTime(createdAt)
	details.UpdatedAt = formatTime(updatedAt)

	books, err := repository.loadBooks(ctx, details.ID, details.ViewerCanEdit)
	if err != nil {
		return Details{}, err
	}

	details.Books = books
	details.BooksCount = len(books)

	return details, nil
}

func (repository *PostgresRepository) loadBooks(
	ctx context.Context,
	listID string,
	includePrivate bool,
) ([]RecommendationListBook, error) {
	rows, err := repository.pool.Query(
		ctx,
		`
			SELECT
				b.id::text,
				b.title,
				b.author,
				b.genre,
				b.status,
				b.rating,
				b.is_public,
				b.cover_palette
			FROM recommendation_list_books rlb
			JOIN books b ON b.id = rlb.book_id
			WHERE rlb.recommendation_list_id::text = $1
			  AND ($2 OR b.is_public)
			ORDER BY rlb.position ASC, rlb.created_at ASC;
		`,
		listID,
		includePrivate,
	)
	if err != nil {
		return nil, fmt.Errorf("query recommendation list books: %w", err)
	}
	defer rows.Close()

	books := make([]RecommendationListBook, 0)

	for rows.Next() {
		var (
			book       RecommendationListBook
			rating     sql.NullInt64
			colorStops []string
		)

		if err := rows.Scan(
			&book.ID,
			&book.Title,
			&book.Author,
			&book.Genre,
			&book.Status,
			&rating,
			&book.IsPublic,
			&colorStops,
		); err != nil {
			return nil, fmt.Errorf("scan recommendation list book row: %w", err)
		}

		if rating.Valid {
			ratingValue := int(rating.Int64)
			book.Rating = &ratingValue
		}

		book.CoverPalette = colorStops
		books = append(books, book)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate recommendation list books rows: %w", err)
	}

	return books, nil
}
