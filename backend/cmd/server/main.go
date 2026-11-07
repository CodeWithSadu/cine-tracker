package main

import (
	"log"

	"github.com/mahee/movietracker/internal/config"
	"github.com/mahee/movietracker/internal/database"
	"github.com/mahee/movietracker/internal/routes"
)

func main() {
	cfg := config.Load()

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("❌ Database connection failed: %v", err)
	}
	if err := db.Migrate(); err != nil {
		log.Fatalf("❌ Migration failed: %v", err)
	}

	cache, _ := database.ConnectRedis(cfg.RedisURL)

	router := routes.Setup(cfg, db, cache)
	log.Printf("🚀 MovieTracker API listening on :%s", cfg.ServerPort)
	if err := router.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("❌ Server error: %v", err)
	}
}
