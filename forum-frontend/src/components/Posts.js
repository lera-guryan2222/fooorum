import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import PostForm from "../components/CreatePost";
import { useNavigate } from 'react-router-dom';

const Posts = () => {
  console.log('[DEBUG] Posts component rendering. Timestamp:', new Date().toISOString());
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentTexts, setCommentTexts] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [editingPost, setEditingPost] = useState(null);
  const { isAuthenticated } = useContext(AuthContext);
  const [currentUser, setCurrentUser] = useState({ 
    username: null, 
    userId: null,
    role: 'user'
  });
  const navigate = useNavigate();

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
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      
      console.log("[DEBUG] Начинаем загрузку постов");
      const response = await axios.get("http://localhost:8081/posts", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!Array.isArray(response.data)) {
        console.error("[DEBUG] Ответ от сервера не является массивом:", response.data);
        setError("Некорректный формат данных от сервера");
        return;
      }

      console.log("[DEBUG] Получено постов:", response.data.length);

      // Создаем базовые объекты постов
      const postsWithoutComments = response.data
        .filter(post => post && typeof post === 'object')
        .map(post => ({
          id: post.id,
          title: post.title || "Без названия",
          content: post.content || "",
          created_at: post.created_at || new Date().toISOString(),
          authorName: post.author || "Неизвестный пользователь",
          user_id: post.user_id,
          comments: []
        }));

      // Загружаем комментарии для каждого поста
      const postsWithComments = await Promise.all(
        postsWithoutComments.map(async (post) => {
          try {
            console.log(`[DEBUG] Загрузка комментариев для поста ${post.id}`);
            const commentsResponse = await axios.get(
              `http://localhost:8081/posts/${post.id}/comments`,
              { headers: token ? { Authorization: `Bearer ${token}` } : {} }
            );

            if (Array.isArray(commentsResponse.data)) {
              post.comments = commentsResponse.data.map(comment => ({
                id: comment.id,
                content: comment.content,
                created_at: comment.created_at,
                authorName: comment.author || "Аноним",
                user_id: comment.user_id,
                user: {
                  id: comment.user_id,
                  role: comment.user_role || 'user'
                }
              }));
              console.log(`[DEBUG] Загружено ${post.comments.length} комментариев для поста ${post.id}`);
            }
          } catch (err) {
            console.error(`[DEBUG] Ошибка при загрузке комментариев для поста ${post.id}:`, err);
            // Оставляем пустой массив комментариев в случае ошибки
          }
          return post;
        })
      );

      console.log("[DEBUG] Обработка постов завершена. Всего постов:", postsWithComments.length);
      setPosts(postsWithComments);
      setError("");
    } catch (err) {
      console.error("[DEBUG] Ошибка при загрузке постов:", {
        error: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      setError("Не удалось загрузить посты. Пожалуйста, обновите страницу.");
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
      console.log("[DEBUG] Отправка нового комментария для поста:", postId);
      const token = localStorage.getItem("access_token");
      
      const response = await axios.post(
        `http://localhost:8081/posts/${postId}/comments`,
        { content: commentTexts[postId] },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("[DEBUG] Ответ сервера при создании комментария:", response.data);

      const newComment = {
        id: response.data.id,
        content: response.data.content,
        created_at: response.data.created_at,
        authorName: currentUser.username || "Вы",
        user_id: currentUser.userId,
        user: {
          id: currentUser.userId,
          role: currentUser.role
        }
      };

      console.log("[DEBUG] Сформированный комментарий:", newComment);

      setPosts(prevPosts => {
        const updatedPosts = prevPosts.map(post => {
          if (post.id === postId) {
            const updatedPost = {
              ...post,
              comments: [...(post.comments || []), newComment]
            };
            console.log(`[DEBUG] Обновлен пост ${postId}, количество комментариев:`, updatedPost.comments.length);
            return updatedPost;
          }
          return post;
        });
        return updatedPosts;
      });

      setCommentTexts(prev => ({ ...prev, [postId]: "" }));
      console.log("[DEBUG] Комментарий успешно добавлен");
    } catch (err) {
      console.error("[DEBUG] Ошибка при добавлении комментария:", {
        error: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      setError("Не удалось добавить комментарий. Пожалуйста, попробуйте еще раз.");
    }
  };

  const canModerate = (item, itemType) => {
    if (!isAuthenticated || !currentUser || !currentUser.userId) {
      return false;
    }

    // Администратор может модерировать всё
    if (currentUser.role === 'admin') {
      return true;
    }

    // Обычные пользователи могут модерировать только свои элементы
    if (itemType === 'post') {
      return currentUser.userId === item.user_id;
    } else if (itemType === 'comment') {
      // Комментарий с сервера может иметь user_id напрямую или вложенный объект user.
      // Комментарий, добавленный на клиенте, имеет user: { id: currentUser.userId }
      return currentUser.userId === item.user_id || (item.user && currentUser.userId === item.user.id);
    }
    return false;
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
          comments: Array.isArray(post.comments) ? post.comments.filter(c => c.id !== commentId) : []
        } : post
      ));
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось удалить комментарий");
    }
  };

  const handleDeletePost = async (postId) => {
    console.log(`[DEBUG handleDeletePost] Попытка удалить пост с ID: ${postId}`);
    if (!window.confirm("Вы уверены, что хотите удалить этот пост?")) {
      console.log("[DEBUG handleDeletePost] Удаление отменено пользователем.");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      console.log("[DEBUG handleDeletePost] Токен для запроса на удаление:", token ? "Токен существует" : "Токен не найден");
      
      if (!token) {
        setError("Не удалось удалить пост: требуется авторизация");
        return;
      }

      // Проверка срока действия токена
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = tokenPayload.exp * 1000; // Конвертация в миллисекунды
        if (Date.now() >= expirationTime) {
          console.log("[DEBUG handleDeletePost] Срок действия токена истек");
          setError("Срок действия сессии истек. Пожалуйста, войдите снова.");
          return;
        }
      } catch (tokenError) {
        console.error("[DEBUG handleDeletePost] Ошибка при проверке токена:", tokenError);
        setError("Ошибка аутентификации. Пожалуйста, войдите снова.");
        return;
      }

      console.log("[DEBUG handleDeletePost] Отправка запроса на удаление...");
      await axios.delete(`http://localhost:8081/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`[DEBUG handleDeletePost] Пост ${postId} успешно удален с сервера.`);
      setPosts(posts.filter(post => post.id !== postId));
      console.log("[DEBUG handleDeletePost] Состояние постов обновлено после удаления.");
    } catch (err) {
      console.error("[DEBUG handleDeletePost] Ошибка при удалении поста:", err);
      if (err.response) {
        console.error("[DEBUG handleDeletePost] Статус ошибки:", err.response.status);
        console.error("[DEBUG handleDeletePost] Данные ошибки:", err.response.data);
      }
      
      let errorMessage = "Не удалось удалить пост";
      if (err.response?.status === 401) {
        errorMessage = "Необходима авторизация. Пожалуйста, войдите снова.";
      } else if (err.response?.status === 403) {
        errorMessage = "У вас нет прав на удаление этого поста";
      }
      
      setError(errorMessage);
    }
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
  };

  const handleEditComplete = (updatedPost) => {
    console.log("[DEBUG handleEditComplete] Получен обновленный пост:", updatedPost);
    
    if (!updatedPost) {
      console.log("[DEBUG handleEditComplete] Отмена редактирования - updatedPost равен null");
      setEditingPost(null);
      return;
    }

    if (!updatedPost.id) {
      console.error("[DEBUG handleEditComplete] Ошибка: updatedPost не содержит id");
      setError("Ошибка при обновлении поста: отсутствует ID");
      return;
    }

    setPosts(posts.map(post => 
      post.id === updatedPost.id ? {
        ...post,
        ...updatedPost,
        comments: post.comments || [] // Сохраняем существующие комментарии
      } : post
    ));
    setEditingPost(null);
    setError(""); // Очищаем ошибки при успешном обновлении
  };

  useEffect(() => { 
    console.log('[DEBUG] useEffect for fetchPosts triggered. isAuthenticated:', isAuthenticated, 'Timestamp:', new Date().toISOString());
    fetchPosts(); 
  }, [isAuthenticated]);

  if (loading) return <div className="loading">Загрузка постов...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="posts-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Последние посты</h2>
        {isAuthenticated && (
          <button 
            onClick={() => navigate('/posts/create')}
            style={{
              padding: '10px 15px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Создать пост
          </button>
        )}
      </div>
      {posts.length === 0 ? (
        <p>Пока нет постов. Будьте первым!</p>
      ) : (
        <div className="posts-list">
          {posts.map((post) => {
            if (!post || !Array.isArray(post.comments)) {
              console.error("[DEBUG RENDER] Problematic post object before rendering comments:", JSON.stringify(post, null, 2));
            }
            return (
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
                      {canModerate(post, 'post') && (
                        <div className="post-actions">
                          <button 
                            onClick={() => handleEditPost(post)}
                            style={{ fontSize: '0.8em' }}
                          >
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
                        {expandedComments[post.id] ? "Скрыть" : "Показать"} комментарии ({post.comments ? post.comments.length : 0})
                      </button>

                      {expandedComments[post.id] && (
                        <div className="comments-list">
                          {post.comments && post.comments.map(comment => (
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
                                {canModerate(comment, 'comment') && (
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
            );
          })}
        </div>
      )}

      <style jsx>{`
        .posts-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 70px;
        }
        
        .post-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          padding: 20px;
          padding-right: 40px;
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
          background: #f44336;
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
          background-color: transparent;
          border: 1px solid rgb(218, 218, 221);
          color: rgb(31, 14, 65);
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .post-actions button.delete:hover {
          background-color: rgb(39, 17, 70);
          color: white;
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
          color: #c62828;
          font-size: 1.2em;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .delete-comment:hover {
          background-color: rgba(198, 40, 40, 0.1);
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