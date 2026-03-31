package profile

import (
	"context"
	"errors"
	"time"
)

var ErrNotFound = errors.New("profile not found")

type Stats struct {
	MemberSinceLabel         string `json:"memberSinceLabel"`
	BooksCount               int    `json:"booksCount"`
	CompletedCount           int    `json:"completedCount"`
	RecommendationListsCount int    `json:"recommendationListsCount"`
}

type User struct {
	Nickname  string    `json:"nickname"`
	Display   string    `json:"displayName"`
	Tagline   string    `json:"tagline"`
	CreatedAt time.Time `json:"createdAt"`
}

type Book struct {
	ID             string   `json:"id"`
	Title          string   `json:"title"`
	Author         string   `json:"author"`
	Description    string   `json:"description"`
	Year           int      `json:"year"`
	Publisher      string   `json:"publisher"`
	AgeRating      string   `json:"ageRating"`
	Genre          string   `json:"genre"`
	Status         string   `json:"status"`
	Rating         *int     `json:"rating"`
	OpinionPreview string   `json:"opinionPreview"`
	CoverPalette   []string `json:"coverPalette"`
}

type RecommendationList struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	BooksCount  int    `json:"booksCount"`
	IsPublic    bool   `json:"isPublic"`
}

type PublicProfile struct {
	User                User                 `json:"user"`
	Stats               Stats                `json:"stats"`
	GradientStops       []string             `json:"gradientStops"`
	Books               []Book               `json:"books"`
	RecommendationLists []RecommendationList `json:"recommendationLists"`
}

type EditableProfile struct {
	UserID        string    `json:"userId"`
	Nickname      string    `json:"nickname"`
	Email         string    `json:"email"`
	DisplayName   string    `json:"displayName"`
	Tagline       string    `json:"tagline"`
	GradientStops []string  `json:"gradientStops"`
	CreatedAt     time.Time `json:"createdAt"`
}

type UpdateProfileInput struct {
	Nickname    string `json:"nickname"`
	DisplayName string `json:"displayName"`
	Tagline     string `json:"tagline"`
}

type Repository interface {
	FindByNickname(ctx context.Context, nickname string, viewerUserID string) (PublicProfile, error)
	GetEditableByUserID(ctx context.Context, userID string) (EditableProfile, error)
	UpdateByUserID(ctx context.Context, userID string, input UpdateProfileInput) (EditableProfile, error)
}

type Service struct {
	repository Repository
}

func NewService(repository Repository) *Service {
	return &Service{
		repository: repository,
	}
}

func (service *Service) ByNickname(
	ctx context.Context,
	nickname string,
	viewerUserID string,
) (PublicProfile, error) {
	return service.repository.FindByNickname(ctx, nickname, viewerUserID)
}

func (service *Service) GetEditableByUserID(
	ctx context.Context,
	userID string,
) (EditableProfile, error) {
	return service.repository.GetEditableByUserID(ctx, userID)
}

func (service *Service) UpdateByUserID(
	ctx context.Context,
	userID string,
	input UpdateProfileInput,
) (EditableProfile, error) {
	return service.repository.UpdateByUserID(ctx, userID, input)
}
