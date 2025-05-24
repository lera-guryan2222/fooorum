package repository

import (
	"context"
	"testing"

	"github.com/lera-guryan2222/fooorum/forum-service/internal/entity"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockCommentRepository is a mock implementation of CommentRepository
type MockCommentRepository struct {
	mock.Mock
}

func (m *MockCommentRepository) CreateComment(ctx context.Context, comment *entity.Comment) error {
	args := m.Called(ctx, comment)
	return args.Error(0)
}

func (m *MockCommentRepository) GetCommentsByPostID(ctx context.Context, postID int) ([]entity.Comment, error) {
	args := m.Called(ctx, postID)
	return args.Get(0).([]entity.Comment), args.Error(1)
}

func (m *MockCommentRepository) DeleteComment(ctx context.Context, commentID int, userID int) error {
	args := m.Called(ctx, commentID, userID)
	return args.Error(0)
}

func setupTestData(ctx context.Context, repo *Postgres) error {
	// Очищаем таблицы
	_, err := repo.db.ExecContext(ctx, `
		DELETE FROM comments;
		DELETE FROM posts;
		DELETE FROM users;
	`)
	if err != nil {
		return err
	}

	// Создаем тестового пользователя
	_, err = repo.db.ExecContext(ctx, `
		INSERT INTO users (id, username, email, password_hash, role)
		VALUES (1, 'testuser', 'testuser@example.com', 'hashedpassword', 'user')
		RETURNING id
	`)
	if err != nil {
		return err
	}

	// Создаем тестовый пост
	_, err = repo.db.ExecContext(ctx, `
		INSERT INTO posts (id, title, content, user_id)
		VALUES (1, 'Test Post', 'Test Content', 1)
		RETURNING id
	`)
	if err != nil {
		return err
	}

	return nil
}

func TestPostgresCreateComment(t *testing.T) {
	repo, err := setupTestDB()
	if err != nil {
		t.Fatalf("не удалось настроить тестовую базу данных: %v", err)
	}

	ctx := context.Background()

	// Устанавливаем тестовые данные
	err = setupTestData(ctx, repo)
	if err != nil {
		t.Fatalf("не удалось установить тестовые данные: %v", err)
	}

	comment := &entity.Comment{
		Content: "Test comment",
		PostID:  1,
		UserID:  1,
	}

	err = repo.CreateComment(ctx, comment)
	assert.NoError(t, err)
	assert.NotZero(t, comment.ID)
}

func TestPostgresGetCommentsByPostID(t *testing.T) {
	repo, err := setupTestDB()
	if err != nil {
		t.Fatalf("не удалось настроить тестовую базу данных: %v", err)
	}

	ctx := context.Background()

	// Устанавливаем тестовые данные
	err = setupTestData(ctx, repo)
	if err != nil {
		t.Fatalf("не удалось установить тестовые данные: %v", err)
	}

	// Создаем тестовый комментарий
	_, err = repo.db.ExecContext(ctx, `
		INSERT INTO comments (content, post_id, user_id)
		VALUES ('Test comment', 1, 1)
	`)
	if err != nil {
		t.Fatalf("не удалось создать тестовый комментарий: %v", err)
	}

	comments, err := repo.GetCommentsByPostID(ctx, 1)
	assert.NoError(t, err)
	assert.NotEmpty(t, comments)
}

func TestPostgresDeleteComment(t *testing.T) {
	repo, err := setupTestDB()
	if err != nil {
		t.Fatalf("не удалось настроить тестовую базу данных: %v", err)
	}

	ctx := context.Background()

	// Устанавливаем тестовые данные
	err = setupTestData(ctx, repo)
	if err != nil {
		t.Fatalf("не удалось установить тестовые данные: %v", err)
	}

	// Создаем тестовый комментарий
	_, err = repo.db.ExecContext(ctx, `
		INSERT INTO comments (content, post_id, user_id)
		VALUES ('Test comment', 1, 1)
		RETURNING id
	`)
	if err != nil {
		t.Fatalf("не удалось создать тестовый комментарий: %v", err)
	}

	err = repo.DeleteComment(ctx, 1, 1)
	assert.NoError(t, err)
}
