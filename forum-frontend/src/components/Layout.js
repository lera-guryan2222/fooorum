import React from 'react';
import Navbar from './Navbar';
import { theme } from '../styles/theme';

const Layout = ({ children }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.colors.background,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Navbar />
      <main style={{
        flex: 1,
        padding: theme.spacing.lg,
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%'
      }}>
        {children}
      </main>
      <footer style={{
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        textAlign: 'center',
        color: theme.colors.text.secondary,
        borderTop: `1px solid ${theme.colors.text.light}`,
        marginTop: 'auto'
      }}>
        <p>Forum Application © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default Layout; 