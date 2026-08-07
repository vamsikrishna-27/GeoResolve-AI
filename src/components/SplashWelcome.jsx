import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const SplashWelcome = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('INITIALIZING LOCATOR SYSTEMS...');

  useEffect(() => {
    // 1. Simulation of loading telemetry steps
    const statusSteps = [
      { threshold: 15, text: 'LOADING SPATIAL INDEXES...' },
      { threshold: 40, text: 'RESOLVING POSTGREST CONNECTION...' },
      { threshold: 65, text: 'PARSING GEOGRAPHIC TRIGGERS...' },
      { threshold: 85, text: 'MOUNTING DECISION ENGINES...' },
      { threshold: 95, text: 'ESTABLISHING HANDSHAKE PROTOCOLS...' }
    ];

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 8 + 2;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500); // Small delay for smooth exit
          return 100;
        }
        
        // Update status text based on progress
        const matched = statusSteps.find(step => next < step.threshold);
        if (matched) {
          setStatusText(matched.text);
        }

        return next;
      });
    }, 120);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center overflow-hidden select-none font-mono text-white"
    >
      {/* 1. Cinematic Background Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.08)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/5 blur-[120px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />

      {/* 2. Main 3D Logo Section */}
      <div className="relative flex items-center justify-center w-72 h-72 [perspective:1000px] transform-style-3d">
        
        {/* Floating 3D Location Pin Logo */}
        <motion.div
          animate={{ 
            y: [-12, 12, -12],
            rotateY: [0, 360]
          }}
          transition={{ 
            y: { duration: 4, ease: "easeInOut", repeat: Infinity },
            rotateY: { duration: 12, ease: "linear", repeat: Infinity }
          }}
          className="relative w-36 h-36 flex items-center justify-center [transform-style:preserve-3d]"
        >
          {/* Neon Glow Pin Shell (Front Face) */}
          <div className="absolute inset-0 flex items-center justify-center backface-hidden [transform:translateZ(15px)]">
            <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-[0_0_15px_rgba(56,189,248,0.6)]">
              <path 
                d="M50 15 C33 15 20 28 20 45 C20 68 50 85 50 85 C50 85 80 68 80 45 C80 28 67 15 50 15 Z" 
                fill="none" 
                stroke="#38bdf8" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              <circle cx="50" cy="45" r="10" fill="none" stroke="#2563eb" strokeWidth="4" />
            </svg>
          </div>

          {/* Neon Glow Pin Shell (Back Face) */}
          <div className="absolute inset-0 flex items-center justify-center backface-hidden [transform:rotateY(180deg)_translateZ(15px)]">
            <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-[0_0_15px_rgba(37,99,235,0.6)]">
              <path 
                d="M50 15 C33 15 20 28 20 45 C20 68 50 85 50 85 C50 85 80 68 80 45 C80 28 67 15 50 15 Z" 
                fill="none" 
                stroke="#2563eb" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              <circle cx="50" cy="45" r="10" fill="none" stroke="#38bdf8" strokeWidth="4" />
            </svg>
          </div>

          {/* Connective 3D Side Plates */}
          <div className="absolute w-8 h-24 bg-gradient-to-b from-sky-500/30 to-blue-500/10 border-x border-sky-400/50 [transform:rotateY(90deg)_translateZ(48px)] blur-[1px]" />
          <div className="absolute w-8 h-24 bg-gradient-to-b from-sky-500/30 to-blue-500/10 border-x border-sky-400/50 [transform:rotateY(-90deg)_translateZ(48px)] blur-[1px]" />
        </motion.div>

        {/* 3D Flat Radar Circle (Underneath Pin) */}
        <div className="absolute bottom-6 w-56 h-56 rounded-full border border-sky-500/10 bg-sky-500/[0.02] [transform:rotateX(75deg)_translateZ(-20px)] flex items-center justify-center">
          {/* Pulsing Outer Wave */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0.8 }}
            animate={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border-2 border-sky-400/40"
          />
          {/* Pulsing Inner Wave */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0.9 }}
            animate={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 2.5, delay: 0.8, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border-2 border-blue-500/30"
          />
          {/* Radar Gridlines */}
          <div className="absolute inset-0 border border-white/5 rounded-full rotate-45" />
          <div className="absolute inset-0 border border-white/5 rounded-full -rotate-45" />
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5" />
          <div className="absolute left-1/2 top-0 h-full w-[1px] bg-white/5" />
        </div>
      </div>

      {/* 3. Title & Cyber Subtitle */}
      <div className="text-center mt-2 space-y-2 z-10">
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-3xl font-black tracking-widest text-white drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          GeoResolve<span className="text-sky-400">AI</span>
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-[9px] tracking-[0.25em] text-sky-200 font-semibold"
        >
          LOCATION INTELLIGENCE SUITE • V1.0.0
        </motion.p>
      </div>

      {/* 4. Progress Loading Bar & Telemetry Details */}
      <div className="w-64 mt-12 space-y-2 z-10">
        <div className="flex justify-between items-center text-[9px] text-white/40 tracking-wider">
          <span className="font-semibold">{statusText}</span>
          <div className="flex items-center space-x-1.5 font-mono font-bold">
            <span className="text-sky-400">{Math.round(progress)}%</span>
            <span className="text-white/20">|</span>
            <span className="text-emerald-400">{Math.max(0, parseFloat(((100 - progress) * 0.025).toFixed(1)))}s</span>
          </div>
        </div>
        
        {/* Loading track */}
        <div className="w-full h-[3px] bg-white/[0.04] rounded-full overflow-hidden border border-white/5 p-[1px]">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400 rounded-full shadow-[0_0_8px_#38bdf8]" 
            style={{ width: `${progress}%` }}
          />
      </div>
      </div>
    </motion.div>
  );
};
