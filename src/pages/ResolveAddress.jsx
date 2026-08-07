import React, { useState } from 'react';
import { useGeo } from '../context/GeoContext';
import { InteractiveMap } from '../components/InteractiveMap';
import { 
  Search, 
  MapPin, 
  Copy, 
  Globe, 
  Navigation, 
  Activity, 
  CheckCircle,
  FileCode,
  Layout,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ResolveAddress = () => {
  const { resolveAddress, history } = useGeo();

  const [addressInput, setAddressInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('card'); // card | json

  // Quick preset targets
  const presets = [
    'Times Square, New York, NY',
    'Eiffel Tower, Paris',
    'Sydney Opera House',
    'Shibuya Crossing, Tokyo',
    'Colosseum, Rome'
  ];

  const handlePresetClick = (preset) => {
    setAddressInput(preset);
    triggerGeocode(preset);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    triggerGeocode(addressInput);
  };

  const triggerGeocode = async (query) => {
    if (!query || !query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const record = await resolveAddress(query);
      setResult(record);
    } catch (err) {
      setError(err.message || 'Geocoding failed. Try searching a different location.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert(`Copied: ${text}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
          <span>Resolve Address</span>
        </h1>
        <p className="text-xs text-white/50 mt-1">
          Resolve unstructured global address strings into geographic spatial coordinates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: Input search & Results */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Geocoder Panel Card */}
          <div className="glass rounded-xl p-5 md:p-6 space-y-5 relative">
            <h2 className="text-xs uppercase font-bold tracking-wider font-mono text-white/60">
              Address Query Console
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter address, city, coordinate landmarks, or postal code..."
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/5 rounded-lg pl-11 pr-28 py-3 text-xs text-white placeholder-white/25 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/10 transition-all font-medium"
                />
                <MapPin className="w-4 h-4 text-white/30 absolute left-4 top-3.5" />
                <button
                  type="submit"
                  disabled={loading || !addressInput.trim()}
                  className="absolute right-2 top-2 px-4 py-1.5 rounded bg-primary hover:bg-primary/95 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all select-none shadow shadow-primary/10 disabled:opacity-40"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{loading ? 'Resolving...' : 'Resolve'}</span>
                </button>
              </div>
            </form>

            {/* Quick Presets tags */}
            <div className="space-y-2 select-none">
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-mono font-bold">Quick Sandbox Landmarks</div>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handlePresetClick(preset)}
                    className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-white/5 px-2.5 py-1 rounded text-white/60 hover:text-accent transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Visual Interface */}
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-4 min-h-[300px]"
              >
                {/* Spinner scanner */}
                <div className="relative w-16 h-16 flex items-center justify-center border border-white/5 rounded-full bg-slate-950">
                  <RefreshCw className="w-6 h-6 text-accent animate-spin" />
                  <div className="absolute inset-0 rounded-full border border-accent/25 animate-ping" />
                </div>
                <div className="space-y-1 font-mono">
                  <div className="text-xs text-white/80 font-bold uppercase tracking-wider">RESOLVING SPACE SEGMENT...</div>
                  <div className="text-[10px] text-white/40">Querying OSM network registry...</div>
                </div>
              </motion.div>
            )}

            {error && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold flex items-start space-x-3"
              >
                <div className="p-1 rounded bg-red-500/20 text-red-500">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white">Geocode Parsing Error</h4>
                  <p className="mt-1 text-red-400/80 leading-relaxed">{error}</p>
                </div>
              </motion.div>
            )}

            {result && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Result header layout selectors */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase font-extrabold tracking-widest font-mono text-white/50">
                    Resolution Output Payload
                  </h3>
                  
                  {/* View modes toggle */}
                  <div className="flex items-center bg-slate-950 border border-white/5 p-0.5 rounded-lg select-none">
                    <button
                      onClick={() => setViewMode('card')}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold flex items-center space-x-1.5 transition-colors ${
                        viewMode === 'card' 
                          ? 'bg-slate-900 border border-white/5 text-accent shadow-sm' 
                          : 'text-white/40 hover:text-white'
                      }`}
                    >
                      <Layout className="w-3 h-3" />
                      <span>Telemetry Card</span>
                    </button>
                    <button
                      onClick={() => setViewMode('json')}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold flex items-center space-x-1.5 transition-colors ${
                        viewMode === 'json' 
                          ? 'bg-slate-900 border border-white/5 text-accent shadow-sm' 
                          : 'text-white/40 hover:text-white'
                      }`}
                    >
                      <FileCode className="w-3 h-3" />
                      <span>JSON Response</span>
                    </button>
                  </div>
                </div>

                {/* View rendering */}
                {viewMode === 'card' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Primary coordinates card */}
                    <div className="glass rounded-xl p-5 space-y-4 border-l-2 border-accent col-span-1 sm:col-span-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-[9px] uppercase font-bold text-white/40 tracking-wider font-mono">Matched Registry Address</div>
                          <h4 className="text-sm font-extrabold text-white mt-1 leading-relaxed">{result.address}</h4>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          result.confidence >= 0.9 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {(result.confidence * 100).toFixed(0)}% Match
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                        <div>
                          <div className="text-[9px] font-mono text-white/40">LATITUDE</div>
                          <div className="text-base font-black text-white font-mono mt-0.5 flex items-center space-x-1">
                            <span>{result.lat.toFixed(6)}</span>
                            <button 
                              onClick={() => copyToClipboard(result.lat.toFixed(6))}
                              className="text-white/30 hover:text-accent transition-colors"
                              title="Copy latitude"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-mono text-white/40">LONGITUDE</div>
                          <div className="text-base font-black text-white font-mono mt-0.5 flex items-center space-x-1">
                            <span>{result.lon.toFixed(6)}</span>
                            <button 
                              onClick={() => copyToClipboard(result.lon.toFixed(6))}
                              className="text-white/30 hover:text-accent transition-colors"
                              title="Copy longitude"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Regional details card */}
                    <div className="glass rounded-xl p-5 space-y-4">
                      <h4 className="text-[10px] font-bold text-white/50 uppercase font-mono tracking-widest">Postal Geography</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span className="text-white/40 font-medium">City:</span>
                          <span className="font-bold text-white/80">{result.city || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span className="text-white/40 font-medium">State / Region:</span>
                          <span className="font-bold text-white/80">{result.state || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span className="text-white/40 font-medium">Postal Code:</span>
                          <span className="font-bold text-white/80 font-mono">{result.postcode || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40 font-medium">Country:</span>
                          <span className="font-bold text-white/80">{result.country || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata details card */}
                    <div className="glass rounded-xl p-5 space-y-4">
                      <h4 className="text-[10px] font-bold text-white/50 uppercase font-mono tracking-widest">API Diagnostics</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span className="text-white/40 font-medium">Query Status:</span>
                          <span className="font-semibold text-emerald-400 font-mono">{result.status}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span className="text-white/40 font-medium">Processing Time:</span>
                          <span className="font-bold text-white/80 font-mono">{result.responseTime}ms</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span className="text-white/40 font-medium">Cache Safe:</span>
                          <span className="font-semibold text-sky-400 font-mono">{result.cached ? 'YES' : 'NO'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40 font-medium">API version:</span>
                          <span className="font-mono text-white/40">v2.0-stable</span>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  // RAW JSON Code View
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass rounded-xl p-4 font-mono text-[10px] text-sky-400 bg-slate-950 overflow-x-auto relative"
                  >
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                      className="absolute right-4 top-4 bg-slate-900 border border-white/10 hover:border-accent/40 px-2 py-1 rounded text-white/70 hover:text-white transition-all select-none"
                    >
                      Copy Payload
                    </button>
                    <pre className="select-text">{JSON.stringify(result, null, 2)}</pre>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Columns: Interactive Map Focused View */}
        <div className="glass rounded-xl p-5 flex flex-col space-y-4">
          <div>
            <h2 className="text-xs uppercase font-bold tracking-wider font-mono text-white/60">
              Interactive Map preview
            </h2>
            <p className="text-[10px] text-white/30 truncate">
              {result ? `Active Point: ${result.address}` : 'Input query to map coordinates'}
            </p>
          </div>
          <div className="flex-1 min-h-[350px]">
            <InteractiveMap
              lat={result ? result.lat : 40.7128}
              lon={result ? result.lon : -74.0060}
              address={result ? result.address : 'Times Square, New York, NY'}
            />
          </div>
        </div>

      </div>

    </div>
  );
};
