import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { ResolveAddress } from '../pages/ResolveAddress';
import { History } from '../pages/History';
import { ApiKeys } from '../pages/ApiKeys';
import { Analytics } from '../pages/Analytics';
import { Settings } from '../pages/Settings';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { RefreshCw } from 'lucide-react';

// Wrapper for protected route guards
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center font-mono text-xs text-white/50 space-x-2">
        <RefreshCw className="w-4 h-4 animate-spin text-accent" />
        <span>AUTHENTICATING TELEMETRY SESSION...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

// Wrapper for anonymous login screens
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center font-mono text-xs text-white/50 space-x-2">
        <RefreshCw className="w-4 h-4 animate-spin text-accent" />
        <span>AUTHENTICATING TELEMETRY SESSION...</span>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Login */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />

      {/* Protected Layout Sub-screens */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/resolve" 
        element={
          <ProtectedRoute>
            <ResolveAddress />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/history" 
        element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/api-keys" 
        element={
          <ProtectedRoute>
            <ApiKeys />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/analytics" 
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } 
      />

      {/* Fallback Catch-all redirection */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
