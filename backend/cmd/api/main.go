package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/MattoYuzuru/Polka/backend/internal/auth"
	"github.com/MattoYuzuru/Polka/backend/internal/config"
	"github.com/MattoYuzuru/Polka/backend/internal/httpserver"
	"github.com/MattoYuzuru/Polka/backend/internal/profile"
)

func main() {
	cfg := config.Load()
	authService := auth.NewService()
	profileService := profile.NewService()

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           httpserver.NewRouter(cfg, authService, profileService),
		ReadHeaderTimeout: 5 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Printf("polka api is listening on :%s", cfg.Port)

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
