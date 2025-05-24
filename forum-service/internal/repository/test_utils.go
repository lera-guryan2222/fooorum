package repository

import (
	"database/sql"
	"fmt"
)

func setupTestDB() (*Postgres, error) {
	// Строка подключения к тестовой базе данных
	connStr := "user=postgres dbname=PG sslmode=disable password=postgres"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("не удалось открыть базу данных: %v", err)
	}

	// Создаем необходимые таблицы, если они не существуют
	_, err = db.Exec(`
		-- Сначала удаляем зависимые таблицы
		DROP TABLE IF EXISTS comments CASCADE;
		DROP TABLE IF EXISTS chat_messages CASCADE;
		DROP TABLE IF EXISTS posts CASCADE;
		DROP TABLE IF EXISTS users CASCADE;

		-- Теперь создаем таблицы в правильном порядке
		CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			username VARCHAR(255) NOT NULL,
			email VARCHAR(255) NOT NULL UNIQUE,
			password_hash VARCHAR(255) NOT NULL,
			role VARCHAR(50) DEFAULT 'user'
		);

		CREATE TABLE IF NOT EXISTS posts (
			id SERIAL PRIMARY KEY,
			title VARCHAR(255) NOT NULL,
			content TEXT NOT NULL,
			user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS comments (
			id SERIAL PRIMARY KEY,
			content TEXT NOT NULL,
			post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
			user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS chat_messages (
			id SERIAL PRIMARY KEY,
			user_id INTEGER,
			author VARCHAR(255),
			text TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return nil, fmt.Errorf("не удалось создать таблицы: %v", err)
	}

	return &Postgres{db: db}, nil
}
