package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var ErrInvalidToken = errors.New("invalid token")

type TokenClaims struct {
	Nickname string `json:"nickname"`
	jwt.RegisteredClaims
}

type TokenManager struct {
	secret []byte
	ttl    time.Duration
}

func NewTokenManager(secret string, ttl time.Duration) *TokenManager {
	return &TokenManager{
		secret: []byte(secret),
		ttl:    ttl,
	}
}

func (manager *TokenManager) Issue(user User) (string, error) {
	now := time.Now().UTC()
	claims := TokenClaims{
		Nickname: user.Nickname,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			ExpiresAt: jwt.NewNumericDate(now.Add(manager.ttl)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(manager.secret)
}

func (manager *TokenManager) Parse(rawToken string) (TokenClaims, error) {
	token, err := jwt.ParseWithClaims(rawToken, &TokenClaims{}, func(_ *jwt.Token) (any, error) {
		return manager.secret, nil
	})
	if err != nil {
		return TokenClaims{}, ErrInvalidToken
	}

	claims, ok := token.Claims.(*TokenClaims)
	if !ok || !token.Valid {
		return TokenClaims{}, ErrInvalidToken
	}

	return *claims, nil
}
