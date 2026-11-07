package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mahee/movietracker/internal/database"
	"github.com/mahee/movietracker/internal/middleware"
	"github.com/mahee/movietracker/internal/models"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db        *database.DB
	cache     *database.Cache
	jwtSecret string
}

func NewAuthHandler(db *database.DB, cache *database.Cache, secret string) *AuthHandler {
	return &AuthHandler{db: db, cache: cache, jwtSecret: secret}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var count int
	h.db.Get(&count, `SELECT COUNT(*) FROM users WHERE email=$1 OR username=$2`, req.Email, req.Username)
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "email or username already taken"})
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not hash password"})
		return
	}
	var user models.User
	err = h.db.QueryRowx(
		`INSERT INTO users (email,username,password_hash) VALUES ($1,$2,$3)
		 RETURNING id,email,username,avatar_url,created_at,updated_at`,
		req.Email, req.Username, string(hash),
	).StructScan(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create user"})
		return
	}
	token, err := middleware.GenerateToken(user.ID, user.Email, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not generate token"})
		return
	}
	c.JSON(http.StatusCreated, models.AuthResponse{Token: token, User: user})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var user models.User
	if err := h.db.QueryRowx(
		`SELECT id,email,username,password_hash,avatar_url,created_at,updated_at FROM users WHERE email=$1`, req.Email,
	).StructScan(&user); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	token, err := middleware.GenerateToken(user.ID, user.Email, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not generate token"})
		return
	}
	h.cache.Set(c.Request.Context(), "session:"+user.ID.String(), token, 7*24*time.Hour)
	c.JSON(http.StatusOK, models.AuthResponse{Token: token, User: user})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var user models.User
	if err := h.db.QueryRowx(
		`SELECT id,email,username,avatar_url,created_at,updated_at FROM users WHERE id=$1`, userID,
	).StructScan(&user); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}
