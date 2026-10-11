package config

import (
	"strings"
	"testing"
)

func TestNonDevelopmentRequiresExplicitJWTSecret(t *testing.T) {
	for _, env := range []string{"production", "staging"} {
		for _, secret := range []string{"", "polka-dev-secret", " ", "x", strings.Repeat("a", 31), strings.Repeat(" ", 32)} {
			if err := (Config{AppEnv: env, JWTSecret: secret}).Validate(); err == nil {
				t.Fatalf("accepted %s with default secret", env)
			}
		}
	}
	if err := (Config{AppEnv: "development", JWTSecret: "polka-dev-secret"}).Validate(); err != nil {
		t.Fatal(err)
	}
	if err := (Config{AppEnv: "production", JWTSecret: strings.Repeat("a", 32)}).Validate(); err != nil {
		t.Fatal(err)
	}
}
