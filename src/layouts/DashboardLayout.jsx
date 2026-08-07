import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGeo } from '../context/GeoContext';
import { 
  LayoutDashboard, 
  MapPin, 
  History, 
  Key, 
  BarChart3, 
  Settings, 
  LogOut, 
  Bell, 
  Search, 
  Menu, 
  X, 
  User,
  Shield,
  Activity,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { history, resolveAddress } = useGeo();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Hardcoded notification alerts to simulate system messages
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'API Limit Warning', desc: 'Production key has reached 75% usage threshold.', read: false, time: '20m ago' },
    { id: 2, title: 'Database Optimized', desc: 'Resolved cache cleared in 14ms.', read: true, time: '2h ago' },
    { id: 3, title: 'Welcome to GeoResolve', desc: 'Developer workspace initialized.', read: true, time: '1d ago' }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleGlobalSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      await resolveAddress(searchQuery);
      setSearchQuery('');
      navigate('/resolve');
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Resolve Address', path: '/resolve', icon: MapPin },
    { name: 'History', path: '/history', icon: History },
    { name: 'API Keys', path: '/api-keys', icon: Key },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans overflow-x-hidden relative grid-bg">
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-4 h-16 flex items-center justify-between">
        
        {/* Left: Branding & Mobile Menu Toggle */}
        <div className="flex items-center space-x-3">
          <button 
            className="md:hidden p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <Link to="/dashboard" className="flex items-center space-x-2.5 select-none group">
            <span className="text-xl">📍</span>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-400 bg-clip-text text-transparent group-hover:to-sky-300 transition-all duration-300">
              GeoResolve AI
            </span>
          </Link>
        </div>

        {/* Center: Global Geocode Search Input */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <form onSubmit={handleGlobalSearch} className="w-full relative">
            <input
              type="text"
              placeholder="Search or geocode address globally..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-white/5 rounded-lg pl-9 pr-12 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/10 transition-all font-medium"
            />
            <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-2.5" />
            <button 
              type="submit" 
              className="absolute right-2 top-1.5 px-2 py-0.5 rounded bg-slate-800 border border-white/10 text-[9px] font-mono text-white/40 hover:text-accent hover:border-accent/20 transition-all"
            >
              {searchLoading ? '...' : 'Enter'}
            </button>
          </form>
        </div>

        {/* Right: Telemetry Alerts & Profile */}
        <div className="flex items-center space-x-3.5 relative">
          
          {/* Notifications Bell */}
          <div className="relative">
            <button 
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileDropdownOpen(false);
              }}
              className={`p-2 rounded-lg border text-slate-300 hover:text-white transition-all select-none relative ${notificationsOpen ? 'bg-slate-900 border-accent/20 text-accent' : 'bg-transparent border-white/5 hover:bg-slate-950'}`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-slate-950 animate-pulse border-glow" />
              )}
            </button>

            {/* Notification Menu Card */}
            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2.5 w-80 rounded-xl border border-white/10 glass bg-slate-950/95 shadow-2xl overflow-hidden py-1 z-50"
                >
                  <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/80">Alert Notifications</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllRead} 
                        className="text-accent hover:underline text-[10px] font-semibold"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((item) => (
                      <div 
                        key={item.id} 
                        className={`px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors flex items-start space-x-2.5 relative ${!item.read ? 'bg-slate-900/30' : ''}`}
                      >
                        {!item.read && (
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white/80 flex items-center justify-between">
                            <span>{item.title}</span>
                            <span className="text-[9px] font-mono text-white/30 font-normal">{item.time}</span>
                          </div>
                          <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-1.5 text-center bg-black/20">
                    <Link 
                      to="/settings" 
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[10px] text-white/40 hover:text-white transition-colors flex items-center justify-center space-x-1"
                    >
                      <span>Configure thresholds</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile Avatar */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileDropdownOpen(!profileDropdownOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center space-x-2.5 focus:outline-none select-none group"
            >
              <div className="w-8 h-8 rounded-lg border border-white/10 group-hover:border-accent/40 transition-colors shadow-inner relative bg-slate-900/60 flex items-center justify-center text-slate-400 group-hover:text-accent">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden lg:block text-left text-xs">
                <div className="font-semibold text-white/80 group-hover:text-white transition-colors">{user?.name || 'Developer'}</div>
                <div className="text-[9px] text-white/40 uppercase tracking-wider font-semibold font-mono">{user?.role?.split(' ')[0] || 'Member'}</div>
              </div>
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {profileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2.5 w-56 rounded-xl border border-white/10 glass bg-slate-950/95 shadow-2xl overflow-hidden py-1 z-50"
                >
                  <div className="px-4 py-3 border-b border-white/5">
                    <div className="text-xs font-bold text-white/80 truncate">{user?.name || 'Developer User'}</div>
                    <div className="text-[10px] text-white/40 font-mono truncate">{user?.email || 'dev@georesolve.ai'}</div>
                  </div>
                  <div className="py-1">
                    <Link 
                      to="/settings" 
                      onClick={() => setProfileDropdownOpen(false)}
                      className="px-4 py-2 text-xs text-white/70 hover:text-white hover:bg-white/[0.03] transition-colors flex items-center space-x-2"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Account Settings</span>
                    </Link>
                    <div className="px-4 py-2 text-xs text-white/70 hover:bg-transparent flex items-center space-x-2 select-none">
                      <Shield className="w-3.5 h-3.5 text-accent/80" />
                      <span className="text-[10px] bg-sky-500/10 text-sky-400 font-mono font-semibold px-1.5 py-0.5 rounded uppercase">
                        {user?.role || 'Developer'}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-white/5 py-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors flex items-center space-x-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </header>

      {/* 2. Main Workstation Body (Sidebar + Content Container) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Collapsible Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-slate-950/40 border-r border-white/5 px-3 py-4 space-y-7 shrink-0 select-none">
          
          {/* Main Navigation Pages */}
          <div className="flex-grow space-y-1">
            <div className="px-3 text-[10px] font-bold text-white/30 uppercase tracking-widest font-mono mb-3">
              Geo Console
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 select-none ${
                    isActive 
                      ? 'bg-primary/10 border-l-2 border-accent text-accent' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Sidebar Footer Details (System Health HUD) */}
          <div className="bg-slate-900/40 border border-white/5 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
              <span>GR NETWORK</span>
              <span className="text-emerald-400 font-bold">ONLINE</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden relative border border-white/5">
              <div className="bg-gradient-to-r from-primary to-accent h-full w-[94%]" />
            </div>
            <div className="text-[8px] font-mono text-white/30 flex justify-between">
              <span>LATENCY: 14ms</span>
              <span>CACHE HIT: {((history.filter(h => h.cached).length / (history.length || 1)) * 100).toFixed(0)}%</span>
            </div>
          </div>
        </aside>

        {/* Dynamic Inner Page Workspace */}
        <main className="flex-grow h-[calc(100vh-4rem)] overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* 3. Mobile Left Slide-out Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Slide drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 bottom-0 left-0 w-72 bg-slate-950/95 border-r border-white/10 p-5 flex flex-col justify-between"
            >
              <div className="space-y-6">
                {/* Header inside drawer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-lg">📍</span>
                    <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white to-sky-400 bg-clip-text text-transparent">
                      GeoResolve AI
                    </span>
                  </div>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 text-white/50 hover:text-white rounded border border-white/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile Search */}
                <div>
                  <form onSubmit={handleGlobalSearch} className="w-full relative">
                    <input
                      type="text"
                      placeholder="Search address..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none"
                    />
                    <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-3" />
                  </form>
                </div>

                {/* Mobile Nav list */}
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                          isActive 
                            ? 'bg-primary/20 text-accent border-l-2 border-accent' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Drawer Footer logout */}
              <div className="space-y-4">
                <div className="border-t border-white/5 pt-4 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg border border-white/5 bg-slate-900/60 flex items-center justify-center text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">{user?.name}</div>
                    <div className="text-[9px] text-white/40">{user?.role}</div>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg border border-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/5 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout Session</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
