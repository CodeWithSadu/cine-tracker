package config

import (
	"fmt"
	"os"
)

type Config struct {
	ServerPort  string
	DatabaseURL string
	RedisURL    string
	JWTSecret   string
	TMDBAPIKey  string
	Environment string
}

func Load() *Config {
	return &Config{
		ServerPort:  getEnv("SERVER_PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:password@localhost:5432/movietracker?sslmode=disable"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:   getEnv("JWT_SECRET", "change-me-in-production-32-chars!!"),
		TMDBAPIKey:  getEnv("TMDB_API_KEY", ""),
		Environment: getEnv("ENVIRONMENT", "development"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func (c *Config) IsProd() bool { return c.Environment == "production" }
func (c *Config) DSN() string  { return fmt.Sprintf("%s", c.DatabaseURL) }
