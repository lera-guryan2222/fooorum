import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { theme } from '../styles/theme';
import axios from 'axios';

const CreatePost = ({ postToEdit, onEditComplete }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const isEditMode = Boolean(postToEdit);

  useEffect(() => {
    if (isEditMode && postToEdit) {
      setTitle(postToEdit.title || '');
      setContent(postToEdit.content || '');
    }
  }, [isEditMode, postToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setError(isEditMode ? 'You must be logged in to edit a post' : 'You must be logged in to create a post');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      console.log('[DEBUG CreatePost] Token before request:', token);
      if (token) {
        console.log('[DEBUG CreatePost] Token snippet (first 10, last 10):', token.substring(0, 10) + '...' + token.substring(token.length - 10));
      }
      const postData = { title, content };

      if (isEditMode) {
        console.log(`[DEBUG CreatePost] Attempting to PUT /posts/${postToEdit.id} with token.`);
        const response = await axios.put(`http://localhost:8081/posts/${postToEdit.id}`, 
          postData,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (onEditComplete) {
          const updatedPostData = { 
            ...postToEdit,
            ...response.data,
          };
          onEditComplete(updatedPostData);
        }
      } else {
        console.log('[DEBUG CreatePost] Attempting to POST /posts with token.');
        await axios.post('http://localhost:8081/posts', 
          postData,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        navigate('/');
      }
    } catch (err) {
      console.error('[DEBUG CreatePost] Error during submit:', err);
      if (err.response) {
        console.error('[DEBUG CreatePost] Error response data:', err.response.data);
        console.error('[DEBUG CreatePost] Error response status:', err.response.status);
        console.error('[DEBUG CreatePost] Error response headers:', err.response.headers);
      }
      setError(err.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} post. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated && !isEditMode) {
    return (
      <div style={{
        textAlign: 'center',
        color: theme.colors.text.secondary,
        padding: theme.spacing.xl
      }}>
        Please log in to create posts.
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
        {isEditMode ? 'Edit Post' : 'Create New Post'}
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
            onClick={() => isEditMode ? onEditComplete(null) : navigate('/')}
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
            {isLoading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Post')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;