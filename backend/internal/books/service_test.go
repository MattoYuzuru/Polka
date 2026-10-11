package books

import (
	"context"
	"errors"
	"io"
	"strings"
	"testing"

	"github.com/MattoYuzuru/Polka/backend/internal/media"
)

type testRepository struct {
	Repository
	createCalls, updateCalls, importCalls int
	previousKey                           string
	inUse                                 bool
	imports                               []CreateBookInput
	viewer                                string
}

func (r *testRepository) Create(_ context.Context, _ string, input CreateBookInput) (BookDetails, error) {
	r.createCalls++
	return BookDetails{ID: "book", CoverObjectKey: input.CoverObjectKey}, nil
}
func (r *testRepository) Update(_ context.Context, _ string, _ string, input UpdateBookInput) (BookDetails, error) {
	r.updateCalls++
	return BookDetails{ID: "book", CoverObjectKey: input.CoverObjectKey}, nil
}
func (r *testRepository) FindOwnedCoverObjectKey(context.Context, string, string) (string, error) {
	return r.previousKey, nil
}
func (r *testRepository) IsCoverInUse(context.Context, string) (bool, error) { return r.inUse, nil }
func (r *testRepository) Import(_ context.Context, _ string, items []CreateBookInput) ([]BookDetails, error) {
	r.importCalls++
	r.imports = items
	return []BookDetails{{ID: "book"}}, nil
}
func (r *testRepository) FindCoverObjectKey(_ context.Context, _ string, viewer string) (string, error) {
	r.viewer = viewer
	if viewer != "owner" {
		return "", ErrNotFound
	}
	return "covers/owner/image", nil
}
func (r *testRepository) Delete(context.Context, string, string) error { return nil }

type testStorage struct {
	media.Storage
	uploads, opens int
	deleted        []string
}

func (s *testStorage) UploadCover(_ context.Context, input media.UploadInput) (media.UploadedObject, error) {
	s.uploads++
	return media.UploadedObject{ObjectKey: "covers/" + input.OwnerUserID + "/image"}, nil
}
func (s *testStorage) Delete(_ context.Context, key string) error {
	s.deleted = append(s.deleted, key)
	return nil
}
func (s *testStorage) Open(context.Context, string) (media.DownloadedObject, error) {
	s.opens++
	return media.DownloadedObject{Body: io.NopCloser(strings.NewReader("image"))}, nil
}
func validInput() CreateBookInput {
	return CreateBookInput{Title: "Book", Author: "Author", Genre: "Fiction", Status: "Прочитал"}
}
func TestCreateRejectsForeignCoverWithoutDeletingIt(t *testing.T) {
	repo := &testRepository{}
	storage := &testStorage{}
	input := validInput()
	input.CoverObjectKey = "covers/victim/image"
	_, err := NewService(repo, storage).Create(context.Background(), "owner", input)
	if !errors.Is(err, ErrInvalidInput) || repo.createCalls != 0 || len(storage.deleted) != 0 {
		t.Fatalf("error=%v creates=%d deleted=%v", err, repo.createCalls, storage.deleted)
	}
}
func TestUpdateRejectsForeignCoverAndAllowsUnchangedLegacyCover(t *testing.T) {
	repo := &testRepository{previousKey: "covers/legacy.png"}
	storage := &testStorage{}
	service := NewService(repo, storage)
	base := validInput()
	input := UpdateBookInput{Title: base.Title, Author: base.Author, Genre: base.Genre, Status: base.Status, CoverObjectKey: "covers/victim/image"}
	if _, err := service.Update(context.Background(), "owner", "book", input); !errors.Is(err, ErrInvalidInput) {
		t.Fatal(err)
	}
	if repo.updateCalls != 0 || len(storage.deleted) != 0 {
		t.Fatal("foreign key reached persistence or cleanup")
	}
	input.CoverObjectKey = repo.previousKey
	if _, err := service.Update(context.Background(), "owner", "book", input); err != nil {
		t.Fatal(err)
	}
}
func TestDeletePreservesCoverReferencedByAnotherBook(t *testing.T) {
	repo := &testRepository{previousKey: "covers/owner/shared", inUse: true}
	storage := &testStorage{}
	if err := NewService(repo, storage).Delete(context.Background(), "owner", "book"); err != nil {
		t.Fatal(err)
	}
	if len(storage.deleted) != 0 {
		t.Fatal("shared cover deleted")
	}
}
func TestImportValidatesWholeBatchBeforePersistence(t *testing.T) {
	repo := &testRepository{}
	service := NewService(repo, nil)
	invalid := validInput()
	invalid.Author = " "
	if _, err := service.Import(context.Background(), "owner", ImportBooksInput{Items: []CreateBookInput{validInput(), invalid}}); !errors.Is(err, ErrInvalidInput) {
		t.Fatal(err)
	}
	if repo.createCalls != 0 || repo.importCalls != 0 {
		t.Fatal("invalid batch partially persisted")
	}
	good := validInput()
	good.Title = " Book "
	result, err := service.Import(context.Background(), "owner", ImportBooksInput{Items: []CreateBookInput{good}})
	if err != nil || result.ImportedCount != 1 || repo.importCalls != 1 || repo.imports[0].Title != "Book" {
		t.Fatalf("result=%+v error=%v imports=%+v", result, err, repo.imports)
	}
}
func TestUploadRejectsOversizeWithoutTruncation(t *testing.T) {
	storage := &testStorage{}
	_, err := NewService(&testRepository{}, storage).UploadCover(context.Background(), "owner", "book.png", "image/png", strings.NewReader(strings.Repeat("x", (8<<20)+1)))
	if !errors.Is(err, ErrInvalidInput) || storage.uploads != 0 {
		t.Fatalf("error=%v uploads=%d", err, storage.uploads)
	}
}
func TestOpenCoverPassesViewerAndDoesNotOpenInvisibleCover(t *testing.T) {
	repo := &testRepository{}
	storage := &testStorage{}
	service := NewService(repo, storage)
	if _, err := service.OpenCover(context.Background(), "private-book", ""); !errors.Is(err, ErrNotFound) || storage.opens != 0 {
		t.Fatalf("error=%v opens=%d", err, storage.opens)
	}
	cover, err := service.OpenCover(context.Background(), "private-book", "owner")
	if err != nil {
		t.Fatal(err)
	}
	defer cover.Body.Close()
	if repo.viewer != "owner" || storage.opens != 1 {
		t.Fatal("viewer lost")
	}
}
