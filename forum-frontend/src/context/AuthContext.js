import React, { createContext, useState, useEffect, useContext } from "react";
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const parseJwtToken = (token) => {
    try {
      if (!token || typeof token !== 'string') return null;
      token = token.replace(/^"(.*)"$/, '$1').replace(/^Bearer\s+/i, '');
      const parts = token.split('.');
      if (parts.length !== 3) return null;

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
      console.error("Token parsing error:", err);
      return null;
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:8080/auth/login', {
        email,
        password
      });

      const { AccessToken, User } = response.data;
      
      if (!AccessToken) {
        throw new Error('No access token received');
      }

      localStorage.setItem('access_token', AccessToken);
      
      const decoded = parseJwtToken(AccessToken);
      if (decoded) {
        setIsAuthenticated(true);
        setCurrentUser({
          userId: decoded.user_id,
          username: User.username,
          role: decoded.role || 'user'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email, password, username) => {
    try {
      const response = await axios.post('http://localhost:8080/auth/register', {
        email,
        password,
        username
      });

      const { AccessToken, User } = response.data;
      
      if (!AccessToken) {
        throw new Error('No access token received');
      }

      localStorage.setItem('access_token', AccessToken);
      
      const decoded = parseJwtToken(AccessToken);
      if (decoded) {
        setIsAuthenticated(true);
        setCurrentUser({
          userId: decoded.user_id,
          username: User.username,
          role: decoded.role || 'user'
        });
      }
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      const decoded = parseJwtToken(token);
      if (decoded) {
        setIsAuthenticated(true);
        setCurrentUser({
          userId: decoded.user_id,
          username: decoded.username,
          role: decoded.role || 'user'
        });
      } else {
        localStorage.removeItem('access_token');
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      setIsAuthenticated,
      currentUser,
      setCurrentUser,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);