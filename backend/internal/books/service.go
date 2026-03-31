package books

import (
	"context"
	"errors"
	"io"
	"strings"

	"github.com/MattoYuzuru/Polka/backend/internal/media"
)

type Quote struct {
	ID        string `json:"id"`
	Content   string `json:"content"`
	CreatedAt string `json:"createdAt"`
}

type Opinion struct {
	ID        string `json:"id"`
	Content   string `json:"content"`
	CreatedAt string `json:"createdAt"`
}

type BookDetails struct {
	ID             string    `json:"id"`
	OwnerID        string    `json:"ownerId"`
	OwnerNickname  string    `json:"ownerNickname"`
	Title          string    `json:"title"`
	Author         string    `json:"author"`
	Description    string    `json:"description"`
	Year           int       `json:"year"`
	Publisher      string    `json:"publisher"`
	AgeRating      string    `json:"ageRating"`
	Genre          string    `json:"genre"`
	IsPublic       bool      `json:"isPublic"`
	Status         string    `json:"status"`
	Rating         *int      `json:"rating"`
	OpinionPreview string    `json:"opinionPreview"`
	CoverPalette   []string  `json:"coverPalette"`
	CoverURL       string    `json:"coverUrl"`
	CoverObjectKey string    `json:"-"`
	ViewerCanEdit  bool      `json:"viewerCanEdit"`
	CreatedAt      string    `json:"createdAt"`
	Quotes         []Quote   `json:"quotes"`
	Opinions       []Opinion `json:"opinions"`
}

type CreateBookInput struct {
	Title          string   `json:"title"`
	Author         string   `json:"author"`
	Description    string   `json:"description"`
	Year           int      `json:"year"`
	Publisher      string   `json:"publisher"`
	AgeRating      string   `json:"ageRating"`
	Genre          string   `json:"genre"`
	IsPublic       bool     `json:"isPublic"`
	Status         string   `json:"status"`
	Rating         *int     `json:"rating"`
	Opinion        string   `json:"opinion"`
	Quote          string   `json:"quote"`
	CoverPalette   []string `json:"coverPalette"`
	CoverObjectKey string   `json:"coverObjectKey"`
	RemoveCover    bool     `json:"removeCover"`
}

type UpdateBookInput = CreateBookInput

type UpdateVisibilityInput struct {
	IsPublic bool `json:"isPublic"`
}

type ReorderBooksInput struct {
	BookIDs []string `json:"bookIds"`
}

type Repository interface {
	Create(ctx context.Context, ownerUserID string, input CreateBookInput) (BookDetails, error)
	FindByID(ctx context.Context, bookID string, viewerUserID string) (BookDetails, error)
	FindCoverObjectKey(ctx context.Context, bookID string) (string, error)
	FindOwnedCoverObjectKey(ctx context.Context, ownerUserID string, bookID string) (string, error)
	Update(ctx context.Context, ownerUserID string, bookID string, input UpdateBookInput) (BookDetails, error)
	SetVisibility(ctx context.Context, ownerUserID string, bookID string, isPublic bool) (BookDetails, error)
	Delete(ctx context.Context, ownerUserID string, bookID string) error
	Reorder(ctx context.Context, ownerUserID string, input ReorderBooksInput) error
}

type Service struct {
	repository Repository
	storage    media.Storage
}

type UploadedCover struct {
	ObjectKey string   `json:"coverObjectKey"`
	Palette   []string `json:"coverPalette"`
}

func NewService(repository Repository, storage media.Storage) *Service {
	return &Service{
		repository: repository,
		storage:    storage,
	}
}

func (service *Service) Create(
	ctx context.Context,
	ownerUserID string,
	input CreateBookInput,
) (BookDetails, error) {
	if strings.TrimSpace(ownerUserID) == "" {
		return BookDetails{}, ErrUnauthorized
	}

	if strings.TrimSpace(input.Title) == "" ||
		strings.TrimSpace(input.Author) == "" ||
		strings.TrimSpace(input.Genre) == "" ||
		strings.TrimSpace(input.Status) == "" ||
		input.Year < 0 {
		return BookDetails{}, ErrInvalidInput
	}

	if input.Rating != nil && (*input.Rating < 0 || *input.Rating > 10) {
		return BookDetails{}, ErrInvalidInput
	}

	input.CoverPalette = normalizeCoverPalette(input.CoverPalette)

	if strings.TrimSpace(input.Publisher) == "" {
		input.Publisher = "Не указано"
	}

	if strings.TrimSpace(input.AgeRating) == "" {
		input.AgeRating = "16+"
	}

	book, err := service.repository.Create(ctx, ownerUserID, input)
	if err != nil {
		service.cleanupCoverObject(ctx, input.CoverObjectKey)

		return BookDetails{}, err
	}

	return service.decorateBook(book), nil
}

func (service *Service) FindByID(
	ctx context.Context,
	bookID string,
	viewerUserID string,
) (BookDetails, error) {
	if strings.TrimSpace(bookID) == "" {
		return BookDetails{}, ErrNotFound
	}

	book, err := service.repository.FindByID(ctx, bookID, viewerUserID)
	if err != nil {
		return BookDetails{}, err
	}

	return service.decorateBook(book), nil
}

func (service *Service) Update(
	ctx context.Context,
	ownerUserID string,
	bookID string,
	input UpdateBookInput,
) (BookDetails, error) {
	if strings.TrimSpace(ownerUserID) == "" {
		return BookDetails{}, ErrUnauthorized
	}

	if strings.TrimSpace(bookID) == "" {
		return BookDetails{}, ErrNotFound
	}

	if strings.TrimSpace(input.Title) == "" ||
		strings.TrimSpace(input.Author) == "" ||
		strings.TrimSpace(input.Genre) == "" ||
		strings.TrimSpace(input.Status) == "" ||
		input.Year < 0 {
		return BookDetails{}, ErrInvalidInput
	}

	if input.Rating != nil && (*input.Rating < 0 || *input.Rating > 10) {
		return BookDetails{}, ErrInvalidInput
	}

	input.CoverPalette = normalizeCoverPalette(input.CoverPalette)

	if strings.TrimSpace(input.Publisher) == "" {
		input.Publisher = "Не указано"
	}

	if strings.TrimSpace(input.AgeRating) == "" {
		input.AgeRating = "16+"
	}

	previousCoverObjectKey, err := service.repository.FindOwnedCoverObjectKey(ctx, ownerUserID, bookID)
	if err != nil {
		return BookDetails{}, err
	}

	book, err := service.repository.Update(ctx, ownerUserID, bookID, input)
	if err != nil {
		if input.CoverObjectKey != "" && input.CoverObjectKey != previousCoverObjectKey {
			service.cleanupCoverObject(ctx, input.CoverObjectKey)
		}

		return BookDetails{}, err
	}

	if previousCoverObjectKey != "" && previousCoverObjectKey != book.CoverObjectKey {
		service.cleanupCoverObject(ctx, previousCoverObjectKey)
	}

	return service.decorateBook(book), nil
}

func (service *Service) SetVisibility(
	ctx context.Context,
	ownerUserID string,
	bookID string,
	isPublic bool,
) (BookDetails, error) {
	if strings.TrimSpace(ownerUserID) == "" {
		return BookDetails{}, ErrUnauthorized
	}

	if strings.TrimSpace(bookID) == "" {
		return BookDetails{}, ErrNotFound
	}

	book, err := service.repository.SetVisibility(ctx, ownerUserID, bookID, isPublic)
	if err != nil {
		return BookDetails{}, err
	}

	return service.decorateBook(book), nil
}

func (service *Service) Delete(
	ctx context.Context,
	ownerUserID string,
	bookID string,
) error {
	if strings.TrimSpace(ownerUserID) == "" {
		return ErrUnauthorized
	}

	if strings.TrimSpace(bookID) == "" {
		return ErrNotFound
	}

	coverObjectKey, err := service.repository.FindOwnedCoverObjectKey(ctx, ownerUserID, bookID)
	if err != nil {
		return err
	}

	if err := service.repository.Delete(ctx, ownerUserID, bookID); err != nil {
		return err
	}

	service.cleanupCoverObject(ctx, coverObjectKey)

	return nil
}

func (service *Service) Reorder(
	ctx context.Context,
	ownerUserID string,
	input ReorderBooksInput,
) error {
	if strings.TrimSpace(ownerUserID) == "" {
		return ErrUnauthorized
	}

	if len(input.BookIDs) == 0 {
		return ErrInvalidInput
	}

	seen := make(map[string]struct{}, len(input.BookIDs))
	normalizedBookIDs := make([]string, 0, len(input.BookIDs))

	for _, bookID := range input.BookIDs {
		trimmed := strings.TrimSpace(bookID)
		if trimmed == "" {
			return ErrInvalidInput
		}

		if _, exists := seen[trimmed]; exists {
			return ErrInvalidInput
		}

		seen[trimmed] = struct{}{}
		normalizedBookIDs = append(normalizedBookIDs, trimmed)
	}

	input.BookIDs = normalizedBookIDs

	return service.repository.Reorder(ctx, ownerUserID, input)
}

func (service *Service) UploadCover(
	ctx context.Context,
	ownerUserID string,
	fileName string,
	contentType string,
	reader io.Reader,
) (UploadedCover, error) {
	if strings.TrimSpace(ownerUserID) == "" {
		return UploadedCover{}, ErrUnauthorized
	}

	if service.storage == nil {
		return UploadedCover{}, media.ErrStorageDisabled
	}

	content, err := io.ReadAll(io.LimitReader(reader, 8<<20))
	if err != nil {
		return UploadedCover{}, err
	}

	if len(content) == 0 {
		return UploadedCover{}, ErrInvalidInput
	}

	uploadedCover, err := service.storage.UploadCover(ctx, media.UploadInput{
		FileName:    fileName,
		ContentType: contentType,
		Body:        content,
	})
	if err != nil {
		if errors.Is(err, media.ErrUnsupportedImage) {
			return UploadedCover{}, ErrInvalidInput
		}

		return UploadedCover{}, err
	}

	return UploadedCover{
		ObjectKey: uploadedCover.ObjectKey,
		Palette:   normalizeCoverPalette(uploadedCover.Palette),
	}, nil
}

func (service *Service) OpenCover(ctx context.Context, bookID string) (media.DownloadedObject, error) {
	if strings.TrimSpace(bookID) == "" {
		return media.DownloadedObject{}, ErrNotFound
	}

	if service.storage == nil {
		return media.DownloadedObject{}, media.ErrStorageDisabled
	}

	objectKey, err := service.repository.FindCoverObjectKey(ctx, bookID)
	if err != nil {
		return media.DownloadedObject{}, err
	}

	return service.storage.Open(ctx, objectKey)
}

func (service *Service) decorateBook(book BookDetails) BookDetails {
	book.CoverPalette = normalizeCoverPalette(book.CoverPalette)

	if strings.TrimSpace(book.CoverObjectKey) != "" {
		book.CoverURL = "/api/v1/books/" + book.ID + "/cover"
	}

	return book
}

func (service *Service) cleanupCoverObject(ctx context.Context, objectKey string) {
	if service.storage == nil || strings.TrimSpace(objectKey) == "" {
		return
	}

	_ = service.storage.Delete(ctx, objectKey)
}

func normalizeCoverPalette(colors []string) []string {
	normalized := make([]string, 0, len(colors))

	for _, color := range colors {
		trimmed := strings.TrimSpace(strings.ToLower(color))
		if !strings.HasPrefix(trimmed, "#") || len(trimmed) != 7 {
			continue
		}

		normalized = append(normalized, trimmed)
		if len(normalized) == 4 {
			break
		}
	}

	return normalized
}
