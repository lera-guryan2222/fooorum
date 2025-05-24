import React, { useState, useEffect } from "react";
import CreatePost from "./components/CreatePost";
import Posts from "./pages/Posts";
import Register from "./components/Register";
import Login from "./components/Login";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Chat from './components/Chat';
import { BrowserRouter as Router } from 'react-router-dom';

// Оборачиваем всё приложение в Router

const AppContent = () => {
  const { isAuthenticated, setIsAuthenticated } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);


  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setShowLogin(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    setIsAuthenticated(false);
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <header style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "30px",
        paddingBottom: "20px",
        borderBottom: "1px solid #eee"
      }}>
        <h1 style={{ margin: 0 }}>Forum</h1>
  
        <div>
          {!isAuthenticated ? (
            <>
              <button 
                onClick={() => setShowLogin(true)} 
                style={{ 
                  marginRight: "10px",
                  padding: "8px 16px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Login
              </button>
              <button 
                onClick={() => setShowRegister(true)}
                style={{
                  padding: "8px 16px",
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Register
              </button>
            </>
          ) : (
            <button 
              onClick={handleLogout}
              style={{
                padding: "8px 16px",
                background: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Logout
            </button>
          )}
        </div>
      </header>

      {showLogin && (
        <div style={{ 
          position: "fixed", 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: "rgba(0,0,0,0.5)", 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{ 
            backgroundColor: "white", 
            padding: "30px", 
            borderRadius: "8px",
            width: "400px",
            maxWidth: "90%",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
          }}>
            <Login onSuccess={handleLoginSuccess} />
            <button 
              onClick={() => setShowLogin(false)} 
              style={{ 
                marginTop: "20px",
                padding: "8px 16px",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                width: "100%"
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showRegister && (
        <div style={{ 
          position: "fixed", 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: "rgba(0,0,0,0.5)", 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{ 
            backgroundColor: "white", 
            padding: "30px", 
            borderRadius: "8px",
            width: "400px",
            maxWidth: "90%",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
          }}>
            <Register onSuccess={() => setShowRegister(false)} />
            <button 
              onClick={() => setShowRegister(false)} 
              style={{ 
                marginTop: "20px",
                padding: "8px 16px",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                width: "100%"
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        gap: '30px',
        marginTop: "20px"
      }}>
        <div style={{ 
          flex: 2,
          minWidth: 0
        }}>
          {isAuthenticated && <CreatePost />}
          <Posts />
        </div>
        <div style={{ 
          flex: 1,
          position: "sticky",
          top: "20px",
          height: "fit-content"
        }}>
          <Chat />
        </div>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;