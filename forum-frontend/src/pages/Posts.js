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

      // Добавляем проверку на наличие comments в каждом посте
      const postsWithComments = response.data.map(post => ({
        ...post,
        comments: post.comments || [] // Если comments нет, устанавливаем пустой массив
      }));

      setPosts(postsWithComments);
      setError("");
    } catch (err) {
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
                    </div>
                    <div className="post-date">
                      {new Date(post.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="post-content">
                    {post.content}
                  </div>

                  {(isAuthenticated && (currentUser.userId === post.user_id || currentUser.role === 'admin')) && (
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
                      {expandedComments[post.id] ? "Скрыть" : "Показать"} комментарии (
                      {(post.comments || []).length})
                    </button>

                    {expandedComments[post.id] && (
                      <div className="comments-list">
                        {(post.comments || []).map(comment => (
                          <div key={`comment-${comment.id}`} className="comment">
                            <p>{comment.content}</p>
                            <small>
                              Автор: <strong>{comment.author}</strong>, {new Date(comment.created_at).toLocaleString()}
                            </small>
                            
                            {(isAuthenticated && (currentUser.userId === comment.user_id || currentUser.role === 'admin')) && (
                              <button
                                onClick={() => handleDeleteComment(post.id, comment.id)}
                                className="delete-comment-button"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}

                        {isAuthenticated && (
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
        }
        
        .post-card {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 5px;
          position: relative;
        }
        
        .post-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .post-date {
          color: #666;
        }
        
        .post-content {
          margin: 10px 0;
        }
        
        .delete-post-button {
          position: absolute;
          right: 1px;
          background: #ff4444;
          color: white;
          border: none;
          width: 150px;
          border-radius: 4px;
          padding: 5px 10px;
          cursor: pointer;
        }
        
        .comments-section {
          margin-top: 15px;
        }
        
        .toggle-comments {
          background: none;
          border: none;
          color: #007bff;
          cursor: pointer;
          padding: 5px 0;
        }
        
        .comments-list {
          margin-top: 10px;
        }
        
        .comment {
          padding: 10px;
          margin: 5px 0;
          background: #f5f5f5;
          border-radius: 4px;
          position: relative;
        }
        
        .delete-comment-button {
          position: absolute;
          top: 5px;
          right: 5px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #ff4444;
          font-size: 1.2rem;
        }
        
        .add-comment {
          margin-top: 15px;
        }
        
        .add-comment textarea {
          width: 100%;
          padding: 8px;
          margin-bottom: 5px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .add-comment-button {
          padding: 5px 10px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .add-comment-button:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default Posts;