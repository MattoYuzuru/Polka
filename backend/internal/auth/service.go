package auth

import (
	"errors"
	"strings"
	"time"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

type User struct {
	ID        string    `json:"id"`
	Nickname  string    `json:"nickname"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"createdAt"`
}

type Session struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (service *Service) Login(input LoginInput) (Session, error) {
	if !strings.EqualFold(strings.TrimSpace(input.Email), "reader@polka.local") {
		return Session{}, ErrInvalidCredentials
	}

	if input.Password != "Reader1234" {
		return Session{}, ErrInvalidCredentials
	}

	return Session{
		Token: "polka-demo-token",
		User: User{
			ID:        "7cb8e370-1cb4-4794-b0e3-8cde1cd4ae8b",
			Nickname:  "mattoy",
			Email:     "reader@polka.local",
			CreatedAt: time.Date(2024, time.September, 14, 9, 0, 0, 0, time.UTC),
		},
	}, nil
}
