import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { theme } from '../styles/theme';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '400px',
      margin: '40px auto',
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.lg,
      boxShadow: theme.shadows.lg
    }}>
      <h2 style={{
        textAlign: 'center',
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xl,
        fontSize: theme.typography.sizes['2xl']
      }}>
        Welcome Back
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
            htmlFor="email"
            style={{
              display: 'block',
              marginBottom: theme.spacing.xs,
              color: theme.colors.text.secondary,
              fontSize: theme.typography.sizes.sm
            }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid rgb(148, 163, 184)',
              fontSize: '1rem',
              outline: 'none',
              transition: '0.2s',
              justifyContent: 'center',
              paddingRight: '0.03px'
            }}
          />
        </div>

        <div style={{ marginBottom: theme.spacing.xl }}>
          <label
            htmlFor="password"
            style={{
              display: 'block',
              marginBottom: theme.spacing.xs,
              color: theme.colors.text.secondary,
              fontSize: theme.typography.sizes.sm
            }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.text.light}`,
              fontSize: theme.typography.sizes.base,
              outline: 'none',
              paddingRight: '0.03px',
              transition: 'all 0.2s ease',
              ':focus': {
                borderColor: theme.colors.primary,
                boxShadow: `0 0 0 2px ${theme.colors.primary}20`
              }
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: theme.spacing.md,
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
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        <p style={{
          textAlign: 'center',
          marginTop: theme.spacing.lg,
          color: theme.colors.text.secondary,
          fontSize: theme.typography.sizes.sm
        }}>
          Don't have an account?{' '}
          <Link
            to="/register"
            style={{
              color: theme.colors.primary,
              textDecoration: 'none',
              ':hover': {
                textDecoration: 'underline'
              }
            }}
          >
            Register here
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;