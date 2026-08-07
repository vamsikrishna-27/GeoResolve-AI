import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Shield, Info, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const Login = () => {
  const { login, loginDemo, error, setError } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    // Reset error when entering page
    setError(null);
  }, []);

  // Background Particles and Network Grid Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle class definition
    const particles = [];
    const particleCount = 45;
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    // Static coordinates pins in the background
    const bgPins = [
      { x: 0.15, y: 0.35, label: 'SFO [37.77, -122.41]' },
      { x: 0.45, y: 0.25, label: 'LHR [51.50, -0.12]' },
      { x: 0.75, y: 0.40, label: 'HND [35.67, 139.65]' },
      { x: 0.85, y: 0.75, label: 'SYD [-33.86, 151.20]' },
      { x: 0.30, y: 0.70, label: 'GRU [-23.55, -46.63]' },
      { x: 0.60, y: 0.55, label: 'BLR [12.97, 77.59]' }
    ];

    let pulseScale = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // 1. Draw Network Connections
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.05)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < bgPins.length; i++) {
        for (let j = i + 1; j < bgPins.length; j++) {
          ctx.beginPath();
          ctx.moveTo(bgPins[i].x * w, bgPins[i].y * h);
          ctx.lineTo(bgPins[j].x * w, bgPins[j].y * h);
          ctx.stroke();
        }
      }

      // 2. Draw Pins and sonar pulses
      pulseScale = (pulseScale + 0.15) % 20;
      bgPins.forEach(pin => {
        const px = pin.x * w;
        const py = pin.y * h;

        // Sonar ring
        ctx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0, (20 - pulseScale) / 20) * 0.25})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, pulseScale, 0, Math.PI * 2);
        ctx.stroke();

        // Core dot
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Tiny labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.font = '8px monospace';
        ctx.fillText(pin.label, px + 8, py + 3);
      });

      // 3. Move & Draw Particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around bounds
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setFormLoading(true);
    const success = await login(email, password);
    setFormLoading(false);
    
    if (success) {
      navigate('/dashboard');
    }
  };

  const handleDemoClick = async () => {
    setFormLoading(true);
    const success = await loginDemo();
    setFormLoading(false);
    if (success) {
      navigate('/dashboard');
    }
  };

  const autofillDemo = () => {
    setEmail('demo@georesolve.ai');
    setPassword('password123');
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-[#020617] text-white overflow-hidden select-none px-4 py-8">
      {/* Dynamic Animated Canvas Grid Background */}
      <canvas ref={canvasRef} className="absolute inset-0 block pointer-events-none z-0 opacity-60" />
      <div className="absolute inset-0 bg-radial-glow opacity-80 pointer-events-none z-0" />
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none z-0" />

      {/* TOP CENTER: Branding */}
      <div className="w-full flex flex-col items-center text-center mt-6 md:mt-10 z-10 select-none">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center space-x-3 text-3xl font-extrabold"
        >
          <span className="text-glow text-3xl">📍</span>
          <span className="bg-gradient-to-r from-white via-slate-100 to-sky-400 bg-clip-text text-transparent tracking-tight">
            GeoResolve AI
          </span>
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-xs uppercase tracking-widest text-slate-400 font-mono mt-2.5 font-bold"
        >
          AI-Powered Location Intelligence Platform
        </motion.p>
      </div>

      {/* CENTER: Login Card */}
      <div className="flex-1 w-full flex items-center justify-center py-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="w-full max-w-[430px] rounded-2xl glass-glowing p-6 md:p-8 flex flex-col relative"
        >
          <h2 className="text-xl font-extrabold text-white text-center tracking-tight">
            Sign In
          </h2>
          <p className="text-[11px] text-slate-400 text-center mt-1">
            Access your secure location analytics dashboard.
          </p>

          {error && (
            <div className="mt-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-[11px] font-medium leading-relaxed">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
            
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/10 transition-all font-medium"
                />
                <Mail className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                  Password
                </label>
                <a 
                  href="#forgot" 
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Forgot password simulation: Check the Demo credentials card below to sign in instantly.');
                  }}
                  className="text-[10px] text-accent hover:underline font-semibold"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/5 rounded-lg pl-10 pr-10 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/10 transition-all font-medium"
                />
                <Lock className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-white/30 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="w-3.5 h-3.5 bg-slate-900 border border-white/10 rounded focus:ring-offset-0 focus:ring-0 text-primary accent-primary"
              />
              <label htmlFor="remember" className="ml-2 text-[11px] text-slate-400 font-medium select-none cursor-pointer">
                Keep me signed in
              </label>
            </div>

            {/* Buttons (Equal Width, Stacked) */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-primary hover:bg-primary/95 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors border border-primary/20 flex items-center justify-center space-x-2 select-none shadow-md shadow-primary/10 disabled:opacity-50"
              >
                <span>{formLoading ? 'Authenticating...' : 'Sign In'}</span>
                {!formLoading && <ArrowRight className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleDemoClick}
                disabled={formLoading}
                className="w-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-2 select-none"
              >
                <span>Quick Demo Login</span>
              </button>
            </div>
          </form>

          {/* Demo Credentials Info Box */}
          <div 
            onClick={autofillDemo}
            className="mt-6 p-3 rounded-lg border border-white/5 bg-slate-900/40 hover:bg-slate-900/60 hover:border-white/10 transition-all cursor-pointer flex items-start space-x-2.5"
          >
            <Info className="w-4 h-4 text-accent mt-0.5 shrink-0" />
            <div className="text-[10px] text-slate-400 leading-normal select-none">
              <span className="text-white font-semibold">Demo Credentials (Click to Autofill):</span>
              <div className="mt-1 font-mono">
                Email: <span className="text-accent underline">demo@georesolve.ai</span>
              </div>
              <div className="font-mono">
                Pass: <span className="text-accent underline">password123</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* BOTTOM FOOTER */}
      <div className="w-full text-center text-[10px] text-white/30 font-mono tracking-wider z-10 select-none">
        SECURE ENTERPRISE ENCRYPTED ARCHITECTURE • 2FA VERIFIED
      </div>
    </div>
  );
};
