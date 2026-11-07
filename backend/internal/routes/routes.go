package routes

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/mahee/movietracker/internal/config"
	"github.com/mahee/movietracker/internal/database"
	"github.com/mahee/movietracker/internal/handlers"
	"github.com/mahee/movietracker/internal/middleware"
)

func Setup(cfg *config.Config, db *database.DB, cache *database.Cache) *gin.Engine {
	if cfg.IsProd() {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "Authorization"},
	}))
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "movietracker-api"})
	})

	auth := handlers.NewAuthHandler(db, cache, cfg.JWTSecret)
	media := handlers.NewMediaHandler(db, cfg.TMDBAPIKey)
	wl := handlers.NewWatchlistHandler(db)

	api := r.Group("/api")
	api.POST("/auth/register", auth.Register)
	api.POST("/auth/login", auth.Login)

	p := api.Group("", middleware.AuthRequired(cfg.JWTSecret))
	p.GET("/auth/me", auth.Me)
	p.GET("/media/search", media.Search)
	p.POST("/media", media.AddMedia)
	p.GET("/media/:id", media.GetMedia)
	p.GET("/watchlist", wl.GetWatchlist)
	p.POST("/watchlist", wl.UpsertEntry)
	p.DELETE("/watchlist/:id", wl.RemoveEntry)
	p.GET("/analytics", wl.GetAnalytics)

	return r
}
