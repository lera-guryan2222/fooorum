// @title Auth Service API
// @version 1.0
// @description Authentication service API with user management capabilities
// @BasePath /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Enter the token with the `Bearer: ` prefix, e.g. "Bearer abcde12345"
package delivery

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	"github.com/lera-guryan2222/fooorum/auth-service/internal/config"
	"github.com/lera-guryan2222/fooorum/auth-service/internal/usecase"
)

// RegisterRequest представляет данные для регистрации
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=20" example:"john_doe"`
	Email    string `json:"email" binding:"required,email" example:"john@example.com"`
	Password string `json:"password" binding:"required,min=6" example:"secret123"`
}

// LoginRequest представляет данные для входа
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email" example:"john@example.com"`
	Password string `json:"password" binding:"required,min=6" example:"secret123"`
}

// AuthResponse представляет ответ с токенами
type AuthResponse struct {
	AccessToken  string `json:"access_token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
	RefreshToken string `json:"refresh_token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
	User         User   `json:"user"`
}

// User представляет информацию о пользователе
type User struct {
	ID       int    `json:"id" example:"1"`
	Username string `json:"username" example:"john_doe"`
	Email    string `json:"email" example:"john@example.com"`
	Role     string `json:"role" example:"user"`
}

// ErrorResponse представляет ответ с ошибкой
type ErrorResponse struct {
	Error string `json:"error" example:"Invalid credentials"`
	Code  string `json:"code,omitempty" example:"invalid_credentials"`
}

// TokenValidationResponse представляет ответ валидации токена
type TokenValidationResponse struct {
	Valid bool   `json:"valid" example:"true"`
	Error string `json:"error,omitempty" example:"Token has expired"`
}

// MessageResponse представляет простой ответ с сообщением
type MessageResponse struct {
	Message string `json:"message" example:"Operation completed successfully"`
}

// AuthHandler представляет обработчик для аутентификации
type AuthHandler struct {
	uc usecase.AuthUseCase
}

// NewAuthHandler создает новый экземпляр AuthHandler
// @Summary Создает новый обработчик аутентификации
func NewAuthHandler(uc usecase.AuthUseCase) *AuthHandler {
	return &AuthHandler{uc: uc}
}

// Register godoc
// @Summary Register new user
// @Description Creates a new user account
// @Tags auth
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "Registration credentials"
// @Success 201 {object} AuthResponse "Successfully registered"
// @Failure 400 {object} ErrorResponse "Invalid input data"
// @Failure 409 {object} ErrorResponse "User already exists"
// @Failure 500 {object} ErrorResponse "Internal server error"
// @Router /auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error: err.Error(),
			Code:  "invalid_request",
		})
		return
	}

	authResponse, err := h.uc.Register(c.Request.Context(), req.Username, req.Email, req.Password)
	if err != nil {
		switch {
		case err.Error() == "пользователь с таким email уже существует" ||
			err.Error() == "пользователь с таким username уже существует":
			c.JSON(http.StatusConflict, ErrorResponse{
				Error: err.Error(),
				Code:  "user_already_exists",
			})
		default:
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error: err.Error(),
				Code:  "registration_failed",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, authResponse)
}

// Login godoc
// @Summary Login user
// @Description Authenticates user and returns tokens
// @Tags auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} AuthResponse "Successfully authenticated"
// @Failure 400 {object} ErrorResponse "Invalid input data"
// @Failure 401 {object} ErrorResponse "Invalid credentials"
// @Failure 500 {object} ErrorResponse "Internal server error"
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[ERROR] Login: Invalid request format: %v", err)
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error: err.Error(),
			Code:  "invalid_request",
		})
		return
	}

	log.Printf("[DEBUG] Login: Attempting login for email: %s", req.Email)
	authResponse, err := h.uc.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		log.Printf("[ERROR] Login: Failed login attempt for email %s: %v", req.Email, err)
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error: "Неверные учетные данные",
			Code:  "invalid_credentials",
		})
		return
	}

	log.Printf("[DEBUG] Login: Successful login for email: %s", req.Email)
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie(
		"refresh_token",
		authResponse.RefreshToken,
		int(15*24*time.Hour/time.Second),
		"/",
		"",
		false,
		true,
	)

	c.JSON(http.StatusOK, authResponse)
}

// Refresh godoc
// @Summary Refresh tokens
// @Description Refreshes access and refresh tokens using refresh token from cookie
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} AuthResponse "Tokens successfully refreshed"
// @Failure 401 {object} ErrorResponse "Invalid or expired refresh token"
// @Failure 500 {object} ErrorResponse "Internal server error"
// @Router /auth/refresh [post]
func (h *AuthHandler) Refresh(c *gin.Context) {
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error: "Требуется refresh token",
			Code:  "refresh_token_required",
		})
		return
	}

	authResponse, err := h.uc.RefreshTokens(c.Request.Context(), refreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error: err.Error(),
			Code:  "invalid_refresh_token",
		})
		return
	}

	c.SetCookie(
		"refresh_token",
		authResponse.RefreshToken,
		int(15*24*time.Hour/time.Second),
		"/",
		"",
		false,
		true,
	)

	c.JSON(http.StatusOK, authResponse)
}

// Logout godoc
// @Summary Logout user
// @Description Invalidates refresh token and clears cookie
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} MessageResponse "Successfully logged out"
// @Failure 401 {object} ErrorResponse "Invalid token"
// @Failure 500 {object} ErrorResponse "Internal server error"
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil {
		c.JSON(http.StatusOK, MessageResponse{Message: "Уже вышли из системы"})
		return
	}

	err = h.uc.Logout(c.Request.Context(), refreshToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error: err.Error(),
			Code:  "logout_failed",
		})
		return
	}

	c.SetCookie(
		"refresh_token",
		"",
		-1,
		"/",
		"",
		false,
		true,
	)

	c.JSON(http.StatusOK, MessageResponse{Message: "Успешный выход из системы"})
}

// ValidateToken godoc
// @Summary Validate token
// @Description Validates JWT token
// @Tags auth
// @Produce json
// @Param token query string true "JWT token to validate"
// @Success 200 {object} TokenValidationResponse "Token validation result"
// @Failure 400 {object} ErrorResponse "Missing token"
// @Failure 500 {object} ErrorResponse "Validation error"
// @Router /auth/validate [get]
func (h *AuthHandler) ValidateToken(c *gin.Context) {
	tokenString := c.Query("token")
	if tokenString == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error: "Требуется параметр token",
			Code:  "token_required",
		})
		return
	}

	valid, err := h.uc.ValidateToken(c.Request.Context(), tokenString)
	if err != nil {
		c.JSON(http.StatusInternalServerError, TokenValidationResponse{
			Valid: false,
			Error: "Ошибка проверки токена",
		})
		return
	}

	c.JSON(http.StatusOK, TokenValidationResponse{Valid: valid})
}

// AuthMiddleware middleware для проверки аутентификации
// @Security ApiKeyAuth
// @Param Authorization header string true "Bearer {token}"
func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("[DEBUG] AuthMiddleware: Starting token validation")
		tokenString := extractToken(c)
		if tokenString == "" {
			log.Printf("[ERROR] AuthMiddleware: No token found in request")
			c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{
				Error: "Требуется токен авторизации",
				Code:  "token_required",
			})
			return
		}

		log.Printf("[DEBUG] AuthMiddleware: Parsing token")
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				log.Printf("[ERROR] AuthMiddleware: Unexpected signing method: %v", token.Header["alg"])
				return nil, fmt.Errorf("неожиданный метод подписи: %v", token.Header["alg"])
			}
			return []byte(cfg.Auth.SecretKey), nil
		})

		if err != nil {
			log.Printf("[ERROR] AuthMiddleware: Token parsing failed: %v", err)
			c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{
				Error: "Недействительный токен",
				Code:  "invalid_token",
			})
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			log.Printf("[DEBUG] AuthMiddleware: Token is valid, user_id: %v", claims["user_id"])
			c.Set("user_id", claims["user_id"])
			c.Set("username", claims["username"].(string))
			c.Next()
		} else {
			log.Printf("[ERROR] AuthMiddleware: Invalid token claims")
			c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{
				Error: "Недействительные данные токена",
				Code:  "invalid_claims",
			})
		}
	}
}

func extractToken(c *gin.Context) string {
	tokenString := c.GetHeader("Authorization")
	if tokenString != "" {
		log.Printf("[DEBUG] extractToken: Found token in Authorization header")
		return strings.Replace(tokenString, "Bearer ", "", 1)
	}

	tokenString, _ = c.Cookie("access_token")
	if tokenString != "" {
		log.Printf("[DEBUG] extractToken: Found token in access_token cookie")
		return tokenString
	}

	tokenString = c.Query("token")
	if tokenString != "" {
		log.Printf("[DEBUG] extractToken: Found token in query parameter")
	} else {
		log.Printf("[DEBUG] extractToken: No token found in request")
	}
	return tokenString
}
