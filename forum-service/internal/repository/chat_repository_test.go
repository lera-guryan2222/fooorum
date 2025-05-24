package repository

import (
	"context"
	"testing"
	"time"

	"github.com/lera-guryan2222/fooorum/forum-service/internal/entity"
	"github.com/stretchr/testify/assert"
)

func TestPostgresCreateChatMessage(t *testing.T) {
	repo, err := setupTestDB()
	if err != nil {
		t.Fatalf("не удалось настроить тестовую базу данных: %v", err)
	}

	ctx := context.Background()
	message := &entity.ChatMessage{
		UserID: 1,
		Author: "testuser",
		Text:   "Hello, World!",
	}

	err = repo.CreateChatMessage(ctx, message)
	assert.NoError(t, err)
	assert.NotZero(t, message.ID)
}

func TestPostgresGetChatMessages(t *testing.T) {
	repo, err := setupTestDB()
	if err != nil {
		t.Fatalf("не удалось настроить тестовую базу данных: %v", err)
	}

	ctx := context.Background()
	limit := 10

	// Вставка тестовых данных
	_, err = repo.db.ExecContext(ctx, `
		INSERT INTO chat_messages (user_id, author, text, created_at)
		VALUES (1, 'testuser', 'Hello, World!', NOW())
	`)
	if err != nil {
		t.Fatalf("не удалось вставить тестовые данные: %v", err)
	}

	messages, err := repo.GetChatMessages(ctx, limit)
	assert.NoError(t, err)
	assert.NotEmpty(t, messages)
}

func TestPostgresSaveChatMessage(t *testing.T) {
	repo, err := setupTestDB()
	if err != nil {
		t.Fatalf("не удалось настроить тестовую базу данных: %v", err)
	}

	ctx := context.Background()
	message := &entity.ChatMessage{
		UserID: 1,
		Author: "testuser",
		Text:   "Hello, World!",
	}

	err = repo.SaveChatMessage(ctx, message)
	assert.NoError(t, err)
	assert.NotZero(t, message.ID)
	assert.NotZero(t, message.CreatedAt)
}

func TestPostgresDeleteOldChatMessages(t *testing.T) {
	repo, err := setupTestDB()
	if err != nil {
		t.Fatalf("не удалось настроить тестовую базу данных: %v", err)
	}

	ctx := context.Background()
	olderThan := time.Hour * 24

	// Вставка тестовых данных
	_, err = repo.db.ExecContext(ctx, `
		INSERT INTO chat_messages (user_id, author, text, created_at)
		VALUES (1, 'testuser', 'Hello, World!', NOW() - INTERVAL '25 hours')
	`)
	if err != nil {
		t.Fatalf("не удалось вставить тестовые данные: %v", err)
	}

	err = repo.DeleteOldChatMessages(ctx, olderThan)
	assert.NoError(t, err)
}
