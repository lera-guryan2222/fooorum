import React from 'react';
import { useAuth } from '../context/AuthContext';
import { theme } from '../styles/theme';
import { Link, useLocation } from 'react-router-dom';

const NavLink = ({ to, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      style={{
        color: isActive ? theme.colors.primary : theme.colors.text.primary,
        textDecoration: 'none',
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        borderRadius: theme.borderRadius.md,
        backgroundColor: isActive ? `${theme.colors.primary}10` : 'transparent',
        transition: 'all 0.2s ease',
        fontWeight: isActive ? '600' : '500',
        ':hover': {
          backgroundColor: `${theme.colors.primary}20`
        }
      }}
    >
      {children}
    </Link>
  );
};

const Navbar = () => {
  const { isAuthenticated, currentUser, logout } = useAuth();

  return (
    <nav style={{
      backgroundColor: theme.colors.background,
      borderBottom: `1px solid ${theme.colors.text.light}20`,
      padding: `${theme.spacing.md} ${theme.spacing.xl}`,
      boxShadow: theme.shadows.sm
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.lg
        }}>
          <Link to="/" style={{
            fontSize: theme.typography.sizes.xl,
            fontWeight: 'bold',
            color: theme.colors.primary,
            textDecoration: 'none'
          }}>
            Forum
          </Link>
          <div style={{
            display: 'flex',
            gap: theme.spacing.md
          }}>
            <NavLink to="/">Posts</NavLink>
            <NavLink to="/chat">Chat</NavLink>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.md
        }}>
          {isAuthenticated ? (
            <>
              <span style={{
                color: theme.colors.text.secondary,
                fontSize: theme.typography.sizes.sm
              }}>
                Welcome, {currentUser?.username}
              </span>
              <button
                onClick={logout}
                style={{
                  backgroundColor: 'transparent',
                  border: `1px solid ${theme.colors.danger}`,
                  color: theme.colors.danger,
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.borderRadius.md,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  ':hover': {
                    backgroundColor: `${theme.colors.danger}10`
                  }
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Login</NavLink>
              <NavLink to="/register">Register</NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 