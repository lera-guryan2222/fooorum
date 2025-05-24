import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import PostForm from "../components/CreatePost";

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentTexts, setCommentTexts] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const { isAuthenticated } = useContext(AuthContext);
  const [currentUser, setCurrentUser] = useState({ 
    username: null, 
    userId: null,
    role: 'user'
  });
  const [editingPost, setEditingPost] = useState(null);

  const parseJwtToken = (token) => {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Токен отсутствует или не является строкой');
      }
      
      token = token.replace(/^"(.*)"$/, '$1');
      
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error(`Неверный формат токена: ожидается 3 части, получено ${parts.length}`);
      }
  
      if (!parts[0] || !parts[1] || !parts[2]) {
        throw new Error('Токен содержит пустые части');
      }
  
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      return JSON.parse(jsonPayload);
    } catch (err) {
      console.error("Ошибка парсинга токена:", err);
      localStorage.removeItem('access_token');
      return null;
    }
  };

  useEffect(() => {
    const getUserData = () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return null;

        const decoded = parseJwtToken(token);
        if (!decoded) return null;

        return {
          userId: decoded.user_id,
          username: decoded.username,
          role: decoded.role || 'user'
        };
      } catch (error) {
        console.error('Ошибка получения данных пользователя:', error);
        return null;
      }
    };

    if (isAuthenticated) {
      const user = getUserData();
      setCurrentUser(user || { username: null, userId: null, role: 'user' });
    }
  }, [isAuthenticated]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const response = await axios.get("http://localhost:8081/posts", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { includeComments: true }
      });

      // Показываем данные через alert
      if (response.data && response.data.length > 0) {
        alert('Post data: ' + JSON.stringify(response.data[0], null, 2));
      }

      // Обрабатываем посты точно так же, как в старом рабочем коде
      const postsWithComments = response.data.map(post => ({
        ...post,
        comments: post.comments || []
      }));

      setPosts(postsWithComments);
      setError("");
    } catch (err) {
      alert('Error: ' + JSON.stringify(err.response?.data, null, 2));
      setError(err.response?.data?.error || "Не удалось загрузить посты");
    } finally {
      setLoading(false);
    }
  };

  const handleCommentChange = (postId, text) => {
    setCommentTexts(prev => ({ ...prev, [postId]: text }));
  };

  const handleAddComment = async (postId) => {
    if (!commentTexts[postId]?.trim()) return;
  
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        `http://localhost:8081/posts/${postId}/comments`,
        { content: commentTexts[postId] },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPosts(posts.map(post => 
        post.id === postId ? { 
          ...post, 
          comments: [
            ...(post.comments || []), 
            {
              ...response.data,
              author: currentUser.username || "Вы"
            }
          ]
        } : post
      ));
      setCommentTexts(prev => ({ ...prev, [postId]: "" }));
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось добавить комментарий");
    }
  };

  const canDeleteComment = (comment) => {
    if (!isAuthenticated || !currentUser) return false;
    return currentUser.role === 'admin' || currentUser.userId === comment.user_id;
  };

  const canDeletePost = (post) => {
    if (!isAuthenticated || !currentUser) return false;
    return currentUser.role === 'admin' || currentUser.userId === post.user_id;
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(
        `http://localhost:8081/posts/${postId}/comments/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPosts(posts.map(post =>
        post.id === postId ? {
          ...post,
          comments: (post.comments || []).filter(c => c.id !== commentId)
        } : post
      ));
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось удалить комментарий");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Вы уверены, что хотите удалить этот пост?")) return;

    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`http://localhost:8081/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(posts.filter(post => post.id !== postId));
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось удалить пост");
    }
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
  };

  const handleEditComplete = (updatedPost) => {
    setPosts(posts.map(post => 
      post.id === updatedPost.id ? updatedPost : post
    ));
    setEditingPost(null);
  };

  useEffect(() => { 
    fetchPosts(); 
  }, [isAuthenticated]);

  if (loading) return <div className="loading">Загрузка постов...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="posts-container">
      <h2>Последние посты</h2>
      {!posts || posts.length === 0 ? (
        <p>Пока нет постов. Будьте первым!</p>
      ) : (
        <div className="posts-list">
          {posts.map((post) => (
            <div key={`post-${post.id}`} className="post-card">
              {editingPost?.id === post.id ? (
                <PostForm
                  postToEdit={post}
                  onEditComplete={handleEditComplete}
                />
              ) : (
                <>
                  <div className="post-header">
                    <div>
                      <h3>{post.title}</h3>
                      <small>
                        Автор: <strong>{post.author}</strong>
                      </small>
                      <div className="post-date">
                        {new Date(post.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="post-content">
                    {post.content}
                  </div>

                  {canDeletePost(post) && (
                    <div className="post-actions">
                      <button
                        onClick={() => handleEditPost(post)}
                        className="edit-post-button"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="delete-post-button"
                      >
                        Удалить пост
                      </button>
                    </div>
                  )}

                  <div className="comments-section">
                    <button
                      onClick={() => setExpandedComments(prev => ({
                        ...prev,
                        [post.id]: !prev[post.id]
                      }))}
                      className="toggle-comments"
                    >
                      {expandedComments[post.id] ? "Скрыть" : "Показать"} комментарии ({(post.comments || []).length})
                    </button>

                    {expandedComments[post.id] && (
                      <div className="comments-list">
                        {(post.comments || []).map(comment => (
                          <div key={`comment-${comment.id}`} className="comment">
                            <p>{comment.content}</p>
                            <div className="comment-meta">
                              <small className="author-info">
                                Автор: <strong>{comment.author || 'Неизвестный пользователь'}</strong>
                                {comment.author_role && comment.author_role !== 'user' && (
                                  <span className={`role-badge ${comment.author_role}`}>
                                    {comment.author_role}
                                  </span>
                                )}
                              </small>
                              <span className="comment-date">
                                {new Date(comment.created_at).toLocaleString()}
                              </span>
                            </div>
                            
                            {canDeleteComment(comment) && (
                              <button
                                onClick={() => handleDeleteComment(post.id, comment.id)}
                                className="delete-comment-button"
                                title="Удалить комментарий"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}

                        {isAuthenticated ? (
                          <div className="add-comment">
                            <textarea
                              value={commentTexts[post.id] || ""}
                              onChange={(e) => handleCommentChange(post.id, e.target.value)}
                              placeholder="Написать комментарий..."
                            />
                            <button
                              onClick={() => handleAddComment(post.id)}
                              disabled={!commentTexts[post.id]?.trim()}
                              className="add-comment-button"
                            >
                              Добавить комментарий
                            </button>
                          </div>
                        ) : (
                          <div className="login-to-comment">
                            Войдите, чтобы оставить комментарий
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .posts-container {
          margin-top: 30px;
          padding: 0 20px;
        }
        
        .loading, .error {
          padding: 20px;
          text-align: center;
        }
        
        .error {
          color: #dc3545;
        }
        
        .posts-list {
          display: grid;
          gap: 20px;
          margin-bottom: 40px;
        }
        
        .post-card {
          border: 1px solid #ddd;
          padding: 20px;
          border-radius: 8px;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          position: relative;
        }
        
        .post-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }
        
        .post-header h3 {
          margin: 0 0 5px 0;
          color: #2c3e50;
        }
        
        .post-meta,
        .comment-meta {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-top: 5px;
          color: #666;
          font-size: 0.9em;
        }

        .author-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .role-badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.8em;
          font-weight: 500;
          text-transform: capitalize;
        }

        .role-badge.admin {
          background-color: #ff5722;
          color: white;
        }

        .role-badge.moderator {
          background-color: #2196F3;
          color: white;
        }

        .post-date,
        .comment-date {
          color: #999;
        }
        
        .post-content {
          margin: 15px 0;
          line-height: 1.6;
          color: #2c3e50;
        }
        
        .post-actions {
          display: flex;
          gap: 10px;
          margin: 15px 0;
        }
        
        .edit-post-button,
        .delete-post-button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9em;
          transition: all 0.2s ease;
        }
        
        .edit-post-button {
          background: #4CAF50;
          color: white;
        }
        
        .delete-post-button {
          background: #f44336;
          color: white;
        }
        
        .comments-section {
          margin-top: 20px;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
        
        .toggle-comments {
          background: none;
          border: none;
          color: #2196F3;
          cursor: pointer;
          padding: 5px 0;
          font-size: 0.9em;
        }
        
        .comments-list {
          margin-top: 15px;
        }
        
        .comment {
          padding: 15px;
          margin: 10px 0;
          background: #f8f9fa;
          border-radius: 6px;
          position: relative;
        }
        
        .comment p {
          margin: 0 0 10px 0;
          color: #2c3e50;
        }
        
        .delete-comment-button {
          position: absolute;
          top: 10px;
          right: 10px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #dc3545;
          font-size: 1.2rem;
          padding: 0 5px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        
        .delete-comment-button:hover {
          background: rgba(220, 53, 69, 0.1);
        }
        
        .add-comment {
          margin-top: 20px;
        }
        
        .add-comment textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          margin-bottom: 10px;
          min-height: 80px;
          resize: vertical;
          font-family: inherit;
        }
        
        .add-comment-button {
          padding: 8px 16px;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9em;
          transition: all 0.2s ease;
        }
        
        .add-comment-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .add-comment-button:not(:disabled):hover {
          background: #1976D2;
        }
        
        .login-to-comment {
          text-align: center;
          color: #666;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
          margin-top: 15px;
        }
      `}</style>
    </div>
  );
};

export default Posts;