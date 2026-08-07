import React from 'react';
import { useGeo } from '../context/GeoContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { InteractiveMap } from '../components/InteractiveMap';
import { InteractiveChart } from '../components/InteractiveChart';
import { 
  Zap, 
  CheckCircle, 
  Layers, 
  Clock, 
  MapPin, 
  Key, 
  BarChart3, 
  Settings, 
  Copy,
  ChevronRight,
  Database
} from 'lucide-react';
import { motion } from 'framer-motion';

export const Dashboard = () => {
  const { user } = useAuth();
  const { history, metrics } = useGeo();
  const navigate = useNavigate();

  // Pick last resolved search coordinate or default to London
  const lastSearch = history.find(h => h.status !== 'Failed') || {
    address: 'Times Square, New York, NY 10036, USA',
    lat: 40.7580,
    lon: -73.9851
  };

  // Mock chart data representing 7-day query volume
  const chartData = [
    { label: 'Mon', value: 4890, extra: '99.5% Success' },
    { label: 'Tue', value: 5410, extra: '99.7% Success' },
    { label: 'Wed', value: 5120, extra: '99.4% Success' },
    { label: 'Thu', value: 6890, extra: '99.6% Success' },
    { label: 'Fri', value: 7200, extra: '99.8% Success' },
    { label: 'Sat', value: 4120, extra: '99.9% Success' },
    { label: 'Sun', value: 4500, extra: '99.5% Success' }
  ];

  // Quick copy coordinates utility
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert(`Copied: ${text}`);
  };

  // Quick Action Buttons schema
  const quickActions = [
    { name: 'Resolve Address', desc: 'Geocode locations instantly', path: '/resolve', icon: MapPin, color: 'text-sky-400 bg-sky-500/10 hover:border-sky-500/30' },
    { name: 'Manage API Keys', desc: 'Generate and revoke tokens', path: '/api-keys', icon: Key, color: 'text-blue-400 bg-blue-500/10 hover:border-blue-500/30' },
    { name: 'View Analytics', desc: 'Study request loads and performance', path: '/analytics', icon: BarChart3, color: 'text-indigo-400 bg-indigo-500/10 hover:border-indigo-500/30' },
    { name: 'Settings Hub', desc: 'Update passwords and limits', path: '/settings', icon: Settings, color: 'text-slate-400 bg-slate-500/10 hover:border-slate-500/30' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>Console Dashboard</span>
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Welcome back, <span className="text-accent font-semibold">{user?.name}</span>. Workspace status is optimal.
          </p>
        </div>
        <div className="mt-3 md:mt-0 flex items-center space-x-2 text-[10px] font-mono bg-slate-900 border border-white/5 px-3 py-1.5 rounded-lg text-white/60 select-none">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          <span>REAL-TIME ENGINE ONLINE</span>
        </div>
      </div>

      {/* 1. Statistics Cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Requests */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="glass rounded-xl p-4 flex items-center space-x-4 relative overflow-hidden"
        >
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider font-mono">Total Requests</div>
            <div className="text-xl font-black text-white mt-0.5">{metrics.totalRequests.toLocaleString()}</div>
            <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">
              +14.3% MoM
            </span>
          </div>
          <div className="absolute right-0 bottom-0 opacity-[0.02] text-8xl font-black text-white font-mono select-none pointer-events-none">
            #
          </div>
        </motion.div>

        {/* Successful Requests */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="glass rounded-xl p-4 flex items-center space-x-4 relative overflow-hidden"
        >
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider font-mono">Successful Queries</div>
            <div className="text-xl font-black text-white mt-0.5">{metrics.successfulRequests.toLocaleString()}</div>
            <span className="text-[9px] text-sky-400 font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">
              99.6% Success
            </span>
          </div>
        </motion.div>

        {/* Cache Hit Rate */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="glass rounded-xl p-4 flex items-center space-x-4 relative overflow-hidden"
        >
          <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Layers className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider font-mono">Cache Hit Ratio</div>
            <div className="text-xl font-black text-white mt-0.5">{metrics.cacheHitRate}%</div>
            
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2 border border-white/5">
              <div className="bg-sky-400 h-full" style={{ width: `${metrics.cacheHitRate}%` }} />
            </div>
          </div>
        </motion.div>

        {/* Average Response Time */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="glass rounded-xl p-4 flex items-center space-x-4 relative overflow-hidden"
        >
          <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider font-mono">Avg Latency</div>
            <div className="text-xl font-black text-white mt-0.5">{metrics.averageResponseTime}ms</div>
            <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">
              -12ms latency
            </span>
          </div>
        </motion.div>

      </div>

      {/* 2. Visualizations Panel Grid (Telemetry Charts + Map Visuals) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Telemetry chart */}
        <div className="lg:col-span-2 glass rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h2 className="text-xs uppercase font-bold tracking-wider font-mono text-white/60">
                Weekly Request Load
              </h2>
              <p className="text-[10px] text-white/30">Queries resolved per day</p>
            </div>
            <div className="flex items-center space-x-1.5 bg-slate-900 border border-white/5 px-2 py-1 rounded text-[9px] font-mono text-white/50">
              <Database className="w-3 h-3 text-accent" />
              <span>LOG: ALL KEY CREDENTIALS</span>
            </div>
          </div>
          <div className="flex-1 mt-4">
            <InteractiveChart data={chartData} type="area" height={220} />
          </div>
        </div>

        {/* Right: Live Map Telemetry */}
        <div className="glass rounded-xl p-5 flex flex-col space-y-4">
          <div>
            <h2 className="text-xs uppercase font-bold tracking-wider font-mono text-white/60">
              Active Geocoding Feed
            </h2>
            <p className="text-[10px] text-white/30 truncate">Target: {lastSearch.address}</p>
          </div>
          <div className="flex-1 min-h-[220px]">
            <InteractiveMap 
              lat={lastSearch.lat} 
              lon={lastSearch.lon} 
              address={lastSearch.address} 
            />
          </div>
        </div>

      </div>

      {/* 3. Operational Grid (Quick Actions + History feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Quick Actions */}
        <div className="glass rounded-xl p-5 flex flex-col space-y-4 select-none">
          <h2 className="text-xs uppercase font-bold tracking-wider font-mono text-white/60">
            Developer Controls
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-grow">
            {quickActions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.name}
                  onClick={() => navigate(act.path)}
                  className={`flex flex-col text-left p-3.5 rounded-lg border border-white/5 bg-slate-950/30 hover:bg-slate-950/70 transition-all text-xs group ${act.color}`}
                >
                  <div className="p-2 rounded border border-white/5 self-start mb-2 group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-white group-hover:text-accent transition-colors">{act.name}</span>
                  <span className="text-[10px] text-white/40 mt-1 leading-snug">{act.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Recent Searches Ledger */}
        <div className="lg:col-span-2 glass rounded-xl p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase font-bold tracking-wider font-mono text-white/60">
              Recent Telemetry Logs
            </h2>
            <Link to="/history" className="text-[10px] text-accent hover:underline flex items-center space-x-0.5 font-semibold">
              <span>View Audit Ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto select-text">
            {history.length === 0 ? (
              <div className="py-10 text-center text-xs text-white/30">
                No location queries stored. Resolve an address to populate.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-mono uppercase text-white/40 font-bold">
                    <th className="pb-2.5">Address Target</th>
                    <th className="pb-2.5">Coordinates</th>
                    <th className="pb-2.5">Accuracy</th>
                    <th className="pb-2.5 text-right">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {history.slice(0, 4).map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 font-semibold text-white/80 pr-4 max-w-[200px] truncate">
                        {item.address}
                      </td>
                      <td className="py-3 font-mono text-[10px] text-white/50">
                        <button 
                          onClick={() => copyToClipboard(`${item.lat}, ${item.lon}`)}
                          className="flex items-center space-x-1.5 hover:text-accent select-none"
                          title="Copy Coordinates"
                        >
                          <span>{item.lat.toFixed(4)}, {item.lon.toFixed(4)}</span>
                          <Copy className="w-3 h-3 opacity-55" />
                        </button>
                      </td>
                      <td className="py-3">
                        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          item.confidence >= 0.9 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {(item.confidence * 100).toFixed(0)}% Match
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          item.status === 'Cached' 
                            ? 'bg-sky-500/10 text-sky-400' 
                            : item.status === 'Success' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
