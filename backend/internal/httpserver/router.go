package httpserver

import (
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/MattoYuzuru/Polka/backend/internal/auth"
	"github.com/MattoYuzuru/Polka/backend/internal/config"
	"github.com/MattoYuzuru/Polka/backend/internal/profile"
	"github.com/MattoYuzuru/Polka/backend/internal/shared/httputil"
)

func NewRouter(
	cfg config.Config,
	authService *auth.Service,
	profileService *profile.Service,
) http.Handler {
	router := chi.NewRouter()

	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(middleware.Logger)
	router.Use(middleware.Recoverer)
	router.Use(middleware.Timeout(10 * time.Second))
	router.Use(
		cors.Handler(cors.Options{
			AllowedOrigins:   cfg.AllowedOrigins,
			AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodOptions},
			AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
			AllowCredentials: true,
			MaxAge:           300,
		}),
	)

	router.Route("/api/v1", func(router chi.Router) {
		router.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
			httputil.WriteJSON(w, http.StatusOK, map[string]string{
				"status": "ok",
			})
		})

		router.Post("/auth/login", func(w http.ResponseWriter, r *http.Request) {
			var input auth.LoginInput

			if err := httputil.DecodeJSON(r, &input); err != nil {
				httputil.WriteError(w, http.StatusBadRequest, "Некорректный JSON в теле запроса.")

				return
			}

			session, err := authService.Login(input)
			if err != nil {
				if errors.Is(err, auth.ErrInvalidCredentials) {
					httputil.WriteError(w, http.StatusUnauthorized, "Неверная почта или пароль.")

					return
				}

				httputil.WriteError(w, http.StatusInternalServerError, "Внутренняя ошибка авторизации.")

				return
			}

			httputil.WriteJSON(w, http.StatusOK, session)
		})

		router.Get("/profiles/{nickname}", func(w http.ResponseWriter, r *http.Request) {
			profileView, err := profileService.ByNickname(chi.URLParam(r, "nickname"))
			if err != nil {
				if errors.Is(err, profile.ErrNotFound) {
					httputil.WriteError(w, http.StatusNotFound, "Профиль не найден.")

					return
				}

				httputil.WriteError(w, http.StatusInternalServerError, "Не удалось загрузить профиль.")

				return
			}

			httputil.WriteJSON(w, http.StatusOK, profileView)
		})
	})

	return router
}
