package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/lera-guryan2222/fooorum/forum-service/internal/entity"
)

type CommentRepository interface {
	CreateComment(ctx context.Context, comment *entity.Comment) error
	GetCommentsByPostID(ctx context.Context, postID int) ([]entity.Comment, error)
	DeleteComment(ctx context.Context, commentID int, userID int) error
}

func (p *Postgres) CreateComment(ctx context.Context, comment *entity.Comment) error {
	query := `INSERT INTO comments (content, post_id, user_id) 
				VALUES ($1, $2, $3)
				RETURNING id, created_at`
	return p.db.QueryRowContext(ctx, query,
		comment.Content, comment.PostID, comment.UserID).
		Scan(&comment.ID, &comment.CreatedAt)
}

func (p *Postgres) GetCommentsByPostID(ctx context.Context, postID int) ([]entity.Comment, error) {
	query := `
			SELECT 
				c.id, 
				c.content, 
				c.post_id, 
				c.user_id, 
				u.username AS author,
				c.created_at
			FROM comments c
			JOIN users u ON c.user_id = u.id
			WHERE c.post_id = $1
			ORDER BY c.created_at
		`
	rows, err := p.db.QueryContext(ctx, query, postID)
	if err != nil {
		return nil, fmt.Errorf("failed to query comments for post %d: %w", postID, err)
	}
	defer rows.Close()

	var comments []entity.Comment
	for rows.Next() {
		var comment entity.Comment
		if err := rows.Scan(
			&comment.ID,
			&comment.Content,
			&comment.PostID,
			&comment.UserID,
			&comment.Author,
			&comment.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan comment: %w", err)
		}
		comments = append(comments, comment)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}
	return comments, nil
}

func (p *Postgres) DeleteComment(ctx context.Context, commentID int, userID int) error {
	// First check if user is admin
	var userRole string
	err := p.db.QueryRowContext(ctx, "SELECT role FROM users WHERE id = $1", userID).Scan(&userRole)
	if err != nil {
		return fmt.Errorf("failed to check user role: %w", err)
	}

	var query string
	var args []interface{}
	if userRole == "admin" {
		// Admin can delete any comment
		query = `DELETE FROM comments WHERE id = $1`
		args = []interface{}{commentID}
	} else {
		// Regular users can only delete their own comments
		query = `DELETE FROM comments WHERE id = $1 AND user_id = $2`
		args = []interface{}{commentID, userID}
	}

	result, err := p.db.ExecContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to delete comment: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}
