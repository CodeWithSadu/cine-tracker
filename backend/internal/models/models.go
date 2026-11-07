package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type User struct {
	ID           uuid.UUID `db:"id"            json:"id"`
	Email        string    `db:"email"         json:"email"`
	Username     string    `db:"username"      json:"username"`
	PasswordHash string    `db:"password_hash" json:"-"`
	AvatarURL    *string   `db:"avatar_url"    json:"avatar_url"`
	CreatedAt    time.Time `db:"created_at"    json:"created_at"`
	UpdatedAt    time.Time `db:"updated_at"    json:"updated_at"`
}

type MediaItem struct {
	ID             uuid.UUID      `db:"id"              json:"id"`
	TMDBId         *int           `db:"tmdb_id"         json:"tmdb_id"`
	Title          string         `db:"title"           json:"title"`
	OriginalTitle  *string        `db:"original_title"  json:"original_title"`
	MediaType      string         `db:"media_type"      json:"media_type"`
	PosterPath     *string        `db:"poster_path"     json:"poster_path"`
	BackdropPath   *string        `db:"backdrop_path"   json:"backdrop_path"`
	Overview       *string        `db:"overview"        json:"overview"`
	ReleaseDate    *string        `db:"release_date"    json:"release_date"`
	Genres         pq.StringArray `db:"genres"          json:"genres"`
	RuntimeMinutes *int           `db:"runtime_minutes" json:"runtime_minutes"`
	TotalSeasons   *int           `db:"total_seasons"   json:"total_seasons"`
	TotalEpisodes  *int           `db:"total_episodes"  json:"total_episodes"`
	CreatedAt      time.Time      `db:"created_at"      json:"created_at"`
}

type WatchlistEntry struct {
	ID             uuid.UUID  `db:"id"              json:"id"`
	UserID         uuid.UUID  `db:"user_id"         json:"user_id"`
	MediaItemID    uuid.UUID  `db:"media_item_id"   json:"media_item_id"`
	Status         string     `db:"status"          json:"status"`
	Rating         *int       `db:"rating"          json:"rating"`
	ReviewNotes    *string    `db:"review_notes"    json:"review_notes"`
	DateWatched    *time.Time `db:"date_watched"    json:"date_watched"`
	CurrentSeason  int        `db:"current_season"  json:"current_season"`
	CurrentEpisode int        `db:"current_episode" json:"current_episode"`
	CreatedAt      time.Time  `db:"created_at"      json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at"      json:"updated_at"`
}

type WatchlistEntryFull struct {
	WatchlistEntry
	MediaItem MediaItem `db:"media_item" json:"media_item"`
}

type AnalyticsSummary struct {
	TotalMovies       int                  `json:"total_movies"`
	TotalSeries       int                  `json:"total_series"`
	WatchedMovies     int                  `json:"watched_movies"`
	WatchedSeries     int                  `json:"watched_series"`
	CurrentlyWatching int                  `json:"currently_watching"`
	PlanToWatch       int                  `json:"plan_to_watch"`
	EstimatedHours    float64              `json:"estimated_hours"`
	TopGenres         []GenreCount         `json:"top_genres"`
	RecentlyWatched   []WatchlistEntryFull `json:"recently_watched"`
}

type GenreCount struct {
	Genre string `db:"genre" json:"genre"`
	Count int    `db:"count" json:"count"`
}

// ── DTOs ─────────────────────────────────────────────────────────────────────

type RegisterRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Username string `json:"username" binding:"required,min=3,max=30"`
	Password string `json:"password" binding:"required,min=8"`
}

type LoginRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type UpsertWatchlistRequest struct {
	MediaItemID    string  `json:"media_item_id"   binding:"required"`
	Status         string  `json:"status"          binding:"required,oneof=plan_to_watch watching watched"`
	Rating         *int    `json:"rating"`
	ReviewNotes    *string `json:"review_notes"`
	DateWatched    *string `json:"date_watched"`
	CurrentSeason  *int    `json:"current_season"`
	CurrentEpisode *int    `json:"current_episode"`
}

type AddMediaRequest struct {
	TMDBId         *int     `json:"tmdb_id"`
	Title          string   `json:"title"      binding:"required"`
	OriginalTitle  *string  `json:"original_title"`
	MediaType      string   `json:"media_type" binding:"required,oneof=movie series"`
	PosterPath     *string  `json:"poster_path"`
	BackdropPath   *string  `json:"backdrop_path"`
	Overview       *string  `json:"overview"`
	ReleaseDate    *string  `json:"release_date"`
	Genres         []string `json:"genres"`
	RuntimeMinutes *int     `json:"runtime_minutes"`
	TotalSeasons   *int     `json:"total_seasons"`
	TotalEpisodes  *int     `json:"total_episodes"`
}

type TMDBSearchResult struct {
	ID           int     `json:"id"`
	Title        string  `json:"title"`
	Name         string  `json:"name"`
	MediaType    string  `json:"media_type"`
	PosterPath   *string `json:"poster_path"`
	BackdropPath *string `json:"backdrop_path"`
	Overview     string  `json:"overview"`
	ReleaseDate  string  `json:"release_date"`
	FirstAirDate string  `json:"first_air_date"`
}

type TMDBSearchResponse struct {
	Results []TMDBSearchResult `json:"results"`
}
