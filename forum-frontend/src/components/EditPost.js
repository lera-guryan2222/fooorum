import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { theme } from '../styles/theme';
import axios from 'axios';

const EditPost = () => {
  const { id } = useParams();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated, currentUser } = useAuth();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await axios.get(`http://localhost:8081/posts/${id}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        // Проверяем права на редактирование
        const post = response.data;
        const canEdit = currentUser?.role === 'moderator' || 
                       currentUser?.role === 'admin' || 
                       post.author_id === currentUser?.userId;

        if (!canEdit) {
          setError('You do not have permission to edit this post');
          return;
        }

        setTitle(post.title);
        setContent(post.content);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load post. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchPost();
    } else {
      setError('Please log in to edit posts');
      setIsLoading(false);
    }
  }, [id, isAuthenticated, currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setError('You must be logged in to edit a post');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      await axios.put(`http://localhost:8081/posts/${id}`, 
        { title, content },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update post. Please try again.');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        textAlign: 'center',
        padding: theme.spacing.xl,
        color: theme.colors.text.secondary
      }}>
        Loading post...
      </div>
    );
  }

  if (error && !title && !content) {
    return (
      <div style={{
        textAlign: 'center',
        color: theme.colors.danger,
        padding: theme.spacing.xl
      }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.lg,
      boxShadow: theme.shadows.lg
    }}>
      <h2 style={{
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xl,
        fontSize: theme.typography.sizes['2xl']
      }}>
        Edit Post
      </h2>

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

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: theme.spacing.lg }}>
          <label
            htmlFor="title"
            style={{
              display: 'block',
              marginBottom: theme.spacing.xs,
              color: theme.colors.text.secondary,
              fontSize: theme.typography.sizes.sm
            }}
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{
              width: '100%',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.text.light}`,
              fontSize: theme.typography.sizes.base,
              outline: 'none',
              transition: 'all 0.2s ease',
              ':focus': {
                borderColor: theme.colors.primary,
                boxShadow: `0 0 0 2px ${theme.colors.primary}20`
              }
            }}
          />
        </div>

        <div style={{ marginBottom: theme.spacing.xl }}>
          <label
            htmlFor="content"
            style={{
              display: 'block',
              marginBottom: theme.spacing.xs,
              color: theme.colors.text.secondary,
              fontSize: theme.typography.sizes.sm
            }}
          >
            Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={10}
            style={{
              width: '100%',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.text.light}`,
              fontSize: theme.typography.sizes.base,
              outline: 'none',
              resize: 'vertical',
              minHeight: '200px',
              fontFamily: theme.typography.fontFamily,
              transition: 'all 0.2s ease',
              ':focus': {
                borderColor: theme.colors.primary,
                boxShadow: `0 0 0 2px ${theme.colors.primary}20`
              }
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          gap: theme.spacing.md,
          justifyContent: 'flex-end'
        }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              backgroundColor: 'transparent',
              color: theme.colors.text.secondary,
              border: `1px solid ${theme.colors.text.light}`,
              borderRadius: theme.borderRadius.md,
              fontSize: theme.typography.sizes.base,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              ':hover': {
                backgroundColor: theme.colors.surface
              }
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              backgroundColor: theme.colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: theme.borderRadius.md,
              fontSize: theme.typography.sizes.base,
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? '0.7' : '1',
              transition: 'all 0.2s ease',
              ':hover': {
                backgroundColor: theme.colors.secondary
              }
            }}
          >
            {isLoading ? 'Updating...' : 'Update Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditPost; 