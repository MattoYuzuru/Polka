package recommendationlists

import (
	"context"
	"strings"
	"time"
)

type RecommendationListBook struct {
	ID           string   `json:"id"`
	Title        string   `json:"title"`
	Author       string   `json:"author"`
	Genre        string   `json:"genre"`
	Status       string   `json:"status"`
	Rating       *int     `json:"rating"`
	IsPublic     bool     `json:"isPublic"`
	CoverPalette []string `json:"coverPalette"`
}

type Details struct {
	ID            string                   `json:"id"`
	OwnerID       string                   `json:"ownerId"`
	OwnerNickname string                   `json:"ownerNickname"`
	Title         string                   `json:"title"`
	Description   string                   `json:"description"`
	IsPublic      bool                     `json:"isPublic"`
	BooksCount    int                      `json:"booksCount"`
	ViewerCanEdit bool                     `json:"viewerCanEdit"`
	CreatedAt     string                   `json:"createdAt"`
	UpdatedAt     string                   `json:"updatedAt"`
	Books         []RecommendationListBook `json:"books"`
}

type CreateInput struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	IsPublic    bool     `json:"isPublic"`
	BookIDs     []string `json:"bookIds"`
}

type UpdateInput = CreateInput

type UpdateVisibilityInput struct {
	IsPublic bool `json:"isPublic"`
}

type Repository interface {
	Create(ctx context.Context, ownerUserID string, input CreateInput) (Details, error)
	FindByID(ctx context.Context, listID string, viewerUserID string) (Details, error)
	Update(ctx context.Context, ownerUserID string, listID string, input UpdateInput) (Details, error)
	SetVisibility(ctx context.Context, ownerUserID string, listID string, isPublic bool) (Details, error)
	Delete(ctx context.Context, ownerUserID string, listID string) error
}

type Service struct {
	repository Repository
}

func NewService(repository Repository) *Service {
	return &Service{repository: repository}
}

func (service *Service) Create(
	ctx context.Context,
	ownerUserID string,
	input CreateInput,
) (Details, error) {
	if strings.TrimSpace(ownerUserID) == "" {
		return Details{}, ErrUnauthorized
	}

	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	input.BookIDs = uniqueBookIDs(input.BookIDs)

	if input.Title == "" || len(input.BookIDs) < 2 {
		return Details{}, ErrInvalidInput
	}

	return service.repository.Create(ctx, ownerUserID, input)
}

func (service *Service) FindByID(
	ctx context.Context,
	listID string,
	viewerUserID string,
) (Details, error) {
	if strings.TrimSpace(listID) == "" {
		return Details{}, ErrNotFound
	}

	return service.repository.FindByID(ctx, listID, viewerUserID)
}

func (service *Service) Update(
	ctx context.Context,
	ownerUserID string,
	listID string,
	input UpdateInput,
) (Details, error) {
	if strings.TrimSpace(ownerUserID) == "" {
		return Details{}, ErrUnauthorized
	}

	if strings.TrimSpace(listID) == "" {
		return Details{}, ErrNotFound
	}

	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	input.BookIDs = uniqueBookIDs(input.BookIDs)

	if input.Title == "" || len(input.BookIDs) < 2 {
		return Details{}, ErrInvalidInput
	}

	return service.repository.Update(ctx, ownerUserID, listID, input)
}

func (service *Service) SetVisibility(
	ctx context.Context,
	ownerUserID string,
	listID string,
	isPublic bool,
) (Details, error) {
	if strings.TrimSpace(ownerUserID) == "" {
		return Details{}, ErrUnauthorized
	}

	if strings.TrimSpace(listID) == "" {
		return Details{}, ErrNotFound
	}

	return service.repository.SetVisibility(ctx, ownerUserID, listID, isPublic)
}

func (service *Service) Delete(
	ctx context.Context,
	ownerUserID string,
	listID string,
) error {
	if strings.TrimSpace(ownerUserID) == "" {
		return ErrUnauthorized
	}

	if strings.TrimSpace(listID) == "" {
		return ErrNotFound
	}

	return service.repository.Delete(ctx, ownerUserID, listID)
}

func uniqueBookIDs(bookIDs []string) []string {
	seen := make(map[string]struct{}, len(bookIDs))
	normalized := make([]string, 0, len(bookIDs))

	for _, bookID := range bookIDs {
		trimmed := strings.TrimSpace(bookID)
		if trimmed == "" {
			continue
		}

		if _, exists := seen[trimmed]; exists {
			continue
		}

		seen[trimmed] = struct{}{}
		normalized = append(normalized, trimmed)
	}

	return normalized
}

func formatTime(value time.Time) string {
	return value.Format(time.RFC3339)
}
