import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GeoProvider } from './context/GeoContext';
import { AppRoutes } from './routes/AppRoutes';
import { SplashWelcome } from './components/SplashWelcome';
import { AnimatePresence } from 'framer-motion';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && (
          <SplashWelcome key="splash" onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>
      
      {!showSplash && (
        <BrowserRouter>
          <AuthProvider>
            <GeoProvider>
              <AppRoutes />
            </GeoProvider>
          </AuthProvider>
        </BrowserRouter>
      )}
    </>
  );
}

export default App;
