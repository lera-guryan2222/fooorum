import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { theme } from '../styles/theme';

const formatTime = (date) => {
  if (!(date instanceof Date) || isNaN(date)) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Message = ({ message, isOwnMessage }) => (
  <div style={{
    marginBottom: theme.spacing.sm,
    display: 'flex',
    flexDirection: 'column',
    alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
  }}>
    <div style={{
      backgroundColor: isOwnMessage ? theme.colors.primary : theme.colors.surface,
      color: isOwnMessage ? 'white' : theme.colors.text.primary,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      maxWidth: '70%',
      boxShadow: theme.shadows.sm,
      position: 'relative'
    }}>
      {!isOwnMessage && (
        <span style={{
          fontWeight: '600',
          fontSize: theme.typography.sizes.sm,
          marginBottom: theme.spacing.xs,
          display: 'block',
          color: theme.colors.text.secondary
        }}>
          {message.author}
        </span>
      )}
      <p style={{ margin: 0, wordBreak: 'break-word' }}>{message.text}</p>
      <span style={{
        fontSize: theme.typography.sizes.xs,
        color: isOwnMessage ? 'rgba(255,255,255,0.8)' : theme.colors.text.light,
        marginTop: theme.spacing.xs,
        display: 'block',
        textAlign: 'right'
      }}>
        {formatTime(message.created_at)}
      </span>
    </div>
  </div>
);

const Chat = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState(null);
  const [ws, setWs] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const sentMessageIds = useRef(new Set());
  const messagesContainerRef = useRef(null);
  const cleanupIntervalRef = useRef(null);

  const parseMessageDate = (message) => ({
    ...message,
    created_at: message.created_at ? new Date(message.created_at) : new Date()
  });

  const sortMessages = (messages) => (
    [...messages].sort((a, b) => b.created_at - a.created_at)
  );

  const cleanupOldMessages = useCallback(() => {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    setMessages(prev => sortMessages(prev.filter(msg => msg.created_at > thirtyMinutesAgo)));
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get('http://localhost:8081/chat/messages', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const parsedMessages = (response.data || []).map(parseMessageDate);
      setMessages(sortMessages(parsedMessages));
      parsedMessages.forEach(msg => sentMessageIds.current.add(msg.id));
      setError(null);
    } catch (err) {
      setError('Failed to load messages. Please try again later.');
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    cleanupIntervalRef.current = setInterval(cleanupOldMessages, 60 * 1000);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8081/chat/ws`;
    
    const connectWebSocket = () => {
      const socket = new WebSocket(wsUrl);
      setWs(socket);
      setIsConnecting(true);

      socket.onopen = () => {
        setIsConnecting(false);
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

      socket.onerror = () => {
        setError('Connection error. Trying to reconnect...');
        setIsConnecting(true);
      };

      socket.onclose = () => {
        setIsConnecting(true);
        setTimeout(connectWebSocket, 5000);
      };
    };

    connectWebSocket();

    return () => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.close();
      }
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [fetchMessages, cleanupOldMessages]);

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
        setError(null);
      } else {
        setError('Connection not ready. Please wait...');
      }
    } catch (err) {
      setError('Failed to send message. Please try again.');
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.lg,
      boxShadow: theme.shadows.lg
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg
      }}>
        <h2 style={{
          margin: 0,
          color: theme.colors.text.primary,
          fontSize: theme.typography.sizes['2xl']
        }}>
          Chat Room
        </h2>
        {isConnecting && (
          <div style={{
            color: theme.colors.warning,
            fontSize: theme.typography.sizes.sm,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm
          }}>
            <span>Connecting...</span>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          backgroundColor: `${theme.colors.danger}10`,
          color: theme.colors.danger,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          marginBottom: theme.spacing.lg
        }}>
          {error}
        </div>
      )}

      <div style={{
        height: '500px',
        overflowY: 'auto',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.lg,
        width: '100%'
      }} ref={messagesContainerRef}>
        <div style={{
          display: 'flex',
          flexDirection: 'column-reverse'
        }}>
          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              isOwnMessage={message.author === currentUser?.username}
            />
          ))}
        </div>
      </div>

      {isAuthenticated ? (
        <form onSubmit={handleSendMessage} style={{
          display: 'flex',
          gap: theme.spacing.md,
          width: '100%'
        }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            style={{
              flex: 1,
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.text.light}`,
              fontSize: theme.typography.sizes.base,
              outline: 'none',
              minWidth: '200px',
              transition: 'all 0.2s ease',
              ':focus': {
                borderColor: theme.colors.primary,
                boxShadow: `0 0 0 2px ${theme.colors.primary}20`
              }
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            style={{
              backgroundColor: theme.colors.primary,
              color: 'white',
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              borderRadius: theme.borderRadius.md,
              border: 'none',
              cursor: 'pointer',
              fontSize: theme.typography.sizes.base,
              fontWeight: '600',
              minWidth: '100px',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              opacity: !newMessage.trim() ? '0.7' : '1',
              ':hover': {
                backgroundColor: theme.colors.secondary
              }
            }}
          >
            Send Message
          </button>
        </form>
      ) : (
        <div style={{
          textAlign: 'center',
          color: theme.colors.text.secondary,
          padding: theme.spacing.lg
        }}>
          Please log in to participate in the chat.
        </div>
      )}
    </div>
  );
};

export default Chat;