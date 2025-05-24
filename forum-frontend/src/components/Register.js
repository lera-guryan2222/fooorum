import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { theme } from '../styles/theme';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register(email, password, username);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
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
        Create Account
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
            htmlFor="username"
            style={{
              display: 'block',
              marginBottom: theme.spacing.xs,
              color: theme.colors.text.secondary,
              fontSize: theme.typography.sizes.sm
            }}
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
          {isLoading ? 'Creating account...' : 'Register'}
        </button>

        <p style={{
          textAlign: 'center',
          marginTop: theme.spacing.lg,
          color: theme.colors.text.secondary,
          fontSize: theme.typography.sizes.sm
        }}>
          Already have an account?{' '}
          <Link
            to="/login"
            style={{
              color: theme.colors.primary,
              textDecoration: 'none',
              ':hover': {
                textDecoration: 'underline'
              }
            }}
          >
            Login here
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
