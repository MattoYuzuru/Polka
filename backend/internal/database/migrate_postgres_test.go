package database

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func migrationPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	databaseURL := os.Getenv("POLKA_TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("POLKA_TEST_DATABASE_URL is required for isolated PostgreSQL migration tests")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	schema := fmt.Sprintf("polka_migration_test_%d", time.Now().UnixNano())
	if _, err := admin.Exec(ctx, "CREATE SCHEMA "+pgx.Identifier{schema}.Sanitize()); err != nil {
		admin.Close()
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, err := admin.Exec(context.Background(), "DROP SCHEMA "+pgx.Identifier{schema}.Sanitize()+" CASCADE")
		if err != nil {
			t.Error(err)
		}
		admin.Close()
	})
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	cfg.ConnConfig.RuntimeParams["search_path"] = schema + ", public"
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func TestDemoProfileMigrationPostgres(t *testing.T) {
	ctx := context.Background()
	const demoID = "7cb8e370-1cb4-4794-b0e3-8cde1cd4ae8b"
	t.Run("production excludes demo data", func(t *testing.T) {
		pool := migrationPool(t)
		if err := Migrate(ctx, pool, false); err != nil {
			t.Fatal(err)
		}
		var users, seeds int
		if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&users); err != nil {
			t.Fatal(err)
		}
		if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM schema_migrations WHERE filename LIKE '%_seed_%'").Scan(&seeds); err != nil {
			t.Fatal(err)
		}
		if users != 0 || seeds != 0 {
			t.Fatalf("production seeded %d users and %d demo migrations", users, seeds)
		}
	})
	t.Run("development renames demo and preserves customized profiles", func(t *testing.T) {
		pool := migrationPool(t)
		if err := Migrate(ctx, pool, true); err != nil {
			t.Fatal(err)
		}
		var nickname, display string
		if err := pool.QueryRow(ctx, "SELECT nickname, display_name FROM users WHERE id=$1", demoID).Scan(&nickname, &display); err != nil {
			t.Fatal(err)
		}
		if nickname != "yuzuru" || display != "yuzuru" {
			t.Fatalf("fresh demo identity: %q / %q", nickname, display)
		}
		sql, err := migrationFiles.ReadFile("migrations/010_seed_demo_profile.sql")
		if err != nil {
			t.Fatal(err)
		}
		for _, test := range []struct {
			name, nickname, display string
		}{
			{"custom nickname", "personal-reader", "Matto Yuzuru"},
			{"custom display name", "mattoy", "My reading journal"},
		} {
			t.Run(test.name, func(t *testing.T) {
				if _, err := pool.Exec(ctx, "UPDATE users SET nickname=$2, display_name=$3 WHERE id=$1", demoID, test.nickname, test.display); err != nil {
					t.Fatal(err)
				}
				if _, err := pool.Exec(ctx, string(sql)); err != nil {
					t.Fatal(err)
				}
				if err := pool.QueryRow(ctx, "SELECT nickname, display_name FROM users WHERE id=$1", demoID).Scan(&nickname, &display); err != nil {
					t.Fatal(err)
				}
				if nickname != test.nickname || display != test.display {
					t.Fatalf("custom identity overwritten: %q / %q", nickname, display)
				}
			})
		}
		if _, err := pool.Exec(ctx, "UPDATE users SET nickname='mattoy', display_name='Matto Yuzuru' WHERE id=$1", demoID); err != nil {
			t.Fatal(err)
		}
		if _, err := pool.Exec(ctx, "INSERT INTO users (id,nickname,email,password_hash,display_name) VALUES ('11111111-1111-1111-1111-111111111111','YUZURU','other@example.com','test','Other')"); err != nil {
			t.Fatal(err)
		}
		if _, err := pool.Exec(ctx, string(sql)); err != nil {
			t.Fatalf("nickname collision broke migration: %v", err)
		}
		if err := pool.QueryRow(ctx, "SELECT nickname FROM users WHERE id=$1", demoID).Scan(&nickname); err != nil {
			t.Fatal(err)
		}
		if nickname != "mattoy" {
			t.Fatalf("occupied nickname assigned to demo: %q", nickname)
		}
	})
}
