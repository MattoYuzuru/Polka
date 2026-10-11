package books

import (
	"context"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/MattoYuzuru/Polka/backend/internal/database"
	"github.com/MattoYuzuru/Polka/backend/internal/recommendationlists"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func integrationPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	databaseURL := os.Getenv("POLKA_TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("POLKA_TEST_DATABASE_URL is required for isolated PostgreSQL integration tests")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	schema := fmt.Sprintf("polka_books_test_%d", time.Now().UnixNano())
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
	if err := database.Migrate(ctx, pool, false); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO users(id,nickname,email,password_hash,display_name) VALUES ('11111111-1111-1111-1111-111111111111','owner','owner@example.com','test','Owner'),('22222222-2222-2222-2222-222222222222','other','other@example.com','test','Other')`); err != nil {
		t.Fatal(err)
	}
	return pool
}

func TestPostgresRepositoryAtomicImportAndVisibility(t *testing.T) {
	pool := integrationPool(t)
	ctx := context.Background()
	repo := NewPostgresRepository(pool)
	const owner = "11111111-1111-1111-1111-111111111111"
	const other = "22222222-2222-2222-2222-222222222222"
	first := validInput()
	first.CoverPalette = []string{}
	first.CoverObjectKey = "covers/" + owner + "/image"
	invalid := first
	invalid.Year = -1
	if _, err := repo.Import(ctx, owner, []CreateBookInput{first, invalid}); err == nil {
		t.Fatal("invalid batch succeeded")
	}
	var count int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM books`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("failed import left %d books", count)
	}
	first.IsPublic = false
	second := first
	second.Title = "Public book"
	second.IsPublic = true
	second.CoverObjectKey = ""
	items, err := repo.Import(ctx, owner, []CreateBookInput{first, second})
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 2 {
		t.Fatalf("imported %d books", len(items))
	}
	privateID, publicID := items[0].ID, items[1].ID
	for _, viewer := range []string{"", other} {
		if _, err := repo.FindByID(ctx, privateID, viewer); !errors.Is(err, ErrNotFound) {
			t.Fatalf("private book visible to %q: %v", viewer, err)
		}
		if _, err := repo.FindCoverObjectKey(ctx, privateID, viewer); !errors.Is(err, ErrNotFound) {
			t.Fatalf("private cover visible to %q: %v", viewer, err)
		}
	}
	if key, err := repo.FindCoverObjectKey(ctx, privateID, owner); err != nil || key != first.CoverObjectKey {
		t.Fatalf("owner cover: %q %v", key, err)
	}
	if _, err := repo.FindByID(ctx, publicID, ""); err != nil {
		t.Fatalf("public book hidden: %v", err)
	}
	quoted, err := repo.CreateQuote(ctx, owner, privateID, "Owner note")
	if err != nil || quoted.CoverURL == "" {
		t.Fatalf("note mutation lost cover: %+v %v", quoted, err)
	}
	if err := repo.Delete(ctx, other, privateID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("outsider deleted book: %v", err)
	}
	if _, err := repo.SetVisibility(ctx, other, privateID, true); !errors.Is(err, ErrNotFound) {
		t.Fatalf("outsider changed visibility: %v", err)
	}
	if _, err := repo.CreateQuote(ctx, other, privateID, "Outsider note"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("outsider wrote quote: %v", err)
	}
	if err := repo.Reorder(ctx, other, ReorderBooksInput{BookIDs: []string{privateID, publicID}}); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("outsider reordered books: %v", err)
	}
	listRepo := recommendationlists.NewPostgresRepository(pool)
	list, err := listRepo.Create(ctx, owner, recommendationlists.CreateInput{Title: "Mixed visibility", IsPublic: true, BookIDs: []string{privateID, publicID}})
	if err != nil {
		t.Fatal(err)
	}
	guestList, err := listRepo.FindByID(ctx, list.ID, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(guestList.Books) != 1 || guestList.Books[0].ID != publicID || guestList.BooksCount != 1 {
		t.Fatalf("list leaks private book: %+v", guestList)
	}
	if len(list.Books) != 2 {
		t.Fatal("owner lost private list member")
	}
	if _, err := repo.SetVisibility(ctx, owner, privateID, true); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.FindCoverObjectKey(ctx, privateID, ""); err != nil {
		t.Fatalf("published cover hidden: %v", err)
	}
	if _, err := repo.SetVisibility(ctx, owner, privateID, false); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.FindCoverObjectKey(ctx, privateID, ""); !errors.Is(err, ErrNotFound) {
		t.Fatalf("revoked cover still public: %v", err)
	}
}
