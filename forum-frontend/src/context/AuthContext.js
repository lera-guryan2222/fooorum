import React, { createContext, useState, useEffect, useContext } from "react";

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

  useEffect(() => {
    const token = localStorage.getItem("access_token");
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
        localStorage.removeItem("access_token");
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      setIsAuthenticated,
      currentUser,
      setCurrentUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);