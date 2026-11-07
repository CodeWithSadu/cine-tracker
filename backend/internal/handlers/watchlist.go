package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/mahee/movietracker/internal/database"
	"github.com/mahee/movietracker/internal/middleware"
	"github.com/mahee/movietracker/internal/models"
)

type WatchlistHandler struct{ db *database.DB }

func NewWatchlistHandler(db *database.DB) *WatchlistHandler { return &WatchlistHandler{db: db} }

func (h *WatchlistHandler) GetWatchlist(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	status := c.Query("status")
	mtype := c.Query("type")

	q := `SELECT we.id,we.user_id,we.media_item_id,we.status,we.rating,
		         we.review_notes,we.date_watched,we.current_season,we.current_episode,
		         we.created_at,we.updated_at,
		         mi.id AS "media_item.id",mi.tmdb_id AS "media_item.tmdb_id",
		         mi.title AS "media_item.title",mi.original_title AS "media_item.original_title",
		         mi.media_type AS "media_item.media_type",mi.poster_path AS "media_item.poster_path",
		         mi.backdrop_path AS "media_item.backdrop_path",mi.overview AS "media_item.overview",
		         mi.release_date AS "media_item.release_date",mi.genres AS "media_item.genres",
		         mi.runtime_minutes AS "media_item.runtime_minutes",
		         mi.total_seasons AS "media_item.total_seasons",
		         mi.total_episodes AS "media_item.total_episodes",
		         mi.created_at AS "media_item.created_at"
		  FROM watchlist_entries we
		  JOIN media_items mi ON mi.id=we.media_item_id
		  WHERE we.user_id=$1`
	args := []interface{}{uid}
	if status != "" {
		args = append(args, status)
		q += fmt.Sprintf(" AND we.status=$%d", len(args))
	}
	if mtype != "" {
		args = append(args, mtype)
		q += fmt.Sprintf(" AND mi.media_type=$%d", len(args))
	}
	q += " ORDER BY we.updated_at DESC"

	rows, err := h.db.Queryx(q, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	entries := []models.WatchlistEntryFull{}
	for rows.Next() {
		var e models.WatchlistEntryFull
		if rows.StructScan(&e) == nil {
			entries = append(entries, e)
		}
	}
	c.JSON(http.StatusOK, entries)
}

func (h *WatchlistHandler) UpsertEntry(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var req models.UpsertWatchlistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	mid, err := uuid.Parse(req.MediaItemID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid media_item_id"})
		return
	}
	var dw *time.Time
	if req.DateWatched != nil && *req.DateWatched != "" {
		t, err := time.Parse("2006-01-02", *req.DateWatched)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "date_watched must be YYYY-MM-DD"})
			return
		}
		dw = &t
	}
	cs, ce := 1, 1
	if req.CurrentSeason != nil {
		cs = *req.CurrentSeason
	}
	if req.CurrentEpisode != nil {
		ce = *req.CurrentEpisode
	}
	var entry models.WatchlistEntry
	err = h.db.QueryRowx(
		`INSERT INTO watchlist_entries
		 (user_id,media_item_id,status,rating,review_notes,date_watched,current_season,current_episode)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		 ON CONFLICT (user_id,media_item_id) DO UPDATE SET
		   status=EXCLUDED.status,rating=EXCLUDED.rating,review_notes=EXCLUDED.review_notes,
		   date_watched=EXCLUDED.date_watched,current_season=EXCLUDED.current_season,
		   current_episode=EXCLUDED.current_episode,updated_at=NOW()
		 RETURNING id,user_id,media_item_id,status,rating,review_notes,
		           date_watched,current_season,current_episode,created_at,updated_at`,
		uid, mid, req.Status, req.Rating, req.ReviewNotes, dw, cs, ce,
	).StructScan(&entry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, entry)
}

func (h *WatchlistHandler) RemoveEntry(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	res, err := h.db.Exec(`DELETE FROM watchlist_entries WHERE id=$1 AND user_id=$2`, c.Param("id"), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "delete failed"})
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "entry not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "removed"})
}

func (h *WatchlistHandler) GetAnalytics(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	s := models.AnalyticsSummary{}
	type row struct {
		Status    string `db:"status"`
		MediaType string `db:"media_type"`
		Count     int    `db:"count"`
	}
	rows, _ := h.db.Queryx(
		`SELECT we.status,mi.media_type,COUNT(*) AS count
		 FROM watchlist_entries we JOIN media_items mi ON mi.id=we.media_item_id
		 WHERE we.user_id=$1 GROUP BY we.status,mi.media_type`, uid)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var r row
			rows.StructScan(&r)
			switch r.Status {
			case "watched":
				if r.MediaType == "movie" {
					s.WatchedMovies += r.Count; s.TotalMovies += r.Count
				} else {
					s.WatchedSeries += r.Count; s.TotalSeries += r.Count
				}
			case "watching":
				s.CurrentlyWatching += r.Count
				if r.MediaType == "movie" {
					s.TotalMovies += r.Count
				} else {
					s.TotalSeries += r.Count
				}
			case "plan_to_watch":
				s.PlanToWatch += r.Count
				if r.MediaType == "movie" {
					s.TotalMovies += r.Count
				} else {
					s.TotalSeries += r.Count
				}
			}
		}
	}
	h.db.Get(&s.EstimatedHours,
		`SELECT COALESCE(SUM(CASE mi.media_type
		   WHEN 'movie' THEN COALESCE(mi.runtime_minutes,110)
		   ELSE COALESCE(mi.total_episodes,12)*45 END)/60.0,0)
		 FROM watchlist_entries we JOIN media_items mi ON mi.id=we.media_item_id
		 WHERE we.user_id=$1 AND we.status='watched'`, uid)

	s.TopGenres = []models.GenreCount{}
	gRows, _ := h.db.Queryx(
		`SELECT genre,COUNT(*) AS count FROM watchlist_entries we
		 JOIN media_items mi ON mi.id=we.media_item_id
		 CROSS JOIN LATERAL UNNEST(mi.genres) AS genre
		 WHERE we.user_id=$1 GROUP BY genre ORDER BY count DESC LIMIT 6`, uid)
	if gRows != nil {
		defer gRows.Close()
		for gRows.Next() {
			var g models.GenreCount
			gRows.StructScan(&g)
			s.TopGenres = append(s.TopGenres, g)
		}
	}
	s.RecentlyWatched = []models.WatchlistEntryFull{}
	rRows, _ := h.db.Queryx(
		`SELECT we.id,we.user_id,we.media_item_id,we.status,we.rating,
		        we.review_notes,we.date_watched,we.current_season,we.current_episode,
		        we.created_at,we.updated_at,
		        mi.id AS "media_item.id",mi.tmdb_id AS "media_item.tmdb_id",
		        mi.title AS "media_item.title",mi.original_title AS "media_item.original_title",
		        mi.media_type AS "media_item.media_type",mi.poster_path AS "media_item.poster_path",
		        mi.backdrop_path AS "media_item.backdrop_path",mi.overview AS "media_item.overview",
		        mi.release_date AS "media_item.release_date",mi.genres AS "media_item.genres",
		        mi.runtime_minutes AS "media_item.runtime_minutes",
		        mi.total_seasons AS "media_item.total_seasons",
		        mi.total_episodes AS "media_item.total_episodes",
		        mi.created_at AS "media_item.created_at"
		 FROM watchlist_entries we JOIN media_items mi ON mi.id=we.media_item_id
		 WHERE we.user_id=$1 AND we.status='watched'
		 ORDER BY we.updated_at DESC LIMIT 5`, uid)
	if rRows != nil {
		defer rRows.Close()
		for rRows.Next() {
			var e models.WatchlistEntryFull
			if rRows.StructScan(&e) == nil {
				s.RecentlyWatched = append(s.RecentlyWatched, e)
			}
		}
	}
	c.JSON(http.StatusOK, s)
}
