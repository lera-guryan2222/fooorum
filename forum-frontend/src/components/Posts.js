import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { theme } from '../styles/theme';

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();

  const canModifyPost = (post) => {
    if (!isAuthenticated || !currentUser) return false;
    // Модераторы могут редактировать и удалять любые посты
    if (currentUser.role === 'moderator' || currentUser.role === 'admin') return true;
    // Обычные пользователи могут редактировать и удалять только свои посты
    return post.author_id === currentUser.userId;
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await axios.get('http://localhost:8081/posts', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        setPosts(response.data);
      } catch (err) {
        setError('Failed to load posts. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`http://localhost:8081/posts/${postId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPosts(posts.filter(post => post.id !== postId));
    } catch (err) {
      setError('Failed to delete post. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div style={{
        textAlign: 'center',
        padding: theme.spacing.xl,
        color: theme.colors.text.secondary
      }}>
        Loading posts...
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xl
      }}>
        <h2 style={{
          color: theme.colors.text.primary,
          fontSize: theme.typography.sizes['2xl'],
          margin: 0
        }}>
          Forum Posts
        </h2>
        {isAuthenticated && (
          <button
            onClick={() => navigate('/posts/create')}
            style={{
              backgroundColor: theme.colors.primary,
              color: 'white',
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              borderRadius: theme.borderRadius.md,
              border: 'none',
              cursor: 'pointer',
              fontSize: theme.typography.sizes.base,
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              transition: 'all 0.2s ease',
              ':hover': {
                backgroundColor: theme.colors.secondary
              }
            }}
          >
            <span>New Post</span>
          </button>
        )}
      </div>

      {error && (
        <div style={{
          backgroundColor: `${theme.colors.danger}10`,
          color: theme.colors.danger,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          marginBottom: theme.spacing.lg,
          fontSize: theme.typography.sizes.sm
        }}>
          {error}
        </div>
      )}

      {posts.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: theme.spacing.xl,
          color: theme.colors.text.secondary,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg
        }}>
          No posts yet. Be the first to create one!
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.lg
        }}>
          {posts.map(post => (
            <div
              key={post.id}
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                boxShadow: theme.shadows.md
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: theme.spacing.md
              }}>
                <div>
                  <h3 style={{
                    margin: 0,
                    color: theme.colors.text.primary,
                    fontSize: theme.typography.sizes.xl
                  }}>
                    {post.title}
                  </h3>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    marginTop: theme.spacing.xs
                  }}>
                    <span style={{
                      color: theme.colors.text.secondary,
                      fontSize: theme.typography.sizes.sm
                    }}>
                      Posted by {post.author_name || 'Anonymous'}
                    </span>
                    {post.author_role && (
                      <span style={{
                        backgroundColor: post.author_role === 'moderator' ? theme.colors.primary : theme.colors.secondary,
                        color: 'white',
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        borderRadius: theme.borderRadius.full,
                        fontSize: theme.typography.sizes.xs,
                        textTransform: 'capitalize'
                      }}>
                        {post.author_role}
                      </span>
                    )}
                  </div>
                </div>
                {canModifyPost(post) && (
                  <div style={{
                    display: 'flex',
                    gap: theme.spacing.sm
                  }}>
                    <button
                      onClick={() => navigate(`/posts/edit/${post.id}`)}
                      style={{
                        backgroundColor: theme.colors.surface,
                        border: 'none',
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        borderRadius: theme.borderRadius.md,
                        cursor: 'pointer',
                        fontSize: theme.typography.sizes.sm,
                        color: theme.colors.text.secondary,
                        transition: 'all 0.2s ease',
                        ':hover': {
                          backgroundColor: `${theme.colors.primary}10`,
                          color: theme.colors.primary
                        }
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      style={{
                        backgroundColor: theme.colors.surface,
                        border: 'none',
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        borderRadius: theme.borderRadius.md,
                        cursor: 'pointer',
                        fontSize: theme.typography.sizes.sm,
                        color: theme.colors.danger,
                        transition: 'all 0.2s ease',
                        ':hover': {
                          backgroundColor: `${theme.colors.danger}10`
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <p style={{
                color: theme.colors.text.primary,
                fontSize: theme.typography.sizes.base,
                lineHeight: 1.6,
                margin: `${theme.spacing.md} 0 0 0`
              }}>
                {post.content}
              </p>
              {currentUser?.role === 'moderator' && !canModifyPost(post) && (
                <div style={{
                  marginTop: theme.spacing.md,
                  padding: theme.spacing.sm,
                  backgroundColor: `${theme.colors.warning}10`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.sizes.sm,
                  color: theme.colors.warning
                }}>
                  Moderator actions available
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Posts; 