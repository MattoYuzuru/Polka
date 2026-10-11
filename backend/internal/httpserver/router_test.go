package httpserver

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/MattoYuzuru/Polka/backend/internal/auth"
	"github.com/MattoYuzuru/Polka/backend/internal/books"
	"github.com/MattoYuzuru/Polka/backend/internal/config"
	"github.com/MattoYuzuru/Polka/backend/internal/media"
)

type coverRepository struct{ books.Repository }

func (r *coverRepository) FindCoverObjectKey(_ context.Context, id string, viewer string) (string, error) {
	if id == "public" || viewer == "owner" {
		return "image", nil
	}
	return "", books.ErrNotFound
}

type coverStorage struct{ media.Storage }

func (s *coverStorage) Open(context.Context, string) (media.DownloadedObject, error) {
	return media.DownloadedObject{ContentType: "image/png", Body: io.NopCloser(strings.NewReader("image"))}, nil
}
func TestCoverRouteEnforcesVisibilityAndPreventsSharedCaching(t *testing.T) {
	tokens := auth.NewTokenManager("test", time.Hour)
	ownerToken, err := tokens.Issue(auth.User{ID: "owner"})
	if err != nil {
		t.Fatal(err)
	}
	otherToken, err := tokens.Issue(auth.User{ID: "other"})
	if err != nil {
		t.Fatal(err)
	}
	router := NewRouter(config.Config{}, nil, tokens, books.NewService(&coverRepository{}, &coverStorage{}), nil, nil)
	for _, tc := range []struct {
		name, id, token string
		status          int
	}{
		{"private guest", "private", "", http.StatusNotFound},
		{"private outsider", "private", otherToken, http.StatusNotFound},
		{"private owner", "private", ownerToken, http.StatusOK},
		{"public guest", "public", "", http.StatusOK},
	} {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest(http.MethodGet, "/api/v1/books/"+tc.id+"/cover", nil)
			if tc.token != "" {
				r.Header.Set("Authorization", "Bearer "+tc.token)
			}
			w := httptest.NewRecorder()
			router.ServeHTTP(w, r)
			if w.Code != tc.status {
				t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
			}
			if tc.status == http.StatusOK && (w.Header().Get("Cache-Control") != "private, no-store" || w.Header().Get("X-Content-Type-Options") != "nosniff") {
				t.Fatalf("unsafe cover headers: %v", w.Header())
			}
		})
	}
}
