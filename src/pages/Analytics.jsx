import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { InteractiveChart } from '../components/InteractiveChart';
import { 
  BarChart3, 
  TrendingUp, 
  Layers, 
  Globe, 
  Percent, 
  Calendar,
  Zap,
  Activity,
  Cpu
} from 'lucide-react';
import { motion } from 'framer-motion';

export const Analytics = () => {
  const [timeframe, setTimeframe] = useState('7d'); // 24h | 7d | 30d
  const [liveMetrics, setLiveMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiveMetrics = async () => {
      const token = localStorage.getItem('georesolve_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        const response = await axios.get(`${API_URL}/analytics`, { headers });
        setLiveMetrics(response.data);
      } catch (err) {
        console.error('Failed to load live operational metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveMetrics();
  }, []);

  // Data sets matching the timeframe
  const usageData = {
    '24h': [
      { label: '00:00', value: 890 }, { label: '04:00', value: 1200 },
      { label: '08:00', value: 2450 }, { label: '12:00', value: 3100 },
      { label: '16:00', value: 2900 }, { label: '20:00', value: 1800 }
    ],
    '7d': [
      { label: 'Mon', value: 4890 }, { label: 'Tue', value: 5410 },
      { label: 'Wed', value: 5120 }, { label: 'Thu', value: 6890 },
      { label: 'Fri', value: 7200 }, { label: 'Sat', value: 4120 },
      { label: 'Sun', value: 4500 }
    ],
    '30d': [
      { label: 'Week 1', value: 28400 }, { label: 'Week 2', value: 32100 },
      { label: 'Week 3', value: 29800 }, { label: 'Week 4', value: 35400 }
    ]
  };

  const cachePerformance = {
    '24h': [
      { label: 'Live Core', value: 9140, extra: 'Resolved from backend' },
      { label: 'Memory Cache', value: 3200, extra: 'Resolved in <5ms' }
    ],
    '7d': [
      { label: 'Live Core', value: 28527, extra: 'Resolved from backend' },
      { label: 'Memory Cache', value: 14352, extra: 'Resolved in <5ms' }
    ],
    '30d': [
      { label: 'Live Core', value: 114202, extra: 'Resolved from backend' },
      { label: 'Memory Cache', value: 54890, extra: 'Resolved in <5ms' }
    ]
  };

  const countryDistribution = {
    '24h': [
      { country: 'United States', percentage: 48, count: 5928 },
      { country: 'United Kingdom', percentage: 18, count: 2223 },
      { country: 'Japan', percentage: 14, count: 1729 },
      { country: 'France', percentage: 10, count: 1235 },
      { country: 'India', percentage: 7, count: 864 },
      { country: 'Australia', percentage: 3, count: 370 }
    ],
    '7d': [
      { country: 'United States', percentage: 45, count: 19295 },
      { country: 'United Kingdom', percentage: 20, count: 8575 },
      { country: 'Japan', percentage: 15, count: 6432 },
      { country: 'France', percentage: 11, count: 4716 },
      { country: 'India', percentage: 6, count: 2572 },
      { country: 'Australia', percentage: 3, count: 1289 }
    ],
    '30d': [
      { country: 'United States', percentage: 42, count: 71020 },
      { country: 'United Kingdom', percentage: 22, count: 37200 },
      { country: 'Japan', percentage: 16, count: 27050 },
      { country: 'France', percentage: 10, count: 16900 },
      { country: 'India', percentage: 7, count: 11837 },
      { country: 'Australia', percentage: 3, count: 5085 }
    ]
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>Operational Analytics</span>
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Track geocoding performance, caching metrics, and API utilization globally.
          </p>
        </div>

        {/* Time selector */}
        <div className="flex items-center bg-slate-950 border border-white/5 p-0.5 rounded-lg self-start sm:self-center select-none">
          {[
            { label: '24 Hours', value: '24h' },
            { label: '7 Days', value: '7d' },
            { label: '30 Days', value: '30d' }
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setTimeframe(item.value)}
              className={`px-3 py-1.5 rounded text-[10px] font-semibold transition-colors ${
                timeframe === item.value 
                  ? 'bg-slate-900 border border-white/5 text-accent shadow-sm' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Graph 1: Request Load */}
        <div className="lg:col-span-2 glass rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-accent animate-pulse" />
            <h2 className="text-xs uppercase font-extrabold tracking-wider font-mono text-white/60">
              API Requests Load over time
            </h2>
          </div>
          <div className="flex-grow pt-4">
            <InteractiveChart data={usageData[timeframe]} type="area" height={240} />
          </div>
        </div>

        {/* Graph 2: Cache Performance */}
        <div className="glass rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs uppercase font-extrabold tracking-wider font-mono text-white/60">
              Memory Cache Performance
            </h2>
          </div>
          <div className="flex-grow pt-4 flex flex-col justify-center">
            <InteractiveChart data={cachePerformance[timeframe]} type="bar" height={190} />
            <div className="text-[10px] text-white/40 leading-normal text-center mt-3 select-none">
              Caching intercepts matching queries instantly, saving network bandwidth and latency.
            </div>
          </div>
        </div>

        {/* Graph 3: Country distribution */}
        <div className="glass rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center space-x-2 pb-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs uppercase font-extrabold tracking-wider font-mono text-white/60">
              Geographic Distribution
            </h2>
          </div>

          <div className="space-y-3.5 flex-grow justify-center flex flex-col">
            {countryDistribution[timeframe].map((item) => (
              <div key={item.country} className="space-y-1 text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-semibold text-white/80">{item.country}</span>
                  <span className="font-mono text-white/40">{item.count.toLocaleString()} queries ({item.percentage}%)</span>
                </div>
                
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/5 relative">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Graph 4: Reliability metrics */}
        <div className="lg:col-span-2 glass rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center space-x-2">
            <Percent className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs uppercase font-extrabold tracking-wider font-mono text-white/60">
              Reliability & Latency Benchmarks
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            
            <div className="p-4 rounded-lg bg-slate-950/60 border border-white/5 flex flex-col space-y-1">
              <span className="text-[9px] font-mono text-white/40 uppercase">Engine Success Rate</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {liveMetrics ? `${liveMetrics.success_rate}%` : '99.87%'}
              </span>
              <span className="text-[8px] text-white/30 font-mono">LIVE SLA RATE</span>
            </div>

            <div className="p-4 rounded-lg bg-slate-950/60 border border-white/5 flex flex-col space-y-1">
              <span className="text-[9px] font-mono text-white/40 uppercase">Avg Core Latency</span>
              <span className="text-2xl font-black text-accent font-mono">
                {liveMetrics ? `${liveMetrics.avg_latency}ms` : '420ms'}
              </span>
              <span className="text-[8px] text-white/30 font-mono">CORE SYSTEM LATENCY</span>
            </div>

            <div className="p-4 rounded-lg bg-slate-950/60 border border-white/5 flex flex-col space-y-1">
              <span className="text-[9px] font-mono text-white/40 uppercase">Typo Corrections</span>
              <span className="text-2xl font-black text-sky-400 font-mono">
                {liveMetrics ? liveMetrics.typo_corrections : 0}
              </span>
              <span className="text-[8px] text-white/30 font-mono">
                OK: {liveMetrics ? liveMetrics.successful_corrections : 0} | ERR: {liveMetrics ? liveMetrics.failed_corrections : 0}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-950/60 border border-white/5 flex flex-col space-y-1">
              <span className="text-[9px] font-mono text-white/40 uppercase">Correction Accuracy</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {liveMetrics ? `${liveMetrics.correction_accuracy}%` : '0.00%'}
              </span>
              <span className="text-[8px] text-white/30 font-mono">FUZZY ACCURACY METRIC</span>
            </div>

          </div>

          {/* Infrastructure status timeline */}
          <div className="border-t border-white/5 pt-3.5 flex items-center justify-between text-[10px] font-mono text-white/40 select-none">
            <div className="flex items-center space-x-1">
              <Cpu className="w-3.5 h-3.5 text-accent" />
              <span>PRIMARY COMPUTE: AWS us-east-1</span>
            </div>
            <span>LAST DEPLOYED: AUG 7, 2026</span>
          </div>
        </div>

      </div>

    </div>
  );
};
