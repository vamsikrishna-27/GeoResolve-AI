import React, { useState } from 'react';
import { HashRouter } from 'react-router-dom';
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
        <HashRouter>
          <AuthProvider>
            <GeoProvider>
              <AppRoutes />
            </GeoProvider>
          </AuthProvider>
        </HashRouter>
      )}
    </>
  );
}

export default App;
