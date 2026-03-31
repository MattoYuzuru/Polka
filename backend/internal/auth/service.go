package auth

import (
	"context"
	"errors"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

type User struct {
	ID        string `json:"id"`
	Nickname  string `json:"nickname"`
	Email     string `json:"email"`
	CreatedAt string `json:"createdAt"`
}

type Session struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authRecord struct {
	User
	PasswordHash string
}

type Repository interface {
	FindByEmail(ctx context.Context, email string) (authRecord, error)
}

type Service struct {
	repository   Repository
	tokenManager *TokenManager
}

func NewService(repository Repository, tokenManager *TokenManager) *Service {
	return &Service{
		repository:   repository,
		tokenManager: tokenManager,
	}
}

func (service *Service) Login(ctx context.Context, input LoginInput) (Session, error) {
	email := strings.TrimSpace(strings.ToLower(input.Email))

	if email == "" || strings.TrimSpace(input.Password) == "" {
		return Session{}, ErrInvalidCredentials
	}

	record, err := service.repository.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return Session{}, ErrInvalidCredentials
		}

		return Session{}, err
	}

	if err := bcrypt.CompareHashAndPassword(
		[]byte(record.PasswordHash),
		[]byte(input.Password),
	); err != nil {
		return Session{}, ErrInvalidCredentials
	}

	token, err := service.tokenManager.Issue(record.User)
	if err != nil {
		return Session{}, err
	}

	return Session{
		Token: token,
		User:  record.User,
	}, nil
}
