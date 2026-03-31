package database

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`); err != nil {
		return fmt.Errorf("create schema_migrations table: %w", err)
	}

	entries, err := fs.ReadDir(migrationFiles, "migrations")
	if err != nil {
		return fmt.Errorf("read migration dir: %w", err)
	}

	fileNames := make([]string, 0, len(entries))

	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			fileNames = append(fileNames, entry.Name())
		}
	}

	sort.Strings(fileNames)

	for _, fileName := range fileNames {
		var alreadyApplied bool

		if err := pool.QueryRow(
			ctx,
			`SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename = $1)`,
			fileName,
		).Scan(&alreadyApplied); err != nil {
			return fmt.Errorf("check migration %s: %w", fileName, err)
		}

		if alreadyApplied {
			continue
		}

		sqlBytes, err := migrationFiles.ReadFile("migrations/" + fileName)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", fileName, err)
		}

		tx, err := pool.Begin(ctx)
		if err != nil {
			return fmt.Errorf("begin migration transaction %s: %w", fileName, err)
		}

		if _, err := tx.Exec(ctx, string(sqlBytes)); err != nil {
			_ = tx.Rollback(ctx)

			return fmt.Errorf("execute migration %s: %w", fileName, err)
		}

		if _, err := tx.Exec(
			ctx,
			`INSERT INTO schema_migrations (filename) VALUES ($1)`,
			fileName,
		); err != nil {
			_ = tx.Rollback(ctx)

			return fmt.Errorf("register migration %s: %w", fileName, err)
		}

		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("commit migration %s: %w", fileName, err)
		}
	}

	return nil
}
