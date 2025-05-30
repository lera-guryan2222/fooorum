import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import PostForm from "../components/CreatePost";

const Posts = () => {
  console.log('[DEBUG] Posts component rendering. Timestamp:', new Date().toISOString());
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

  useEffect(() => {
    const parseJwtToken = (token) => {
      try {
        if (!token) return null;
        const decoded = JSON.parse(atob(token.split('.')[1]));
        return {
          userId: decoded.user_id,
          username: decoded.username,
          role: decoded.role || 'user'
        };
      } catch (err) {
        console.error("Ошибка парсинга токена:", err);
        return null;
      }
    };

    if (isAuthenticated) {
      const token = localStorage.getItem('access_token');
      const userData = parseJwtToken(token);
      setCurrentUser(userData || { username: null, userId: null, role: 'user' });
    }
  }, [isAuthenticated]);

  const fetchPosts = async () => {
    console.log("[DEBUG] Начинаем загрузку постов");
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      console.log("[DEBUG] Token from localStorage:", token);

      const response = await axios.get("http://localhost:8081/posts", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      console.log("[DEBUG] Raw response from /posts:", response);
      console.log("[DEBUG] Response data:", response.data);

      if (response.data === null) {
        console.log("[DEBUG] Server returned null, using empty array");
        setPosts([]);
        return;
      }

      if (!Array.isArray(response.data)) {
        console.error("[DEBUG] Response data is not an array:", response.data);
        setError("Ответ от сервера не является массивом");
        return;
      }

      const processedPosts = response.data.map((post, index) => {
        console.log(`[DEBUG] Processing post at index ${index}:`, post);
        return {
          ...post,
          authorName: post.author || "Неизвестный пользователь",
          comments: Array.isArray(post.comments) ? post.comments.map(comment => ({
            ...comment,
            authorName: comment.author || "Аноним"
          })) : []
        };
      });

      console.log("[DEBUG] Processed posts:", processedPosts);
      setPosts(processedPosts);
      setError("");
    } catch (err) {
      console.error("[DEBUG] Error fetching posts:", err);
      console.error("[DEBUG] Error response:", err.response);
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
            ...post.comments,
            {
              ...response.data,
              authorName: currentUser.username || "Вы",
              user: { id: currentUser.userId }
            }
          ]
        } : post
      ));
      setCommentTexts(prev => ({ ...prev, [postId]: "" }));
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось добавить комментарий");
    }
  };

  const canModerate = (item) => {
    if (!isAuthenticated) return false;
    return currentUser.role === 'admin' || currentUser.userId === item.user?.id;
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
          comments: post.comments.filter(c => c.id !== commentId)
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
    console.log('[DEBUG] useEffect for fetchPosts triggered. isAuthenticated:', isAuthenticated, 'Timestamp:', new Date().toISOString());
    fetchPosts(); 
  }, [isAuthenticated]);

  if (loading) return <div className="loading">Загрузка постов...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="posts-container">
      <h2>Последние посты</h2>
      {posts.length === 0 ? (
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
                      <div className="post-meta">
                        <span className="author">
                          Автор: <strong>{post.authorName || 'Неизвестный пользователь'}</strong>
                        </span>
                        <span className="post-date">
                          {new Date(post.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {canModerate(post) && (
                      <div className="post-actions">
                        <button onClick={() => handleEditPost(post)}>
                          Редактировать
                        </button>
                        <button 
                          onClick={() => handleDeletePost(post.id)}
                          className="delete"
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="post-content">
                    {post.content}
                  </div>

                  <div className="comments-section">
                    <button
                      onClick={() => setExpandedComments(prev => ({
                        ...prev,
                        [post.id]: !prev[post.id]
                      }))}
                      className="toggle-comments"
                    >
                      {expandedComments[post.id] ? "Скрыть" : "Показать"} комментарии ({post.comments.length})
                    </button>

                    {expandedComments[post.id] && (
                      <div className="comments-list">
                        {post.comments.map(comment => (
                          <div key={`comment-${comment.id}`} className="comment">
                            <p>{comment.content}</p>
                            <div className="comment-meta">
                              <span className="author">
                                {comment.authorName}
                                {comment.user?.role === 'admin' && (
                                  <span className="role-badge admin">Admin</span>
                                )}
                              </span>
                              <span className="comment-date">
                                {new Date(comment.created_at).toLocaleString()}
                              </span>
                              {canModerate(comment) && (
                                <button
                                  onClick={() => handleDeleteComment(post.id, comment.id)}
                                  className="delete-comment"
                                  title="Удалить комментарий"
                                >
                                  ×
                                </button>
                              )}
                            </div>
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
                            >
                              Отправить
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
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .post-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .post-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        
        .post-meta, .comment-meta {
          display: flex;
          gap: 10px;
          align-items: center;
          color: #666;
          font-size: 0.9em;
          margin-top: 5px;
        }
        
        .role-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.8em;
          background: #e0e0e0;
        }
        
        .role-badge.admin {
          background:rgb(44, 42, 42);
          color: white;
        }
        
        .post-actions {
          display: flex;
          gap: 10px;
        }
        
        .post-actions button {
          padding: 5px 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .post-actions button.delete {
          background: #ffebee;
          color: rgb(44, 42, 42);
        }
        
        .post-content {
          margin: 15px 0;
          line-height: 1.6;
        }
        
        .comments-list {
          margin-top: 15px;
          border-top: 1px solid #eee;
          padding-top: 15px;
        }
        
        .comment {
          padding: 10px;
          background: #f9f9f9;
          border-radius: 4px;
          margin-bottom: 10px;
          position: relative;
        }
        
        .delete-comment {
          position: absolute;
          top: 5px;
          right: 5px;
          background: none;
          border: none;
          cursor: pointer;
          color:rgb(44, 42, 42);
        }
        
        .add-comment textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-top: 10px;
          min-height: 80px;
        }
      `}</style>
    </div>
  );
};

export default Posts;