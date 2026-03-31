package profile

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
	return &PostgresRepository{
		pool: pool,
	}
}

func (repository *PostgresRepository) FindByNickname(
	ctx context.Context,
	nickname string,
	viewerUserID string,
) (PublicProfile, error) {
	const userQuery = `
		SELECT
			id::text,
			nickname,
			display_name,
			tagline,
			created_at,
			gradient_stops
		FROM users
		WHERE lower(nickname) = lower($1)
		LIMIT 1;
	`

	var (
		userID        string
		profileView   PublicProfile
		gradientStops []string
	)

	err := repository.pool.QueryRow(ctx, userQuery, strings.TrimSpace(nickname)).Scan(
		&userID,
		&profileView.User.Nickname,
		&profileView.User.Display,
		&profileView.User.Tagline,
		&profileView.User.CreatedAt,
		&gradientStops,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return PublicProfile{}, ErrNotFound
		}

		return PublicProfile{}, fmt.Errorf("find profile by nickname: %w", err)
	}

	includePrivate := viewerUserID != "" && viewerUserID == userID
	profileView.GradientStops = gradientStops
	profileView.Stats.MemberSinceLabel = formatMemberSince(profileView.User.CreatedAt)

	if err := repository.fillStats(ctx, &profileView, userID, includePrivate); err != nil {
		return PublicProfile{}, err
	}

	books, err := repository.loadBooks(ctx, userID, includePrivate)
	if err != nil {
		return PublicProfile{}, err
	}

	recommendationLists, err := repository.loadRecommendationLists(ctx, userID, includePrivate)
	if err != nil {
		return PublicProfile{}, err
	}

	profileView.Books = books
	profileView.RecommendationLists = recommendationLists

	return profileView, nil
}

func (repository *PostgresRepository) fillStats(
	ctx context.Context,
	profileView *PublicProfile,
	userID string,
	includePrivate bool,
) error {
	const statsQuery = `
		SELECT
			COUNT(*) FILTER (WHERE $2 OR is_public) AS books_count,
			COUNT(*) FILTER (WHERE ($2 OR is_public) AND status = 'Прочитал') AS completed_count
		FROM books
		WHERE user_id = $1;
	`

	if err := repository.pool.QueryRow(ctx, statsQuery, userID, includePrivate).Scan(
		&profileView.Stats.BooksCount,
		&profileView.Stats.CompletedCount,
	); err != nil {
		return fmt.Errorf("load profile stats from books: %w", err)
	}

	const listsCountQuery = `
		SELECT COUNT(*)
		FROM recommendation_lists
		WHERE user_id = $1
		  AND ($2 OR is_public);
	`

	if err := repository.pool.QueryRow(ctx, listsCountQuery, userID, includePrivate).Scan(
		&profileView.Stats.RecommendationListsCount,
	); err != nil {
		return fmt.Errorf("load recommendation lists count: %w", err)
	}

	return nil
}

func (repository *PostgresRepository) loadBooks(
	ctx context.Context,
	userID string,
	includePrivate bool,
) ([]Book, error) {
	const query = `
		SELECT
			id::text,
			title,
			author,
			description,
			year,
			publisher,
			age_rating,
			genre,
			status,
			rating,
			opinion_preview,
			cover_palette
		FROM books
		WHERE user_id = $1
		  AND ($2 OR is_public)
		ORDER BY rank_position ASC, created_at ASC;
	`

	rows, err := repository.pool.Query(ctx, query, userID, includePrivate)
	if err != nil {
		return nil, fmt.Errorf("query books: %w", err)
	}
	defer rows.Close()

	books := make([]Book, 0)

	for rows.Next() {
		var (
			book       Book
			rating     sql.NullInt64
			colorStops []string
		)

		if err := rows.Scan(
			&book.ID,
			&book.Title,
			&book.Author,
			&book.Description,
			&book.Year,
			&book.Publisher,
			&book.AgeRating,
			&book.Genre,
			&book.Status,
			&rating,
			&book.OpinionPreview,
			&colorStops,
		); err != nil {
			return nil, fmt.Errorf("scan book row: %w", err)
		}

		if rating.Valid {
			ratingValue := int(rating.Int64)
			book.Rating = &ratingValue
		}

		book.CoverPalette = colorStops
		books = append(books, book)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate books rows: %w", err)
	}

	return books, nil
}

func (repository *PostgresRepository) loadRecommendationLists(
	ctx context.Context,
	userID string,
	includePrivate bool,
) ([]RecommendationList, error) {
	const query = `
		SELECT
			id::text,
			title,
			description,
			books_count,
			is_public
		FROM recommendation_lists
		WHERE user_id = $1
		  AND ($2 OR is_public)
		ORDER BY updated_at DESC, created_at DESC;
	`

	rows, err := repository.pool.Query(ctx, query, userID, includePrivate)
	if err != nil {
		return nil, fmt.Errorf("query recommendation lists: %w", err)
	}
	defer rows.Close()

	recommendationLists := make([]RecommendationList, 0)

	for rows.Next() {
		var recommendationList RecommendationList

		if err := rows.Scan(
			&recommendationList.ID,
			&recommendationList.Title,
			&recommendationList.Description,
			&recommendationList.BooksCount,
			&recommendationList.IsPublic,
		); err != nil {
			return nil, fmt.Errorf("scan recommendation list row: %w", err)
		}

		recommendationLists = append(recommendationLists, recommendationList)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate recommendation list rows: %w", err)
	}

	return recommendationLists, nil
}

func formatMemberSince(createdAt time.Time) string {
	months := map[time.Month]string{
		time.January:   "января",
		time.February:  "февраля",
		time.March:     "марта",
		time.April:     "апреля",
		time.May:       "мая",
		time.June:      "июня",
		time.July:      "июля",
		time.August:    "августа",
		time.September: "сентября",
		time.October:   "октября",
		time.November:  "ноября",
		time.December:  "декабря",
	}

	return fmt.Sprintf("с %s %d", months[createdAt.Month()], createdAt.Year())
}
