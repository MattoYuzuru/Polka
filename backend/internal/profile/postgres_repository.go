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

	if err := repository.fillAnalytics(ctx, &profileView, userID, includePrivate); err != nil {
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

func (repository *PostgresRepository) GetEditableByUserID(
	ctx context.Context,
	userID string,
) (EditableProfile, error) {
	const query = `
		SELECT
			id::text,
			nickname,
			email,
			display_name,
			tagline,
			gradient_stops,
			created_at
		FROM users
		WHERE id = $1
		LIMIT 1;
	`

	var editableProfile EditableProfile

	err := repository.pool.QueryRow(ctx, query, userID).Scan(
		&editableProfile.UserID,
		&editableProfile.Nickname,
		&editableProfile.Email,
		&editableProfile.DisplayName,
		&editableProfile.Tagline,
		&editableProfile.GradientStops,
		&editableProfile.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return EditableProfile{}, ErrNotFound
		}

		return EditableProfile{}, fmt.Errorf("get editable profile by user id: %w", err)
	}

	return editableProfile, nil
}

func (repository *PostgresRepository) UpdateByUserID(
	ctx context.Context,
	userID string,
	input UpdateProfileInput,
) (EditableProfile, error) {
	nickname := strings.TrimSpace(input.Nickname)
	displayName := strings.TrimSpace(input.DisplayName)
	tagline := strings.TrimSpace(input.Tagline)

	var existingNickname bool

	if err := repository.pool.QueryRow(
		ctx,
		`SELECT EXISTS(SELECT 1 FROM users WHERE lower(nickname) = lower($1) AND id <> $2)`,
		nickname,
		userID,
	).Scan(&existingNickname); err != nil {
		return EditableProfile{}, fmt.Errorf("check conflicting nickname: %w", err)
	}

	if existingNickname {
		return EditableProfile{}, ErrNicknameAlreadyExists
	}

	const query = `
		UPDATE users
		SET
			nickname = $2,
			display_name = $3,
			tagline = $4,
			updated_at = NOW()
		WHERE id = $1
		RETURNING
			id::text,
			nickname,
			email,
			display_name,
			tagline,
			gradient_stops,
			created_at;
	`

	var editableProfile EditableProfile

	err := repository.pool.QueryRow(ctx, query, userID, nickname, displayName, tagline).Scan(
		&editableProfile.UserID,
		&editableProfile.Nickname,
		&editableProfile.Email,
		&editableProfile.DisplayName,
		&editableProfile.Tagline,
		&editableProfile.GradientStops,
		&editableProfile.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return EditableProfile{}, ErrNotFound
		}

		return EditableProfile{}, fmt.Errorf("update profile by user id: %w", err)
	}

	return editableProfile, nil
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
			rank_position,
			title,
			author,
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
			book           Book
			rating         sql.NullInt64
			coverObjectKey sql.NullString
			colorStops     []string
		)

		if err := rows.Scan(
			&book.ID,
			&book.RankPosition,
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
		); err != nil {
			return nil, fmt.Errorf("scan book row: %w", err)
		}

		if rating.Valid {
			ratingValue := int(rating.Int64)
			book.Rating = &ratingValue
		}

		book.CoverPalette = colorStops
		if coverObjectKey.Valid && strings.TrimSpace(coverObjectKey.String) != "" {
			book.CoverObjectKey = coverObjectKey.String
			book.CoverURL = "/api/v1/books/" + book.ID + "/cover"
		}
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
			rl.id::text,
			rl.title,
			rl.description,
			(
				SELECT COUNT(*)
				FROM recommendation_list_books rlb
				JOIN books b ON b.id = rlb.book_id
				WHERE rlb.recommendation_list_id = rl.id
				  AND ($2 OR b.is_public)
			) AS books_count,
			rl.is_public
		FROM recommendation_lists rl
		WHERE rl.user_id = $1
		  AND ($2 OR is_public)
		ORDER BY rl.updated_at DESC, rl.created_at DESC;
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

func (repository *PostgresRepository) fillAnalytics(
	ctx context.Context,
	profileView *PublicProfile,
	userID string,
	includePrivate bool,
) error {
	const readingWindowsQuery = `
		SELECT
			COUNT(*) FILTER (
				WHERE ($2 OR is_public)
				  AND status = 'Прочитал'
				  AND finished_at >= NOW() - INTERVAL '30 days'
			) AS completed_last_30_days,
			COUNT(*) FILTER (
				WHERE ($2 OR is_public)
				  AND status = 'Прочитал'
				  AND finished_at >= NOW() - INTERVAL '365 days'
			) AS completed_last_365_days,
			COALESCE(ROUND(AVG(rating) FILTER (WHERE ($2 OR is_public) AND rating IS NOT NULL), 1), 0)::float8 AS average_rating,
			COUNT(*) FILTER (WHERE is_public) AS public_books_count,
			COUNT(*) FILTER (WHERE $2 AND NOT is_public) AS private_books_count
		FROM books
		WHERE user_id = $1;
	`

	if err := repository.pool.QueryRow(ctx, readingWindowsQuery, userID, includePrivate).Scan(
		&profileView.Analytics.ReadingWindows.CompletedLast30Days,
		&profileView.Analytics.ReadingWindows.CompletedLast365Days,
		&profileView.Analytics.ReadingWindows.AverageRating,
		&profileView.Analytics.ReadingWindows.PublicBooksCount,
		&profileView.Analytics.ReadingWindows.PrivateBooksCount,
	); err != nil {
		return fmt.Errorf("load reading windows analytics: %w", err)
	}

	statusBreakdown, err := repository.loadStatusBreakdown(ctx, userID, includePrivate)
	if err != nil {
		return err
	}

	genreBreakdown, err := repository.loadGenreBreakdown(ctx, userID, includePrivate)
	if err != nil {
		return err
	}

	profileView.Analytics.StatusBreakdown = statusBreakdown
	profileView.Analytics.GenreBreakdown = genreBreakdown

	return nil
}

func (repository *PostgresRepository) loadStatusBreakdown(
	ctx context.Context,
	userID string,
	includePrivate bool,
) ([]StatusBreakdownItem, error) {
	rows, err := repository.pool.Query(
		ctx,
		`
			SELECT status, COUNT(*) AS books_count
			FROM books
			WHERE user_id = $1
			  AND ($2 OR is_public)
			GROUP BY status
			ORDER BY books_count DESC, status ASC;
		`,
		userID,
		includePrivate,
	)
	if err != nil {
		return nil, fmt.Errorf("query status breakdown: %w", err)
	}
	defer rows.Close()

	statusBreakdown := make([]StatusBreakdownItem, 0)

	for rows.Next() {
		var item StatusBreakdownItem

		if err := rows.Scan(&item.Status, &item.Count); err != nil {
			return nil, fmt.Errorf("scan status breakdown row: %w", err)
		}

		statusBreakdown = append(statusBreakdown, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate status breakdown rows: %w", err)
	}

	return statusBreakdown, nil
}

func (repository *PostgresRepository) loadGenreBreakdown(
	ctx context.Context,
	userID string,
	includePrivate bool,
) ([]GenreBreakdownItem, error) {
	rows, err := repository.pool.Query(
		ctx,
		`
			SELECT genre, COUNT(*) AS books_count
			FROM books
			WHERE user_id = $1
			  AND ($2 OR is_public)
			GROUP BY genre
			ORDER BY books_count DESC, genre ASC
			LIMIT 4;
		`,
		userID,
		includePrivate,
	)
	if err != nil {
		return nil, fmt.Errorf("query genre breakdown: %w", err)
	}
	defer rows.Close()

	genreBreakdown := make([]GenreBreakdownItem, 0)

	for rows.Next() {
		var item GenreBreakdownItem

		if err := rows.Scan(&item.Genre, &item.Count); err != nil {
			return nil, fmt.Errorf("scan genre breakdown row: %w", err)
		}

		genreBreakdown = append(genreBreakdown, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate genre breakdown rows: %w", err)
	}

	return genreBreakdown, nil
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
