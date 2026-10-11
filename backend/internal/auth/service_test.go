package auth

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type memoryUsers struct {
	record  authRecord
	creates int
}

func (r *memoryUsers) FindByEmail(_ context.Context, _ string) (authRecord, error) {
	return r.record, nil
}
func (r *memoryUsers) CreateUser(_ context.Context, p CreateUserParams) (User, error) {
	r.creates++
	r.record = authRecord{User: User{ID: "owner", Nickname: p.Nickname, Email: p.Email}, PasswordHash: p.PasswordHash}
	return r.record.User, nil
}
func TestRegisterAndLoginPreservePasswordWhitespace(t *testing.T) {
	repo := &memoryUsers{}
	service := NewService(repo, NewTokenManager("test-secret", time.Hour))
	password := "  correct horse battery  "
	if _, err := service.Register(context.Background(), RegisterInput{Nickname: "reader", Email: " Reader@Example.com ", Password: password}); err != nil {
		t.Fatal(err)
	}
	if _, err := service.Login(context.Background(), LoginInput{Email: "reader@example.com", Password: password}); err != nil {
		t.Fatalf("original password cannot log in: %v", err)
	}
	if _, err := service.Login(context.Background(), LoginInput{Email: "reader@example.com", Password: strings.TrimSpace(password)}); !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("changed password accepted: %v", err)
	}
}
func TestRegisterRejectsBcryptOverflowAsInvalidInput(t *testing.T) {
	repo := &memoryUsers{}
	_, err := NewService(repo, NewTokenManager("test", time.Hour)).Register(context.Background(), RegisterInput{Nickname: "reader", Email: "reader@example.com", Password: strings.Repeat("x", 73)})
	if !errors.Is(err, ErrInvalidCredentials) || repo.creates != 0 {
		t.Fatalf("got error %v, creates %d", err, repo.creates)
	}
}
func TestTokenManagerRejectsMissingExpirationSubjectAndWrongMethod(t *testing.T) {
	manager := NewTokenManager("test-secret", time.Hour)
	for _, tc := range []struct {
		name   string
		method jwt.SigningMethod
		claims jwt.RegisteredClaims
	}{
		{"missing expiry", jwt.SigningMethodHS256, jwt.RegisteredClaims{Subject: "owner"}},
		{"missing subject", jwt.SigningMethodHS256, jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}},
		{"wrong algorithm", jwt.SigningMethodHS384, jwt.RegisteredClaims{Subject: "owner", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}},
		{"expired", jwt.SigningMethodHS256, jwt.RegisteredClaims{Subject: "owner", ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour))}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			raw, err := jwt.NewWithClaims(tc.method, TokenClaims{RegisteredClaims: tc.claims}).SignedString(manager.secret)
			if err != nil {
				t.Fatal(err)
			}
			if _, err := manager.Parse(raw); !errors.Is(err, ErrInvalidToken) {
				t.Fatalf("accepted invalid token: %v", err)
			}
		})
	}
	raw, err := manager.Issue(User{ID: "owner"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := manager.Parse(raw); err != nil {
		t.Fatal(err)
	}
}
func TestUserConflictMapsDatabaseRaceToDomainConflict(t *testing.T) {
	for _, tc := range []struct {
		constraint string
		want       error
	}{{"idx_users_lower_nickname", ErrNicknameAlreadyExists}, {"users_email_key", ErrEmailAlreadyExists}} {
		if got := userConflict(&pgconn.PgError{Code: "23505", ConstraintName: tc.constraint}); !errors.Is(got, tc.want) {
			t.Fatalf("%s: %v", tc.constraint, got)
		}
	}
	if got := userConflict(&pgconn.PgError{Code: "23503"}); got != nil {
		t.Fatalf("unexpected conflict: %v", got)
	}
}

func TestRegisterValidatesProfileNicknameAndCredentials(t *testing.T) {
	for _, tc := range []RegisterInput{{Nickname: "login", Email: "reader@example.com", Password: "password8"}, {Nickname: "reader/name", Email: "reader@example.com", Password: "password8"}, {Nickname: "reader", Email: "broken", Password: "password8"}, {Nickname: "reader", Email: "reader@example.com", Password: "short"}} {
		repo := &memoryUsers{}
		if _, err := NewService(repo, NewTokenManager("test", time.Hour)).Register(context.Background(), tc); !errors.Is(err, ErrInvalidCredentials) || repo.creates != 0 {
			t.Fatalf("invalid registration persisted: %+v %v", tc, err)
		}
	}
}
