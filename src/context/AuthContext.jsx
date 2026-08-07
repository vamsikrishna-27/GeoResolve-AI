import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check local storage for existing session
    const storedUser = localStorage.getItem('georesolve_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('georesolve_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setError(null);
    setLoading(true);
    
    // Simulate API network call
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Admin Demo credentials
    if (email === 'demo@georesolve.ai' && password === 'password123') {
      const demoUser = {
        email: 'demo@georesolve.ai',
        name: 'Jane Doe',
        role: 'Enterprise Administrator',
        company: 'Vercel Partner Corp',
        joinedDate: 'Jan 2026'
      };
      setUser(demoUser);
      localStorage.setItem('georesolve_user', JSON.stringify(demoUser));
      setLoading(false);
      return true;
    } else if (email && password.length >= 6) {
      // General login for user inputs
      const customUser = {
        email: email,
        name: email.split('@')[0].replace(/[^a-zA-Z]/g, ' '),
        role: 'Developer Account',
        company: 'Sandbox Org',
        joinedDate: 'Aug 2026'
      };
      setUser(customUser);
      localStorage.setItem('georesolve_user', JSON.stringify(customUser));
      setLoading(false);
      return true;
    } else {
      setError('Invalid credentials. Use demo@georesolve.ai / password123 or any email and password with at least 6 characters.');
      setLoading(false);
      return false;
    }
  };

  const loginDemo = async () => {
    return login('demo@georesolve.ai', 'password123');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('georesolve_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, loginDemo, logout, setError }}>
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
