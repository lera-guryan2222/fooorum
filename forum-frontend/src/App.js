import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import Posts from './components/Posts';
import CreatePost from './components/CreatePost';
import EditPost from './components/EditPost';
import { theme } from './styles/theme';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <div style={{
          minHeight: '100vh',
          backgroundColor: theme.colors.surface,
          fontFamily: theme.typography.fontFamily
        }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={
              <Layout>
                <Posts />
              </Layout>
            } />
            <Route path="/chat" element={
              <Layout>
                <PrivateRoute>
                  <Chat />
                </PrivateRoute>
              </Layout>
            } />
            <Route path="/posts/create" element={
              <Layout>
                <PrivateRoute>
                  <CreatePost />
                </PrivateRoute>
              </Layout>
            } />
            <Route path="/posts/edit/:id" element={
              <Layout>
                <PrivateRoute>
                  <EditPost />
                </PrivateRoute>
              </Layout>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;