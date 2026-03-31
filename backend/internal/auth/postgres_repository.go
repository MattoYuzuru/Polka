package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrUserNotFound = errors.New("user not found")

type PostgresRepository struct {
	pool *pgxpool.Pool
}

type CreateUserParams struct {
	Nickname     string
	Email        string
	PasswordHash string
	DisplayName  string
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

func (repository *PostgresRepository) CreateUser(
	ctx context.Context,
	params CreateUserParams,
) (User, error) {
	var (
		existingNickname bool
		existingEmail    bool
	)

	if err := repository.pool.QueryRow(
		ctx,
		`SELECT EXISTS(SELECT 1 FROM users WHERE lower(nickname) = lower($1))`,
		strings.TrimSpace(params.Nickname),
	).Scan(&existingNickname); err != nil {
		return User{}, fmt.Errorf("check existing nickname: %w", err)
	}

	if existingNickname {
		return User{}, ErrNicknameAlreadyExists
	}

	if err := repository.pool.QueryRow(
		ctx,
		`SELECT EXISTS(SELECT 1 FROM users WHERE lower(email) = lower($1))`,
		strings.TrimSpace(params.Email),
	).Scan(&existingEmail); err != nil {
		return User{}, fmt.Errorf("check existing email: %w", err)
	}

	if existingEmail {
		return User{}, ErrEmailAlreadyExists
	}

	const query = `
		INSERT INTO users (
			id,
			nickname,
			email,
			password_hash,
			display_name
		) VALUES (
			gen_random_uuid(),
			$1,
			$2,
			$3,
			$4
		)
		RETURNING id::text, nickname, email, created_at;
	`

	var (
		user      User
		createdAt time.Time
	)

	if err := repository.pool.QueryRow(
		ctx,
		query,
		strings.TrimSpace(params.Nickname),
		strings.TrimSpace(strings.ToLower(params.Email)),
		params.PasswordHash,
		strings.TrimSpace(params.DisplayName),
	).Scan(&user.ID, &user.Nickname, &user.Email, &createdAt); err != nil {
		return User{}, fmt.Errorf("create user: %w", err)
	}

	user.CreatedAt = createdAt.Format(time.RFC3339)

	return user, nil
}
