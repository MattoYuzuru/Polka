package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/MattoYuzuru/Polka/backend/internal/auth"
	"github.com/MattoYuzuru/Polka/backend/internal/books"
	"github.com/MattoYuzuru/Polka/backend/internal/config"
	"github.com/MattoYuzuru/Polka/backend/internal/database"
	"github.com/MattoYuzuru/Polka/backend/internal/httpserver"
	"github.com/MattoYuzuru/Polka/backend/internal/profile"
	"github.com/MattoYuzuru/Polka/backend/internal/recommendationlists"
)

func main() {
	cfg := config.Load()
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	pool, err := database.Open(ctx, cfg)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer pool.Close()

	if cfg.AutoMigrate {
		if err := database.Migrate(ctx, pool); err != nil {
			log.Fatalf("migrate database: %v", err)
		}
	}

	tokenManager := auth.NewTokenManager(cfg.JWTSecret, 24*time.Hour)
	authRepository := auth.NewPostgresRepository(pool)
	booksRepository := books.NewPostgresRepository(pool)
	profileRepository := profile.NewPostgresRepository(pool)
	recommendationListsRepository := recommendationlists.NewPostgresRepository(pool)
	authService := auth.NewService(authRepository, tokenManager)
	booksService := books.NewService(booksRepository)
	profileService := profile.NewService(profileRepository)
	recommendationListsService := recommendationlists.NewService(recommendationListsRepository)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           httpserver.NewRouter(cfg, authService, tokenManager, booksService, profileService, recommendationListsService),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("polka api is listening on :%s (%s)", cfg.Port, safeDatabaseURL(cfg.DatabaseURL))

		if err := server.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server stopped unexpectedly: %v", err)
		}
	}()

	<-ctx.Done()
	stop()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("graceful shutdown failed: %v", err)
	}
}

func safeDatabaseURL(databaseURL string) string {
	const marker = "://"

	parts := strings.SplitN(databaseURL, marker, 2)
	if len(parts) != 2 {
		return databaseURL
	}

	credentialsAndHost := strings.SplitN(parts[1], "@", 2)
	if len(credentialsAndHost) != 2 || !strings.Contains(credentialsAndHost[0], ":") {
		return databaseURL
	}

	userAndPassword := strings.SplitN(credentialsAndHost[0], ":", 2)

	return fmt.Sprintf("%s%s%s:%s@%s", parts[0], marker, userAndPassword[0], "***", credentialsAndHost[1])
}
