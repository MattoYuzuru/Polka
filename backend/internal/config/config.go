package config

import (
	"os"
	"strings"
)

type Config struct {
	AppEnv         string
	Port           string
	DatabaseURL    string
	JWTSecret      string
	AutoMigrate    bool
	AllowedOrigins []string
}

func Load() Config {
	return Config{
		AppEnv:      envOrDefault("APP_ENV", "development"),
		Port:        envOrDefault("PORT", "8080"),
		DatabaseURL: envOrDefault("DATABASE_URL", "postgres://polka:polka@localhost:5432/polka?sslmode=disable"),
		JWTSecret:   envOrDefault("JWT_SECRET", "polka-dev-secret"),
		AutoMigrate: envBoolOrDefault("AUTO_MIGRATE", true),
		AllowedOrigins: splitCSV(
			envOrDefault(
				"ALLOWED_ORIGINS",
				"http://localhost:4200,http://127.0.0.1:4200,https://polka.keykomi.com",
			),
		),
	}
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}

func envBoolOrDefault(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return strings.EqualFold(value, "true") || value == "1"
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))

	for _, part := range parts {
		trimmed := strings.TrimSpace(part)

		if trimmed != "" {
			result = append(result, trimmed)
		}
	}

	return result
}
