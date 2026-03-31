package books

import (
	"context"
	"strings"
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
	ViewerCanEdit  bool      `json:"viewerCanEdit"`
	CreatedAt      string    `json:"createdAt"`
	Quotes         []Quote   `json:"quotes"`
	Opinions       []Opinion `json:"opinions"`
}

type CreateBookInput struct {
	Title       string `json:"title"`
	Author      string `json:"author"`
	Description string `json:"description"`
	Year        int    `json:"year"`
	Publisher   string `json:"publisher"`
	AgeRating   string `json:"ageRating"`
	Genre       string `json:"genre"`
	IsPublic    bool   `json:"isPublic"`
	Status      string `json:"status"`
	Rating      *int   `json:"rating"`
	Opinion     string `json:"opinion"`
	Quote       string `json:"quote"`
}

type Repository interface {
	Create(ctx context.Context, ownerUserID string, input CreateBookInput) (BookDetails, error)
	FindByID(ctx context.Context, bookID string, viewerUserID string) (BookDetails, error)
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

	if strings.TrimSpace(input.Publisher) == "" {
		input.Publisher = "Не указано"
	}

	if strings.TrimSpace(input.AgeRating) == "" {
		input.AgeRating = "16+"
	}

	return service.repository.Create(ctx, ownerUserID, input)
}

func (service *Service) FindByID(
	ctx context.Context,
	bookID string,
	viewerUserID string,
) (BookDetails, error) {
	if strings.TrimSpace(bookID) == "" {
		return BookDetails{}, ErrNotFound
	}

	return service.repository.FindByID(ctx, bookID, viewerUserID)
}
