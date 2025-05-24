import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

const PostForm = ({ onPostCreated, postToEdit, onEditComplete }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    title: "",
    content: ""
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState({ 
    username: null,
    userId: null,
    role: 'user'
  });

  // Устанавливаем начальные данные формы при редактировании
  useEffect(() => {
    if (postToEdit) {
      setFormData({
        title: postToEdit.title,
        content: postToEdit.content
      });
    }
  }, [postToEdit]);

  // Улучшенный парсер JWT токена
  const parseJwtToken = (token) => {
    try {
      console.log("Original token:", token);
      
      if (!token || typeof token !== 'string') {
        throw new Error('Token is missing or not a string');
      }
      
      // Удаляем возможные кавычки и префикс "Bearer "
      token = token.replace(/^"(.*)"$/, '$1').replace(/^Bearer\s+/i, '');
      
      console.log("Processed token:", token);
      
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error(`Invalid token format: expected 3 parts, got ${parts.length}`);
      }
  
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
      localStorage.removeItem('access_token');
      return null;
    }
  };
  // Получаем данные пользователя из токена
  useEffect(() => {
    const getUserData = () => {
      const token = localStorage.getItem("access_token");
      console.log("Token from localStorage:", token); // Добавьте этот лог
      
      if (!token) return null;
      
      try {
        const payload = parseJwtToken(token);
        console.log("Parsed payload:", payload); // Добавьте этот лог
        
        if (!payload) return null;
        
        return {
          username: payload.username || payload.sub || "User",
          userId: payload.user_id || payload.sub,
          role: payload.role || 'user'
        };
      } catch (err) {
        console.error("Failed to parse token:", err);
        return null;
      }
    };
  
    if (isAuthenticated) {
      const userData = getUserData();
      console.log("User data from token:", userData); // Добавьте этот лог
      if (userData) {
        setCurrentUser(userData);
      }
    }
  }, [isAuthenticated]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No authentication token found");
      }
  
      const payload = parseJwtToken(token);
      if (!payload) {
        throw new Error("Invalid token - parsing failed");
      }
  
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        throw new Error("Token expired");
      }

      let response;
      if (postToEdit) {
        // Обновление существующего поста
        response = await axios.put(
          `http://localhost:8081/posts/${postToEdit.id}`,
          {
            title: formData.title,
            content: formData.content
          },
          {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            withCredentials: true
          }
        );
        if (onEditComplete) onEditComplete(response.data);
      } else {
        // Создание нового поста
        response = await axios.post(
          "http://localhost:8081/posts",
          {
            title: formData.title,
            content: formData.content,
            authorId: payload.user_id || payload.sub,
            authorName: payload.username || payload.sub
          },
          {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            withCredentials: true
          }
        );
        if (onPostCreated) onPostCreated(response.data);
      }
      
      setFormData({ title: "", content: "" });
    } catch (err) {
      console.error("Post operation error:", err);
      setError(err.response?.data?.error || err.message || "Failed to process post");
      
      if (err.message.includes("token")) {
        setError("Session expired. Please log in again.");
        localStorage.removeItem('access_token');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{ 
      margin: "2rem 0", 
      padding: "1.5rem", 
      border: "1px solid #e1e1e1", 
      borderRadius: "8px", 
      background: "#fff", 
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "1rem" 
      }}>
        <h2>{postToEdit ? "Edit Post" : "Create New Post"}</h2>
        {currentUser.username && (
          <div style={{ 
            fontSize: "0.9rem", 
            color: "#666",
            background: "#f5f5f5",
            padding: "0.5rem 1rem",
            borderRadius: "20px"
          }}>
            Posting as: <strong style={{ color: "#333" }}>{currentUser.username}</strong>
          </div>
        )}
      </div>
      
      {error && (
        <div style={{ 
          color: "#dc3545", 
          marginBottom: "1rem", 
          padding: "0.5rem", 
          background: "#f8d7da", 
          border: "1px solid #f5c6cb", 
          borderRadius: "4px"
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: "1rem" 
      }}>
        <div>
          <label htmlFor="title" style={{ 
            display: "block", 
            marginBottom: "0.5rem", 
            fontWeight: "500" 
          }}>
            Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "1rem"
            }}
          />
        </div>

        <div>
          <label htmlFor="content" style={{ 
            display: "block", 
            marginBottom: "0.5rem", 
            fontWeight: "500" 
          }}>
            Content
          </label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            required
            rows="6"
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "1rem",
              resize: "vertical"
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "1rem",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.7 : 1
          }}
        >
          {isSubmitting ? "Processing..." : (postToEdit ? "Update Post" : "Create Post")}
        </button>
      </form>
    </div>
  );
};

export default PostForm;