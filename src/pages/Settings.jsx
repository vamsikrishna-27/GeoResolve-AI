import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Lock, 
  Bell, 
  Shield, 
  Sliders, 
  Sparkles, 
  Save, 
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Settings = () => {
  const { user, login } = useAuth();

  const [activeTab, setActiveTab] = useState('profile'); // profile | password | notifications | developer
  
  // Profile Form States
  const [profileName, setProfileName] = useState(user?.name || 'Jane Doe');
  const [profileEmail, setProfileEmail] = useState(user?.email || 'demo@georesolve.ai');
  const [profileCompany, setProfileCompany] = useState(user?.company || 'Vercel Partner Corp');
  
  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Notification States
  const [notifyLimits, setNotifyLimits] = useState(true);
  const [notifyDailyReports, setNotifyDailyReports] = useState(false);
  const [notifySecurityAlerts, setNotifySecurityAlerts] = useState(true);
  const [webhookSlack, setWebhookSlack] = useState('https://hooks.slack.com/services/T00000000/B00000000/...');

  // Developer / Theme Settings
  const [rateLimit, setRateLimit] = useState(25000);
  const [themeMode, setThemeMode] = useState('neon-dark'); // neon-dark | slate-dark | dracula
  const [twoFactor, setTwoFactor] = useState(false);

  // Form saving UI states
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const triggerSave = (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveSuccess(false);

    // Simulate API update
    setTimeout(() => {
      setSaveLoading(false);
      setSaveSuccess(true);
      // Automatically fade out success message
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1000);
  };

  const tabs = [
    { id: 'profile', label: 'User Profile', icon: User },
    { id: 'password', label: 'Security & Access', icon: Lock },
    { id: 'notifications', label: 'System Alerts', icon: Bell },
    { id: 'developer', label: 'Developer Limits', icon: Sliders }
  ];

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>Workspace Settings</span>
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Configure profile credentials, security credentials, threshold notifications, and local client limitations.
          </p>
        </div>

        {/* Global Save Button */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold font-mono flex items-center space-x-1"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>SAVED SUCCESSFULLY</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Sidebar Tabs Navigation */}
        <div className="lg:col-span-1 flex flex-col space-y-1.5 select-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSaveSuccess(false);
                }}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all text-left ${
                  isSelected 
                    ? 'bg-slate-900 border border-white/5 text-accent shadow-sm' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-accent' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Tab Form Panel */}
        <div className="lg:col-span-3">
          <form onSubmit={triggerSave} className="glass rounded-xl p-5 md:p-6 space-y-6">
            
            {/* 1. USER PROFILE PANELS */}
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5"
              >
                <h3 className="text-xs uppercase font-extrabold tracking-wider font-mono text-white/50">
                  Profile Information
                </h3>
                
                {/* Avatar detail */}
                <div className="flex items-center space-x-4 pb-2 border-b border-white/5 select-none">
                  <div className="w-14 h-14 rounded-lg border border-white/10 bg-slate-900/60 flex items-center justify-center text-slate-400">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Profile Identity</h4>
                    <p className="text-[10px] text-white/40 mt-0.5">Your system identification details and access keys.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Full Display Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent/40 font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Account Email</label>
                    <input
                      type="email"
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent/40 font-medium"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Organization / Company</label>
                    <input
                      type="text"
                      required
                      value={profileCompany}
                      onChange={(e) => setProfileCompany(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent/40 font-medium"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. PASSWORD ACCESS PANELS */}
            {activeTab === 'password' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5"
              >
                <h3 className="text-xs uppercase font-extrabold tracking-wider font-mono text-white/50">
                  Password Credential Configurations
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Current Password</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent/40 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-7 text-white/30 hover:text-white"
                    >
                      {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">New Password</label>
                      <input
                        type={showPass ? 'text' : 'password'}
                        placeholder="Min. 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-slate-950/60 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent/40 font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Confirm New Password</label>
                      <input
                        type={showPass ? 'text' : 'password'}
                        placeholder="Re-enter passwords"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-slate-950/60 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent/40 font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-white/5 select-none">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-white/80">Two-Factor Authentication</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTwoFactor(!twoFactor)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                        twoFactor ? 'bg-primary' : 'bg-slate-800'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                        twoFactor ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. SYSTEM ALERTS / NOTIFICATION PANELS */}
            {activeTab === 'notifications' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5"
              >
                <h3 className="text-xs uppercase font-extrabold tracking-wider font-mono text-white/50">
                  Notification Triggers
                </h3>

                <div className="space-y-4 select-none">
                  
                  {/* Trigger 1 */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-white/90">API Usage Alerts</h4>
                      <p className="text-[10px] text-white/40">Email warnings when credential usage reaches 75% limits.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifyLimits(!notifyLimits)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none ${notifyLimits ? 'bg-primary' : 'bg-slate-800'}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full transform transition-transform ${notifyLimits ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Trigger 2 */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-white/90">Daily Operations Audit</h4>
                      <p className="text-[10px] text-white/40">Get daily summary reports of geocoding load analytics.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifyDailyReports(!notifyDailyReports)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none ${notifyDailyReports ? 'bg-primary' : 'bg-slate-800'}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full transform transition-transform ${notifyDailyReports ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Trigger 3 */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-white/90">Security Notifications</h4>
                      <p className="text-[10px] text-white/40">Immediate emails on new API token creation or IP logins.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifySecurityAlerts(!notifySecurityAlerts)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none ${notifySecurityAlerts ? 'bg-primary' : 'bg-slate-800'}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full transform transition-transform ${notifySecurityAlerts ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* slack webhook integrations */}
                  <div className="space-y-1.5 pt-2 select-text">
                    <label className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Slack webhook integration</label>
                    <input
                      type="url"
                      value={webhookSlack}
                      onChange={(e) => setWebhookSlack(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent/40 font-mono"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. DEVELOPER / THEME PANEL */}
            {activeTab === 'developer' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5"
              >
                <h3 className="text-xs uppercase font-extrabold tracking-wider font-mono text-white/50">
                  Global Rate limits & Theme Config
                </h3>

                <div className="space-y-5 select-none">
                  
                  {/* Slider limits */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-white/80">API Request Rate Limit Threshold</span>
                      <span className="font-mono text-accent font-bold">{(rateLimit).toLocaleString()} req/month</span>
                    </div>
                    <input
                      type="range"
                      min="5000"
                      max="100000"
                      step="5000"
                      value={rateLimit}
                      onChange={(e) => setRateLimit(Number(e.target.value))}
                      className="w-full bg-slate-950 accent-primary h-1 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-white/30">
                      <span>5K/MO (FREE SANDBOX)</span>
                      <span>100K/MO (SCALE PLAN)</span>
                    </div>
                  </div>

                  {/* Theme styling selector */}
                  <div className="space-y-2.5 pt-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Interface Theme presets</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'neon-dark', name: 'Cyber Neon (Active)', desc: 'Glowing sky/blue accents' },
                        { id: 'slate-dark', name: 'Carbon Black', desc: 'Monochrome muted clean' },
                        { id: 'dracula', name: 'Dracula Purple', desc: 'Vibrant violet details' }
                      ].map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setThemeMode(theme.id)}
                          className={`text-left p-3 rounded-lg border text-xs transition-all relative ${
                            themeMode === theme.id 
                              ? 'bg-primary/5 border-primary text-accent' 
                              : 'bg-slate-950 border-white/5 text-slate-400 hover:text-white hover:bg-slate-900/50'
                          }`}
                        >
                          {themeMode === theme.id && (
                            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-accent rounded-full border-glow" />
                          )}
                          <span className="font-bold text-white block">{theme.name}</span>
                          <span className="text-[9px] text-white/35 mt-1 block">{theme.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Form Footer Save Actions */}
            <div className="border-t border-white/5 pt-4 flex justify-end select-none">
              <button
                type="submit"
                disabled={saveLoading}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors border border-primary/20 shadow shadow-primary/10 disabled:opacity-40"
              >
                {saveLoading ? (
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{saveLoading ? 'Applying Changes...' : 'Save Configuration'}</span>
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
};
