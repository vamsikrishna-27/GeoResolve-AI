import React, { useState } from 'react';
import { useGeo } from '../context/GeoContext';
import { 
  Key, 
  Plus, 
  Copy, 
  Eye, 
  EyeOff, 
  Trash2, 
  RefreshCw, 
  Check, 
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ApiKeys = () => {
  const { apiKeys, generateApiKey, toggleKeyStatus, deleteApiKey } = useGeo();

  const [copiedId, setCopiedId] = useState(null);
  const [revealedKeys, setRevealedKeys] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleReveal = (id) => {
    setRevealedKeys(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    generateApiKey(newKeyName);
    setNewKeyName('');
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>API Credentials Workbench</span>
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Create, authenticate, and manage secret tokens to connect external GIS servers.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/95 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all select-none shadow shadow-primary/10 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Generate New Key</span>
        </button>
      </div>

      {/* Grid containing credentials */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {apiKeys.map((key) => {
          const isRevealed = revealedKeys[key.id];
          const usagePercent = Math.min(100, Math.round((key.usage / key.limit) * 100));
          const isQuotaCritical = usagePercent >= 75;

          return (
            <motion.div
              layout
              key={key.id}
              className={`glass rounded-xl p-5 flex flex-col justify-between space-y-5 relative overflow-hidden transition-colors border ${
                key.status === 'Revoked' 
                  ? 'border-white/5 opacity-55' 
                  : isQuotaCritical 
                  ? 'border-yellow-500/20' 
                  : 'border-white/5'
              }`}
            >
              {/* Header details */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-xs font-extrabold text-white truncate max-w-[170px]">{key.name}</h3>
                  <div className="text-[9px] text-white/35 font-mono">CREATED: {key.createdDate}</div>
                </div>
                <button
                  onClick={() => toggleKeyStatus(key.id)}
                  className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full select-none transition-colors border ${
                    key.status === 'Active'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20'
                      : 'bg-slate-900 text-slate-400 border-white/5 hover:bg-slate-800'
                  }`}
                  title="Toggle Active/Revoked status"
                >
                  {key.status}
                </button>
              </div>

              {/* API Token Box */}
              <div className="space-y-1 bg-slate-950/80 border border-white/5 p-2.5 rounded-lg">
                <div className="text-[8px] uppercase tracking-wider font-bold text-white/30 font-mono">TOKEN STRING</div>
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <code className="font-mono text-accent truncate max-w-[160px] text-[10px]">
                    {isRevealed ? key.token : `${key.token.substring(0, 10)}••••••••••••••••••••`}
                  </code>
                  
                  <div className="flex items-center space-x-1.5 ml-2 select-none">
                    {/* Reveal/Hide */}
                    <button
                      onClick={() => handleToggleReveal(key.id)}
                      className="text-white/40 hover:text-white transition-colors"
                      title={isRevealed ? "Mask Key" : "Reveal Key"}
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    {/* Copy */}
                    <button
                      onClick={() => handleCopy(key.id, key.token)}
                      className="text-white/40 hover:text-accent transition-colors"
                      title="Copy Key"
                    >
                      {copiedId === key.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Usage Analytics bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-white/40 font-medium">USAGE:</span>
                  <span className={`font-bold ${isQuotaCritical ? 'text-yellow-400' : 'text-white/70'}`}>
                    {key.usage.toLocaleString()} / {key.limit.toLocaleString()}
                  </span>
                </div>
                
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/5 relative">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      key.status === 'Revoked' 
                        ? 'bg-slate-700' 
                        : isQuotaCritical 
                        ? 'bg-yellow-400 border-glow' 
                        : 'bg-primary'
                    }`} 
                    style={{ width: `${usagePercent}%` }} 
                  />
                </div>

                <div className="flex justify-between items-center text-[9px] font-mono text-white/30 pt-0.5">
                  <span>EXPIRY: {key.expiry}</span>
                  {isQuotaCritical && key.status === 'Active' && (
                    <span className="text-yellow-400 flex items-center space-x-0.5">
                      <AlertCircle className="w-2.5 h-2.5" />
                      <span>Quota High</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="border-t border-white/5 pt-3.5 flex justify-end select-none">
                <button
                  onClick={() => {
                    if (window.confirm(`Delete API credentials for "${key.name}"? Active calls using this key will immediately fail.`)) {
                      deleteApiKey(key.id);
                    }
                  }}
                  className="px-2.5 py-1 text-[10px] rounded border border-red-500/10 text-red-400/80 hover:bg-red-500/5 hover:text-red-300 transition-colors flex items-center space-x-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Key</span>
                </button>
              </div>
            </motion.div>
          );
        })}

      </div>

      {/* Generator Modal Window */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Modal Overlay backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Glass box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md rounded-2xl glass-glowing p-6 bg-slate-950/95 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-2 text-white">
                  <Key className="w-4 h-4 text-accent" />
                  <h3 className="font-extrabold text-sm tracking-tight">Generate API Credentials</h3>
                </div>
                <button 
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded text-white/40 hover:text-white border border-white/5 hover:bg-slate-900 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                    API Key Alias Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Staging Server Webhook"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/10 transition-all font-medium"
                  />
                  <span className="text-[9px] text-white/30 leading-snug block">
                    Give this API Key a descriptive alias to track its query workloads across servers.
                  </span>
                </div>

                <div className="p-3 bg-slate-900/30 border border-white/5 rounded-lg text-[9px] text-slate-400 leading-normal flex items-start space-x-2 select-none">
                  <HelpCircle className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                  <span>
                    New keys are generated on the <strong className="text-white font-semibold">Live Sandbox</strong> environment. They include a rate-limit threshold of 25,000 queries and expire in 1 year.
                  </span>
                </div>

                <div className="pt-2 flex justify-end space-x-2 select-none">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-white/5 text-white/70 hover:text-white hover:bg-slate-900 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/95 text-white text-xs font-semibold transition-all border border-primary/20 shadow shadow-primary/10"
                  >
                    Generate Credentials
                  </button>
                </div>
              </form>
            </motion.div>

          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
