import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Chat = () => {
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState(null);
  const [ws, setWs] = useState(null);
  const sentMessageIds = useRef(new Set());
  const messagesContainerRef = useRef(null);
  const cleanupIntervalRef = useRef(null);

  const parseMessageDate = (message) => {
    return {
      ...message,
      created_at: message.created_at ? new Date(message.created_at) : new Date()
    };
  };

  // Функция для сортировки сообщений (новые сверху)
  const sortMessages = (messages) => {
    return [...messages].sort((a, b) => b.created_at - a.created_at);
  };

  // Функция для удаления старых сообщений (старше 30 минут)
  const cleanupOldMessages = () => {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    
    setMessages(prev => 
      sortMessages(prev.filter(msg => msg.created_at > thirtyMinutesAgo))
    );
  };

  const fetchMessages = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get('http://localhost:8081/chat/messages', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const parsedMessages = (response.data || []).map(parseMessageDate);
      setMessages(sortMessages(parsedMessages));
      parsedMessages.forEach(msg => sentMessageIds.current.add(msg.id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load messages');
    }
  }, []);

  useEffect(() => {
    fetchMessages();

    // Устанавливаем интервал для очистки старых сообщений (каждую минуту)
    cleanupIntervalRef.current = setInterval(cleanupOldMessages, 60 * 1000);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8081/chat/ws`;
    
    const socket = new WebSocket(wsUrl);
    setWs(socket);

    socket.onopen = () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        socket.send(JSON.stringify({ type: 'auth', token }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const parsedMessage = parseMessageDate(message);
        
        if (!sentMessageIds.current.has(parsedMessage.id)) {
          sentMessageIds.current.add(parsedMessage.id);
          setMessages(prev => sortMessages([...prev, parsedMessage]));
        }
      } catch (err) {
        console.error('Error parsing message:', err);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error');
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
      setTimeout(() => {
        setWs(new WebSocket(wsUrl));
      }, 5000);
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [fetchMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !isAuthenticated) return;

    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('No authentication token');
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          text: newMessage,
          token: token
        }));
        setNewMessage('');
      } else {
        setError('Connection not ready. Please wait...');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
    }
  };

  const formatTime = (date) => {
    if (!(date instanceof Date) || isNaN(date)) {
      return '';
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h3 style={{ textAlign: 'center' }}>Chat</h3>
      {error && <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>}

      {isAuthenticated && (
        <form onSubmit={handleSendMessage} style={{ display: 'flex', marginBottom: '10px' }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            style={{ 
              flex: 1,
              width:'150px',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px 0 0 4px'
            }}
          />
          <button 
            type="submit"
            style={{
              padding: '8px 15px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '0 4px 4px 0',
              cursor: 'pointer'
            }}
          >
            Send
          </button>
        </form>
      )}

      <div 
        ref={messagesContainerRef}
        style={{ 
          height: '400px', 
          width: '200px',
          overflowY: 'auto', 
          border: '1px solid #ddd', 
          padding: '10px',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column-reverse'
        }}
      >
        {messages.map((message) => (
          <div 
            key={message.id}
            style={{ 
              marginBottom: '10px', 
              padding: '8px', 
              backgroundColor: '#f5f5f5',
              borderRadius: '4px'
            }}
          >
            <strong style={{ color: '#333' }}>{message.author}: </strong>
            <span style={{ color: '#555' }}>{message.text}</span>
            <div style={{ 
              fontSize: '0.8em', 
              color: '#777',
              textAlign: 'right'
            }}>
              {formatTime(message.created_at)}
            </div>
          </div>
        ))}
      </div>          
    </div>
  );
};

export default Chat;