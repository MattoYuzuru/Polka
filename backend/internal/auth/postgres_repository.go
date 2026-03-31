package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrUserNotFound = errors.New("user not found")

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{
		pool: pool,
	}
}

func (repository *PostgresRepository) FindByEmail(ctx context.Context, email string) (authRecord, error) {
	const query = `
		SELECT
			id::text,
			nickname,
			email,
			created_at,
			password_hash
		FROM users
		WHERE lower(email) = lower($1)
		LIMIT 1;
	`

	var (
		record    authRecord
		createdAt time.Time
	)

	err := repository.pool.QueryRow(ctx, query, email).Scan(
		&record.ID,
		&record.Nickname,
		&record.Email,
		&createdAt,
		&record.PasswordHash,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return authRecord{}, ErrUserNotFound
		}

		return authRecord{}, fmt.Errorf("find user by email: %w", err)
	}

	record.CreatedAt = createdAt.Format(time.RFC3339)

	return record, nil
}
