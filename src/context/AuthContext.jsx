import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set auth header helper
  const setAuthHeader = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('georesolve_token');
      const storedUser = localStorage.getItem('georesolve_user');

      if (token && storedUser) {
        try {
          setAuthHeader(token);
          // Verify token validity by calling profile endpoint
          const response = await axios.get(`${API_URL}/auth/profile`);
          setUser(response.data);
          localStorage.setItem('georesolve_user', JSON.stringify(response.data));
        } catch (e) {
          console.warn('Session expired or connection failed');
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setError(null);
    setLoading(true);

    try {
      // 1. Post credentials to /auth/login
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      const { access_token } = loginResponse.data;

      // 2. Set default auth header and store token securely
      setAuthHeader(access_token);
      localStorage.setItem('georesolve_token', access_token);

      // 3. Fetch full user profile details from /auth/profile
      const profileResponse = await axios.get(`${API_URL}/auth/profile`);
      const userProfile = profileResponse.data;

      setUser(userProfile);
      localStorage.setItem('georesolve_user', JSON.stringify(userProfile));
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Login error:', err);
      let errMsg = 'Authentication failed. Please check your credentials.';
      if (err.response) {
        // Extract validation or business logic error from backend
        errMsg = err.response.data?.detail || errMsg;
        if (typeof errMsg === 'object') {
          // Handle Pydantic field validation errors array
          errMsg = err.response.data?.detail?.[0]?.msg || JSON.stringify(errMsg);
        }
      } else if (err.request) {
        errMsg = 'No response received from the backend service. Make sure it is running.';
      }
      setError(errMsg);
      setLoading(false);
      return false;
    }
  };

  const loginDemo = async () => {
    return login('demo@georesolve.ai', 'password123');
  };

  const logout = () => {
    setUser(null);
    setAuthHeader(null);
    localStorage.removeItem('georesolve_token');
    localStorage.removeItem('georesolve_user');
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('georesolve_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, loginDemo, logout, setError, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
