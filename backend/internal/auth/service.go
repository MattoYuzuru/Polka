package auth

import (
	"context"
	"errors"
	"fmt"
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

type RegisterInput struct {
	Nickname string `json:"nickname"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authRecord struct {
	User
	PasswordHash string
}

type Repository interface {
	FindByEmail(ctx context.Context, email string) (authRecord, error)
	CreateUser(ctx context.Context, params CreateUserParams) (User, error)
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

func (service *Service) Register(ctx context.Context, input RegisterInput) (Session, error) {
	nickname := strings.TrimSpace(input.Nickname)
	email := strings.TrimSpace(strings.ToLower(input.Email))
	password := strings.TrimSpace(input.Password)

	if nickname == "" || email == "" || password == "" {
		return Session{}, ErrInvalidCredentials
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return Session{}, fmt.Errorf("hash password: %w", err)
	}

	user, err := service.repository.CreateUser(ctx, CreateUserParams{
		Nickname:     nickname,
		Email:        email,
		PasswordHash: string(passwordHash),
		DisplayName:  nickname,
	})
	if err != nil {
		return Session{}, err
	}

	token, err := service.tokenManager.Issue(user)
	if err != nil {
		return Session{}, err
	}

	return Session{
		Token: token,
		User:  user,
	}, nil
}
