package config

import (
	"os"
	"strings"
)

type Config struct {
	AppEnv         string
	Port           string
	AllowedOrigins []string
}

func Load() Config {
	return Config{
		AppEnv: os.Getenv("APP_ENV"),
		Port:   envOrDefault("PORT", "8080"),
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
