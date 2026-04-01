package httpserver

import (
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/MattoYuzuru/Polka/backend/internal/auth"
	"github.com/MattoYuzuru/Polka/backend/internal/books"
	"github.com/MattoYuzuru/Polka/backend/internal/config"
	"github.com/MattoYuzuru/Polka/backend/internal/media"
	"github.com/MattoYuzuru/Polka/backend/internal/profile"
	"github.com/MattoYuzuru/Polka/backend/internal/recommendationlists"
	"github.com/MattoYuzuru/Polka/backend/internal/shared/httputil"
)

func NewRouter(
	cfg config.Config,
	authService *auth.Service,
	tokenManager *auth.TokenManager,
	booksService *books.Service,
	profileService *profile.Service,
	recommendationListsService *recommendationlists.Service,
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
			AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodDelete, http.MethodOptions},
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

			session, err := authService.Login(r.Context(), input)
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

		router.Post("/auth/register", func(w http.ResponseWriter, r *http.Request) {
			var input auth.RegisterInput

			if err := httputil.DecodeJSON(r, &input); err != nil {
				httputil.WriteError(w, http.StatusBadRequest, "Некорректный JSON в теле запроса.")

				return
			}

			session, err := authService.Register(r.Context(), input)
			if err != nil {
				switch {
				case errors.Is(err, auth.ErrEmailAlreadyExists):
					httputil.WriteError(w, http.StatusConflict, "Пользователь с такой почтой уже существует.")
				case errors.Is(err, auth.ErrNicknameAlreadyExists):
					httputil.WriteError(w, http.StatusConflict, "Пользователь с таким никнеймом уже существует.")
				case errors.Is(err, auth.ErrInvalidCredentials):
					httputil.WriteError(w, http.StatusBadRequest, "Заполните никнейм, почту и пароль.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось зарегистрировать пользователя.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusCreated, session)
		})

		router.Post("/books", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			var input books.CreateBookInput

			if err := httputil.DecodeJSON(r, &input); err != nil {
				httputil.WriteError(w, http.StatusBadRequest, "Некорректный JSON в теле запроса.")

				return
			}

			bookDetails, err := booksService.Create(r.Context(), claims.Subject, input)
			if err != nil {
				switch {
				case errors.Is(err, books.ErrInvalidInput):
					httputil.WriteError(w, http.StatusBadRequest, "Заполните обязательные поля книги корректно.")
				case errors.Is(err, books.ErrUnauthorized):
					httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось создать книгу.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusCreated, bookDetails)
		})

		router.Post("/books/import", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			var input books.ImportBooksInput

			if err := httputil.DecodeJSON(r, &input); err != nil {
				httputil.WriteError(w, http.StatusBadRequest, "Передайте корректный JSON с массивом books.items.")

				return
			}

			result, err := booksService.Import(r.Context(), claims.Subject, input)
			if err != nil {
				switch {
				case errors.Is(err, books.ErrInvalidInput):
					httputil.WriteError(w, http.StatusBadRequest, "Импортируемый JSON должен содержать хотя бы одну корректную книгу.")
				case errors.Is(err, books.ErrUnauthorized):
					httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось импортировать книги.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusCreated, result)
		})

		router.Post("/books/cover-upload", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			if err := r.ParseMultipartForm(8 << 20); err != nil {
				httputil.WriteError(w, http.StatusBadRequest, "Не удалось прочитать multipart payload.")

				return
			}

			file, header, err := r.FormFile("file")
			if err != nil {
				httputil.WriteError(w, http.StatusBadRequest, "Передайте файл обложки в поле file.")

				return
			}
			defer file.Close()

			uploadedCover, err := booksService.UploadCover(
				r.Context(),
				claims.Subject,
				header.Filename,
				header.Header.Get("Content-Type"),
				file,
			)
			if err != nil {
				switch {
				case errors.Is(err, books.ErrInvalidInput):
					httputil.WriteError(w, http.StatusBadRequest, "Поддерживаются корректные изображения jpg, png, gif или webp.")
				case errors.Is(err, books.ErrUnauthorized):
					httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")
				case errors.Is(err, media.ErrStorageDisabled):
					httputil.WriteError(w, http.StatusServiceUnavailable, "Хранилище обложек сейчас недоступно.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось загрузить обложку.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusCreated, uploadedCover)
		})

		router.Post("/recommendation-lists", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			var input recommendationlists.CreateInput

			if err := httputil.DecodeJSON(r, &input); err != nil {
				httputil.WriteError(w, http.StatusBadRequest, "Некорректный JSON в теле запроса.")

				return
			}

			recommendationList, err := recommendationListsService.Create(r.Context(), claims.Subject, input)
			if err != nil {
				switch {
				case errors.Is(err, recommendationlists.ErrInvalidInput):
					httputil.WriteError(w, http.StatusBadRequest, "Укажите название списка и выберите минимум две свои книги.")
				case errors.Is(err, recommendationlists.ErrUnauthorized):
					httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось создать рекомендательный список.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusCreated, recommendationList)
		})

		router.Patch("/recommendation-lists/{listID}", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			var input recommendationlists.UpdateInput

			if err := httputil.DecodeJSON(r, &input); err != nil {
				httputil.WriteError(w, http.StatusBadRequest, "Некорректный JSON в теле запроса.")

				return
			}

			recommendationList, err := recommendationListsService.Update(
				r.Context(),
				claims.Subject,
				chi.URLParam(r, "listID"),
				input,
			)
			if err != nil {
				switch {
				case errors.Is(err, recommendationlists.ErrInvalidInput):
					httputil.WriteError(w, http.StatusBadRequest, "Укажите название списка и выберите минимум две свои книги.")
				case errors.Is(err, recommendationlists.ErrNotFound):
					httputil.WriteError(w, http.StatusNotFound, "Список рекомендаций не найден.")
				case errors.Is(err, recommendationlists.ErrUnauthorized):
					httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось обновить список рекомендаций.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusOK, recommendationList)
		})

		router.Patch("/recommendation-lists/{listID}/visibility", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			var input recommendationlists.UpdateVisibilityInput

			if err := httputil.DecodeJSON(r, &input); err != nil {
				httputil.WriteError(w, http.StatusBadRequest, "Некорректный JSON в теле запроса.")

				return
			}

			recommendationList, err := recommendationListsService.SetVisibility(
				r.Context(),
				claims.Subject,
				chi.URLParam(r, "listID"),
				input.IsPublic,
			)
			if err != nil {
				switch {
				case errors.Is(err, recommendationlists.ErrNotFound):
					httputil.WriteError(w, http.StatusNotFound, "Список рекомендаций не найден.")
				case errors.Is(err, recommendationlists.ErrUnauthorized):
					httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось изменить публичность списка рекомендаций.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusOK, recommendationList)
		})

		router.Patch("/books/{bookID}", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			var input books.UpdateBookInput

			if err := httputil.DecodeJSON(r, &input); err != nil {
				httputil.WriteError(w, http.StatusBadRequest, "Некорректный JSON в теле запроса.")

				return
			}

			bookDetails, err := booksService.Update(
				r.Context(),
				claims.Subject,
				chi.URLParam(r, "bookID"),
				input,
			)
			if err != nil {
				switch {
				case errors.Is(err, books.ErrInvalidInput):
					httputil.WriteError(w, http.StatusBadRequest, "Заполните обязательные поля книги корректно.")
				case errors.Is(err, books.ErrNotFound):
					httputil.WriteError(w, http.StatusNotFound, "Книга не найдена.")
				case errors.Is(err, books.ErrUnauthorized):
					httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось обновить книгу.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusOK, bookDetails)
		})

		router.Post("/books/{bookID}/quotes", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			var input books.BookEntryInput

			if err := httputil.DecodeJSON(r, &input); err != nil {
				httputil.WriteError(w, http.StatusBadRequest, "Некорректный JSON в теле запроса.")

				return
			}

			bookDetails, err := booksService.CreateQuote(
				r.Context(),
				claims.Subject,
				chi.URLParam(r, "bookID"),
				input,
			)
			if err != nil {
				switch {
				case errors.Is(err, books.ErrInvalidInput):
					httputil.WriteError(w, http.StatusBadRequest, "Текст цитаты не должен быть пустым.")
				case errors.Is(err, books.ErrNotFound):
					httputil.WriteError(w, http.StatusNotFound, "Книга не найдена.")
				case errors.Is(err, books.ErrUnauthorized):
					httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось добавить цитату.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusCreated, bookDetails)
		})

		router.Patch("/books/{bookID}/quotes/{quoteID}", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			var input books.BookEntryInput

			if err := httputil.DecodeJSON(r, &input); err != nil {
				httputil.WriteError(w, http.StatusBadRequest, "Некорректный JSON в теле запроса.")

				return
			}

			bookDetails, err := booksService.UpdateQuote(
				r.Context(),
				claims.Subject,
				chi.URLParam(r, "bookID"),
				chi.URLParam(r, "quoteID"),
				input,
			)
			if err != nil {
				switch {
				case errors.Is(err, books.ErrInvalidInput):
					httputil.WriteError(w, http.StatusBadRequest, "Текст цитаты не должен быть пустым.")
				case errors.Is(err, books.ErrNotFound):
					httputil.WriteError(w, http.StatusNotFound, "Цитата или книга не найдены.")
				case errors.Is(err, books.ErrUnauthorized):
					httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось обновить цитату.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusOK, bookDetails)
		})

		router.Delete("/books/{bookID}/quotes/{quoteID}", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			bookDetails, err := booksService.DeleteQuote(
				r.Context(),
				claims.Subject,
				chi.URLParam(r, "bookID"),
				chi.URLParam(r, "quoteID"),
			)
			if err != nil {
				switch {
				case errors.Is(err, books.ErrNotFound):
					httputil.WriteError(w, http.StatusNotFound, "Цитата или книга не найдены.")
				case errors.Is(err, books.ErrUnauthorized):
					httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось удалить цитату.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusOK, bookDetails)
		})

		router.Post("/books/{bookID}/opinions", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			var input books.BookEntryInput

			if err := httputil.DecodeJSON(r, &input); err != nil {
				httputil.WriteError(w, http.StatusBadRequest, "Некорректный JSON в теле запроса.")

				return
			}

			bookDetails, err := booksService.CreateOpinion(
				r.Context(),
				claims.Subject,
				chi.URLParam(r, "bookID"),
				input,
			)
			if err != nil {
				switch {
				case errors.Is(err, books.ErrInvalidInput):
					httputil.WriteError(w, http.StatusBadRequest, "Текст мнения не должен быть пустым.")
				case errors.Is(err, books.ErrNotFound):
					httputil.WriteError(w, http.StatusNotFound, "Книга не найдена.")
				case errors.Is(err, books.ErrUnauthorized):
					httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось добавить мнение.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusCreated, bookDetails)
		})

		router.Patch("/books/{bookID}/opinions/{opinionID}", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			var input books.BookEntryInput

			if err := httputil.DecodeJSON(r, &input); err != nil {
				httputil.WriteError(w, http.StatusBadRequest, "Некорректный JSON в теле запроса.")

				return
			}

			bookDetails, err := booksService.UpdateOpinion(
				r.Context(),
				claims.Subject,
				chi.URLParam(r, "bookID"),
				chi.URLParam(r, "opinionID"),
				input,
			)
			if err != nil {
				switch {
				case errors.Is(err, books.ErrInvalidInput):
					httputil.WriteError(w, http.StatusBadRequest, "Текст мнения не должен быть пустым.")
				case errors.Is(err, books.ErrNotFound):
					httputil.WriteError(w, http.StatusNotFound, "Мнение или книга не найдены.")
				case errors.Is(err, books.ErrUnauthorized):
					httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось обновить мнение.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusOK, bookDetails)
		})

		router.Delete("/books/{bookID}/opinions/{opinionID}", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			bookDetails, err := booksService.DeleteOpinion(
				r.Context(),
				claims.Subject,
				chi.URLParam(r, "bookID"),
				chi.URLParam(r, "opinionID"),
			)
			if err != nil {
				switch {
				case errors.Is(err, books.ErrNotFound):
					httputil.WriteError(w, http.StatusNotFound, "Мнение или книга не найдены.")
				case errors.Is(err, books.ErrUnauthorized):
					httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось удалить мнение.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusOK, bookDetails)
		})

		router.Patch("/books/{bookID}/visibility", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			var input books.UpdateVisibilityInput

			if err := httputil.DecodeJSON(r, &input); err != nil {
				httputil.WriteError(w, http.StatusBadRequest, "Некорректный JSON в теле запроса.")

				return
			}

			bookDetails, err := booksService.SetVisibility(
				r.Context(),
				claims.Subject,
				chi.URLParam(r, "bookID"),
				input.IsPublic,
			)
			if err != nil {
				switch {
				case errors.Is(err, books.ErrNotFound):
					httputil.WriteError(w, http.StatusNotFound, "Книга не найдена.")
				case errors.Is(err, books.ErrUnauthorized):
					httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось изменить публичность книги.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusOK, bookDetails)
		})

		router.Patch("/books/order", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			var input books.ReorderBooksInput

			if err := httputil.DecodeJSON(r, &input); err != nil {
				httputil.WriteError(w, http.StatusBadRequest, "Некорректный JSON в теле запроса.")

				return
			}

			if err := booksService.Reorder(r.Context(), claims.Subject, input); err != nil {
				switch {
				case errors.Is(err, books.ErrInvalidInput):
					httputil.WriteError(w, http.StatusBadRequest, "Передайте полный корректный порядок книг владельца.")
				case errors.Is(err, books.ErrUnauthorized):
					httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось обновить порядок книг.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusOK, map[string]string{
				"status": "reordered",
			})
		})

		router.Delete("/books/{bookID}", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			err := booksService.Delete(r.Context(), claims.Subject, chi.URLParam(r, "bookID"))
			if err != nil {
				switch {
				case errors.Is(err, books.ErrNotFound):
					httputil.WriteError(w, http.StatusNotFound, "Книга не найдена.")
				case errors.Is(err, books.ErrUnauthorized):
					httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось удалить книгу.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusOK, map[string]string{
				"status": "deleted",
			})
		})

		router.Delete("/recommendation-lists/{listID}", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			err := recommendationListsService.Delete(
				r.Context(),
				claims.Subject,
				chi.URLParam(r, "listID"),
			)
			if err != nil {
				switch {
				case errors.Is(err, recommendationlists.ErrNotFound):
					httputil.WriteError(w, http.StatusNotFound, "Список рекомендаций не найден.")
				case errors.Is(err, recommendationlists.ErrUnauthorized):
					httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось удалить список рекомендаций.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusOK, map[string]string{
				"status": "deleted",
			})
		})

		router.Get("/profiles/me", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			editableProfile, err := profileService.GetEditableByUserID(r.Context(), claims.Subject)
			if err != nil {
				if errors.Is(err, profile.ErrNotFound) {
					httputil.WriteError(w, http.StatusNotFound, "Профиль не найден.")

					return
				}

				httputil.WriteError(w, http.StatusInternalServerError, "Не удалось загрузить редактируемый профиль.")

				return
			}

			httputil.WriteJSON(w, http.StatusOK, editableProfile)
		})

		router.Patch("/profiles/me", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := requireAuth(w, r, tokenManager)
			if !ok {
				return
			}

			var input profile.UpdateProfileInput

			if err := httputil.DecodeJSON(r, &input); err != nil {
				httputil.WriteError(w, http.StatusBadRequest, "Некорректный JSON в теле запроса.")

				return
			}

			if strings.TrimSpace(input.Nickname) == "" || strings.TrimSpace(input.DisplayName) == "" {
				httputil.WriteError(w, http.StatusBadRequest, "Никнейм и отображаемое имя обязательны.")

				return
			}

			editableProfile, err := profileService.UpdateByUserID(r.Context(), claims.Subject, input)
			if err != nil {
				switch {
				case errors.Is(err, profile.ErrNicknameAlreadyExists):
					httputil.WriteError(w, http.StatusConflict, "Пользователь с таким никнеймом уже существует.")
				case errors.Is(err, profile.ErrNotFound):
					httputil.WriteError(w, http.StatusNotFound, "Профиль не найден.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось обновить профиль.")
				}

				return
			}

			httputil.WriteJSON(w, http.StatusOK, editableProfile)
		})

		router.Get("/profiles/{nickname}/export", func(w http.ResponseWriter, r *http.Request) {
			viewerUserID := extractViewerUserID(r, tokenManager)
			profileView, err := profileService.ByNickname(
				r.Context(),
				chi.URLParam(r, "nickname"),
				viewerUserID,
			)
			if err != nil {
				if errors.Is(err, profile.ErrNotFound) {
					httputil.WriteError(w, http.StatusNotFound, "Профиль не найден.")

					return
				}

				httputil.WriteError(w, http.StatusInternalServerError, "Не удалось подготовить экспорт полки.")

				return
			}

			exportItems := make([]shelfArchiveBook, 0, len(profileView.Books))
			for _, shelfBook := range profileView.Books {
				bookDetails, err := booksService.FindByID(r.Context(), shelfBook.ID, viewerUserID)
				if err != nil {
					if errors.Is(err, books.ErrNotFound) {
						continue
					}

					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось собрать книги для экспорта.")

					return
				}

				exportItem := shelfArchiveBook{
					Details: bookDetails,
				}

				if strings.TrimSpace(bookDetails.CoverURL) != "" {
					coverObject, coverErr := booksService.OpenCover(r.Context(), bookDetails.ID)
					switch {
					case coverErr == nil:
						coverBytes, readErr := io.ReadAll(coverObject.Body)
						coverObject.Body.Close()
						if readErr != nil {
							httputil.WriteError(w, http.StatusInternalServerError, "Не удалось прочитать обложку для экспорта.")

							return
						}

						exportItem.CoverBytes = coverBytes
						exportItem.CoverContentType = coverObject.ContentType
					case errors.Is(coverErr, books.ErrNotFound),
						errors.Is(coverErr, media.ErrObjectNotFound),
						errors.Is(coverErr, media.ErrStorageDisabled):
					default:
						httputil.WriteError(w, http.StatusInternalServerError, "Не удалось подготовить обложку для экспорта.")

						return
					}
				}

				exportItems = append(exportItems, exportItem)
			}

			archiveBytes, err := buildShelfArchive(exportItems)
			if err != nil {
				httputil.WriteError(w, http.StatusInternalServerError, "Не удалось собрать zip-архив полки.")

				return
			}

			fileName := sanitizeArchiveName(profileView.User.Nickname)
			if fileName == "" {
				fileName = "polka-shelf"
			}

			w.Header().Set("Content-Type", "application/zip")
			w.Header().Set(
				"Content-Disposition",
				`attachment; filename="`+fileName+`-shelf.zip"`,
			)
			w.Header().Set("Cache-Control", "no-store")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write(archiveBytes)
		})

		router.Get("/profiles/{nickname}", func(w http.ResponseWriter, r *http.Request) {
			profileView, err := profileService.ByNickname(
				r.Context(),
				chi.URLParam(r, "nickname"),
				extractViewerUserID(r, tokenManager),
			)
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

		router.Get("/books/{bookID}", func(w http.ResponseWriter, r *http.Request) {
			bookDetails, err := booksService.FindByID(
				r.Context(),
				chi.URLParam(r, "bookID"),
				extractViewerUserID(r, tokenManager),
			)
			if err != nil {
				if errors.Is(err, books.ErrNotFound) {
					httputil.WriteError(w, http.StatusNotFound, "Книга не найдена.")

					return
				}

				httputil.WriteError(w, http.StatusInternalServerError, "Не удалось загрузить книгу.")

				return
			}

			httputil.WriteJSON(w, http.StatusOK, bookDetails)
		})

		router.Get("/books/{bookID}/cover", func(w http.ResponseWriter, r *http.Request) {
			coverObject, err := booksService.OpenCover(r.Context(), chi.URLParam(r, "bookID"))
			if err != nil {
				switch {
				case errors.Is(err, books.ErrNotFound), errors.Is(err, media.ErrObjectNotFound):
					httputil.WriteError(w, http.StatusNotFound, "Обложка не найдена.")
				case errors.Is(err, media.ErrStorageDisabled):
					httputil.WriteError(w, http.StatusServiceUnavailable, "Хранилище обложек сейчас недоступно.")
				default:
					httputil.WriteError(w, http.StatusInternalServerError, "Не удалось получить обложку.")
				}

				return
			}
			defer coverObject.Body.Close()

			contentType := strings.TrimSpace(coverObject.ContentType)
			if contentType == "" {
				contentType = "application/octet-stream"
			}

			w.Header().Set("Content-Type", contentType)
			w.Header().Set("Cache-Control", "public, max-age=3600")
			w.WriteHeader(http.StatusOK)
			_, _ = io.Copy(w, coverObject.Body)
		})

		router.Get("/recommendation-lists/{listID}", func(w http.ResponseWriter, r *http.Request) {
			recommendationList, err := recommendationListsService.FindByID(
				r.Context(),
				chi.URLParam(r, "listID"),
				extractViewerUserID(r, tokenManager),
			)
			if err != nil {
				if errors.Is(err, recommendationlists.ErrNotFound) {
					httputil.WriteError(w, http.StatusNotFound, "Список рекомендаций не найден.")

					return
				}

				httputil.WriteError(w, http.StatusInternalServerError, "Не удалось загрузить список рекомендаций.")

				return
			}

			httputil.WriteJSON(w, http.StatusOK, recommendationList)
		})
	})

	return router
}

func extractViewerUserID(r *http.Request, tokenManager *auth.TokenManager) string {
	const bearerPrefix = "Bearer "

	authorizationHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authorizationHeader, bearerPrefix) {
		return ""
	}

	claims, err := tokenManager.Parse(strings.TrimPrefix(authorizationHeader, bearerPrefix))
	if err != nil {
		return ""
	}

	return claims.Subject
}

func requireAuth(
	w http.ResponseWriter,
	r *http.Request,
	tokenManager *auth.TokenManager,
) (auth.TokenClaims, bool) {
	const bearerPrefix = "Bearer "

	authorizationHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authorizationHeader, bearerPrefix) {
		httputil.WriteError(w, http.StatusUnauthorized, "Требуется авторизация.")

		return auth.TokenClaims{}, false
	}

	claims, err := tokenManager.Parse(strings.TrimPrefix(authorizationHeader, bearerPrefix))
	if err != nil {
		httputil.WriteError(w, http.StatusUnauthorized, "Токен недействителен.")

		return auth.TokenClaims{}, false
	}

	return claims, true
}
