package usecase

import (
	"context"
	"errors"
	"net"
	"sync"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/lera-guryan2222/fooorum/forum-service/internal/entity"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockWebSocketConnection реализует интерфейс WebSocketConnection для тестирования
type MockWebSocketConnection struct {
	mock.Mock
	closed bool
	mutex  sync.Mutex
}

func (m *MockWebSocketConnection) WriteJSON(v interface{}) error {
	args := m.Called(v)
	return args.Error(0)
}

func (m *MockWebSocketConnection) ReadJSON(v interface{}) error {
	args := m.Called(v)
	return args.Error(0)
}

func (m *MockWebSocketConnection) Close() error {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.closed = true
	args := m.Called()
	return args.Error(0)
}

func (m *MockWebSocketConnection) WriteMessage(messageType int, data []byte) error {
	args := m.Called(messageType, data)
	return args.Error(0)
}

func (m *MockWebSocketConnection) ReadMessage() (messageType int, p []byte, err error) {
	args := m.Called()
	return args.Int(0), args.Get(1).([]byte), args.Error(2)
}

func (m *MockWebSocketConnection) SetReadLimit(limit int64) {
	m.Called(limit)
}

func (m *MockWebSocketConnection) SetReadDeadline(t time.Time) error {
	args := m.Called(t)
	return args.Error(0)
}

func (m *MockWebSocketConnection) SetWriteDeadline(t time.Time) error {
	args := m.Called(t)
	return args.Error(0)
}

func (m *MockWebSocketConnection) SetPongHandler(h func(string) error) {
	m.Called(h)
}

func (m *MockWebSocketConnection) SetPingHandler(h func(string) error) {
	m.Called(h)
}

func (m *MockWebSocketConnection) LocalAddr() net.Addr {
	args := m.Called()
	return args.Get(0).(net.Addr)
}

func (m *MockWebSocketConnection) RemoteAddr() net.Addr {
	args := m.Called()
	return args.Get(0).(net.Addr)
}

func (m *MockWebSocketConnection) Subprotocol() string {
	args := m.Called()
	return args.String(0)
}

func (m *MockWebSocketConnection) UnderlyingConn() net.Conn {
	args := m.Called()
	return args.Get(0).(net.Conn)
}

// MockChatRepository реализует интерфейс ChatRepository для тестирования
type MockChatRepository struct {
	mock.Mock
}

func (m *MockChatRepository) SaveChatMessage(ctx context.Context, msg *entity.ChatMessage) error {
	args := m.Called(ctx, msg)
	return args.Error(0)
}

func (m *MockChatRepository) GetChatMessages(ctx context.Context, limit int) ([]entity.ChatMessage, error) {
	args := m.Called(ctx, limit)
	return args.Get(0).([]entity.ChatMessage), args.Error(1)
}

func (m *MockChatRepository) DeleteOldChatMessages(ctx context.Context, olderThan time.Duration) error {
	args := m.Called(ctx, olderThan)
	return args.Error(0)
}

// MockAuthUseCase реализует интерфейс AuthUseCaseInterface для тестирования
type MockAuthUseCase struct {
	mock.Mock
}

func (m *MockAuthUseCase) SecretKey() []byte {
	args := m.Called()
	return args.Get(0).([]byte)
}

func (m *MockAuthUseCase) GenerateToken(userID int, username string) (string, error) {
	args := m.Called(userID, username)
	return args.String(0), args.Error(1)
}

func (m *MockAuthUseCase) ParseToken(tokenString string) (int64, string, error) {
	args := m.Called(tokenString)
	return args.Get(0).(int64), args.String(1), args.Error(2)
}

func TestChatUseCase_SendMessage(t *testing.T) {
	tests := []struct {
		name    string
		message *entity.ChatMessage
		mockErr error
		wantErr bool
	}{
		{
			name: "успешная отправка",
			message: &entity.ChatMessage{
				UserID: 1,
				Author: "test",
				Text:   "Hello",
			},
			mockErr: nil,
			wantErr: false,
		},
		{
			name: "ошибка сохранения",
			message: &entity.ChatMessage{
				UserID: 1,
				Author: "test",
				Text:   "Hello",
			},
			mockErr: errors.New("db error"),
			wantErr: true,
		},
		{
			name:    "nil message",
			message: nil,
			mockErr: nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockChatRepository)
			mockAuth := new(MockAuthUseCase)

			if tt.message != nil {
				mockRepo.On("SaveChatMessage", mock.Anything, tt.message).Return(tt.mockErr)
			}

			uc := NewChatUseCase(mockRepo, mockAuth)
			err := uc.SendMessage(context.Background(), tt.message)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

func TestChatUseCase_GetMessages(t *testing.T) {
	tests := []struct {
		name       string
		limit      int
		mockMsgs   []entity.ChatMessage
		mockErr    error
		cleanupErr error
		wantErr    bool
		wantLength int
	}{
		{
			name:  "успешное получение",
			limit: 10,
			mockMsgs: []entity.ChatMessage{
				{ID: 1, UserID: 1, Author: "test1", Text: "Hello"},
				{ID: 2, UserID: 2, Author: "test2", Text: "Hi"},
			},
			mockErr:    nil,
			cleanupErr: nil,
			wantErr:    false,
			wantLength: 2,
		},
		{
			name:       "пустой результат",
			limit:      10,
			mockMsgs:   []entity.ChatMessage{},
			mockErr:    nil,
			cleanupErr: nil,
			wantErr:    false,
			wantLength: 0,
		},
		{
			name:       "ошибка очистки",
			limit:      10,
			mockMsgs:   nil,
			mockErr:    nil,
			cleanupErr: errors.New("cleanup error"),
			wantErr:    true,
			wantLength: 0,
		},
		{
			name:       "ошибка базы данных",
			limit:      10,
			mockMsgs:   nil,
			mockErr:    errors.New("db error"),
			cleanupErr: nil,
			wantErr:    true,
			wantLength: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockChatRepository)
			mockAuth := new(MockAuthUseCase)

			mockRepo.On("DeleteOldChatMessages", mock.Anything, 30*time.Minute).Return(tt.cleanupErr)
			if tt.cleanupErr == nil {
				mockRepo.On("GetChatMessages", mock.Anything, tt.limit).Return(tt.mockMsgs, tt.mockErr)
			}

			uc := NewChatUseCase(mockRepo, mockAuth)
			messages, err := uc.GetMessages(context.Background(), tt.limit)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Len(t, messages, tt.wantLength)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

func TestChatUseCase_HandleWebSocket(t *testing.T) {
	tests := []struct {
		name           string
		maxConnections int
		setupMock      func(*MockWebSocketConnection, *MockChatRepository, *MockAuthUseCase)
		wantClosed     bool
	}{
		{
			name:           "успешное подключение",
			maxConnections: 100,
			setupMock: func(m *MockWebSocketConnection, r *MockChatRepository, a *MockAuthUseCase) {
				// Мокаем базовые операции WebSocket
				m.On("WriteMessage", websocket.CloseMessage, mock.Anything).Return(nil).Maybe()
				m.On("Close").Return(nil).Maybe() // Разрешаем любое количество вызовов Close()

				// Мокаем очистку старых сообщений
				r.On("DeleteOldChatMessages", mock.Anything, 30*time.Minute).Return(nil).Once()

				// Мокаем успешное чтение сообщения
				m.On("ReadJSON", mock.AnythingOfType("*struct { Text string \"json:\\\"text\\\"\"; Token string \"json:\\\"token\\\"\" }")).
					Return(nil).
					Run(func(args mock.Arguments) {
						msg := args.Get(0).(*struct {
							Text  string `json:"text"`
							Token string `json:"token"`
						})
						msg.Text = "test message"
						msg.Token = "valid_token"
					}).Once()

				// После первого успешного чтения возвращаем ошибку закрытия соединения
				m.On("ReadJSON", mock.Anything).Return(errors.New("websocket: close sent")).Once()

				// Мокаем успешную валидацию токена
				a.On("ParseToken", "valid_token").Return(int64(1), "testuser", nil).Once()

				// Мокаем сохранение сообщения
				r.On("SaveChatMessage", mock.Anything, mock.AnythingOfType("*entity.ChatMessage")).Return(nil).Once()

				// Мокаем отправку сообщения через WebSocket
				m.On("WriteJSON", mock.AnythingOfType("entity.ChatMessage")).Return(nil).Once()
			},
			wantClosed: true,
		},
		{
			name:           "превышение лимита подключений",
			maxConnections: 0,
			setupMock: func(m *MockWebSocketConnection, r *MockChatRepository, a *MockAuthUseCase) {
				m.On("WriteMessage", websocket.CloseMessage, []byte("too many connections")).Return(nil).Once()
				m.On("Close").Return(nil).Maybe() // Разрешаем любое количество вызовов Close()
			},
			wantClosed: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockChatRepository)
			mockAuth := new(MockAuthUseCase)
			mockConn := new(MockWebSocketConnection)

			tt.setupMock(mockConn, mockRepo, mockAuth)

			uc := NewChatUseCase(mockRepo, mockAuth)
			uc.hub.maxConnections = tt.maxConnections

			done := make(chan struct{})
			go func() {
				uc.HandleWebSocket(mockConn)
				close(done)
			}()

			// Ждем завершения обработки или таймаута
			select {
			case <-done:
				// Обработка завершилась нормально
			case <-time.After(500 * time.Millisecond):
				// Если тест не превышение лимита, закрываем соединение
				if !tt.wantClosed {
					mockConn.Close()
				}
			}

			time.Sleep(100 * time.Millisecond) // Даем время на завершение всех операций

			mockConn.mutex.Lock()
			assert.Equal(t, tt.wantClosed, mockConn.closed)
			mockConn.mutex.Unlock()

			mockConn.AssertExpectations(t)
			mockRepo.AssertExpectations(t)
			mockAuth.AssertExpectations(t)
		})
	}
}

func TestWebSocketHub_Operations(t *testing.T) {
	hub := newWebSocketHub(100)
	hubDone := make(chan struct{})
	go func() {
		hub.run()
		close(hubDone)
	}()

	client := &WebSocketClient{
		send: make(chan entity.ChatMessage, 256),
	}

	// Тест регистрации клиента
	hub.register <- client
	time.Sleep(50 * time.Millisecond)
	assert.True(t, hub.clients[client])

	// Тест отправки сообщения
	msg := entity.ChatMessage{
		UserID: 1,
		Author: "test",
		Text:   "Hello",
	}
	hub.broadcast <- msg

	// Тест отмены регистрации клиента
	hub.unregister <- client
	time.Sleep(50 * time.Millisecond)
	assert.False(t, hub.clients[client])

	// Завершаем тест
	close(hub.done) // Закрываем канал done только один раз
	<-hubDone       // Ждем завершения горутины hub.run()
}
