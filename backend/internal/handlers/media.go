package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"github.com/mahee/movietracker/internal/database"
	"github.com/mahee/movietracker/internal/models"
)

type MediaHandler struct {
	db         *database.DB
	tmdbAPIKey string
}

func NewMediaHandler(db *database.DB, key string) *MediaHandler {
	return &MediaHandler{db: db, tmdbAPIKey: key}
}

func (h *MediaHandler) Search(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	t := c.DefaultQuery("type", "")
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query 'q' is required"})
		return
	}
	if h.tmdbAPIKey != "" {
		if res, err := h.searchTMDB(q, t); err == nil {
			c.JSON(http.StatusOK, res)
			return
		}
	}
	// local fallback
	args := []interface{}{"%" + strings.ToLower(q) + "%"}
	extra := ""
	if t == "movie" || t == "series" {
		extra = " AND media_type=$2"
		args = append(args, t)
	}
	rows, err := h.db.Queryx(
		`SELECT id,tmdb_id,title,original_title,media_type,poster_path,backdrop_path,
		        overview,release_date,genres,runtime_minutes,total_seasons,total_episodes,created_at
		 FROM media_items WHERE LOWER(title) LIKE $1`+extra+` ORDER BY title LIMIT 20`, args...,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "search failed"})
		return
	}
	defer rows.Close()
	results := []models.MediaItem{}
	for rows.Next() {
		var m models.MediaItem
		if rows.StructScan(&m) == nil {
			results = append(results, m)
		}
	}
	c.JSON(http.StatusOK, gin.H{"results": results, "source": "local"})
}

func (h *MediaHandler) searchTMDB(q, mediaType string) (gin.H, error) {
	ep := "https://api.themoviedb.org/3/search/multi"
	if mediaType == "movie" {
		ep = "https://api.themoviedb.org/3/search/movie"
	} else if mediaType == "series" {
		ep = "https://api.themoviedb.org/3/search/tv"
	}
	resp, err := http.Get(fmt.Sprintf("%s?api_key=%s&query=%s&page=1", ep, h.tmdbAPIKey, url.QueryEscape(q)))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var tmdb models.TMDBSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&tmdb); err != nil {
		return nil, err
	}
	out := make([]map[string]interface{}, 0, len(tmdb.Results))
	for _, r := range tmdb.Results {
		title := r.Title
		if title == "" {
			title = r.Name
		}
		mt := r.MediaType
		if mt == "tv" || mediaType == "series" {
			mt = "series"
		}
		if mediaType == "movie" {
			mt = "movie"
		}
		rd := r.ReleaseDate
		if rd == "" {
			rd = r.FirstAirDate
		}
		var poster, backdrop *string
		if r.PosterPath != nil && *r.PosterPath != "" {
			p := "https://image.tmdb.org/t/p/w500" + *r.PosterPath
			poster = &p
		}
		if r.BackdropPath != nil && *r.BackdropPath != "" {
			b := "https://image.tmdb.org/t/p/w1280" + *r.BackdropPath
			backdrop = &b
		}
		out = append(out, map[string]interface{}{
			"tmdb_id": r.ID, "title": title, "media_type": mt,
			"poster_path": poster, "backdrop_path": backdrop,
			"overview": r.Overview, "release_date": rd,
		})
	}
	return gin.H{"results": out, "source": "tmdb"}, nil
}

func (h *MediaHandler) AddMedia(c *gin.Context) {
	var req models.AddMediaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var item models.MediaItem
	err := h.db.QueryRowx(
		`INSERT INTO media_items
		 (tmdb_id,title,original_title,media_type,poster_path,backdrop_path,
		  overview,release_date,genres,runtime_minutes,total_seasons,total_episodes)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		 ON CONFLICT (tmdb_id,media_type) DO UPDATE SET
		   title=EXCLUDED.title,poster_path=EXCLUDED.poster_path,
		   backdrop_path=EXCLUDED.backdrop_path,overview=EXCLUDED.overview,
		   release_date=EXCLUDED.release_date,genres=EXCLUDED.genres,
		   runtime_minutes=EXCLUDED.runtime_minutes,total_seasons=EXCLUDED.total_seasons,
		   total_episodes=EXCLUDED.total_episodes
		 RETURNING id,tmdb_id,title,original_title,media_type,poster_path,backdrop_path,
		           overview,release_date,genres,runtime_minutes,total_seasons,total_episodes,created_at`,
		req.TMDBId, req.Title, req.OriginalTitle, req.MediaType,
		req.PosterPath, req.BackdropPath, req.Overview, req.ReleaseDate,
		pq.StringArray(req.Genres), req.RuntimeMinutes, req.TotalSeasons, req.TotalEpisodes,
	).StructScan(&item)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *MediaHandler) GetMedia(c *gin.Context) {
	var item models.MediaItem
	if err := h.db.QueryRowx(
		`SELECT id,tmdb_id,title,original_title,media_type,poster_path,backdrop_path,
		        overview,release_date,genres,runtime_minutes,total_seasons,total_episodes,created_at
		 FROM media_items WHERE id=$1`, c.Param("id"),
	).StructScan(&item); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, item)
}
