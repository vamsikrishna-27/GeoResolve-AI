import React, { useState } from 'react';
import { useGeo } from '../context/GeoContext';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Trash2, 
  Copy, 
  RefreshCw, 
  FileSpreadsheet, 
  ExternalLink,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';
import { motion } from 'framer-motion';

export const History = () => {
  const { history, clearHistory, resolveAddress } = useGeo();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // All | Success | Cached | Failed
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter history records based on search term and status category
  const filteredHistory = history.filter(item => {
    const matchesSearch = item.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate pagination boundaries
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage) || 1;
  const paginatedItems = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert(`Copied: ${text}`);
  };

  const handleReTrigger = async (address) => {
    // Reroute to resolve page and run geocoder
    navigate('/resolve');
    // Set immediate search in session if preferred
    setTimeout(() => {
      const searchInput = document.querySelector('input[placeholder*="Enter address"]');
      if (searchInput) {
        searchInput.value = address;
        // Trigger submit
        const form = searchInput.closest('form');
        if (form) {
          const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
          form.dispatchEvent(submitEvent);
        }
      }
    }, 100);
  };

  const exportCSV = () => {
    // Generate simple CSV payload for developer audit export
    const headers = ['ID', 'Address', 'Latitude', 'Longitude', 'Confidence', 'Timestamp', 'Status', 'Latency(ms)'];
    const rows = history.map(item => [
      item.id,
      `"${item.address.replace(/"/g, '""')}"`,
      item.lat,
      item.lon,
      item.confidence,
      item.timestamp,
      item.status,
      item.responseTime
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'georesolve_audit_logs.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>Audit Logs & History</span>
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Browse, inspect, and export geocoding telemetry queries recorded across the environment.
          </p>
        </div>
        
        {/* Actions bar */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={exportCSV}
            disabled={history.length === 0}
            className="px-3 py-1.5 rounded-lg border border-white/5 bg-slate-900 text-xs font-semibold text-white/70 hover:text-white hover:border-white/10 transition-colors flex items-center space-x-1.5 select-none disabled:opacity-40"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          
          <button
            onClick={() => {
              if (window.confirm('Clear geocoding logs history? This action cannot be undone.')) {
                clearHistory();
              }
            }}
            disabled={history.length === 0}
            className="px-3 py-1.5 rounded-lg border border-red-500/10 bg-red-500/5 text-xs font-semibold text-red-400 hover:bg-red-500/15 hover:border-red-500/20 transition-all flex items-center space-x-1.5 select-none disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* Main Table Ledger container */}
      <div className="glass rounded-xl p-5 md:p-6 space-y-4">
        
        {/* Filters and Search toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 select-none">
          
          {/* Search bar */}
          <div className="relative max-w-sm w-full">
            <input
              type="text"
              placeholder="Search audit targets..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950/60 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-accent/40 transition-all font-medium"
            />
            <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-2.5" />
          </div>

          {/* Status filtering row */}
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-white/5 p-0.5 rounded-lg overflow-x-auto">
            {['All', 'Success', 'Cached', 'Failed'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded text-[10px] font-semibold transition-colors ${
                  statusFilter === status 
                    ? 'bg-slate-900 border border-white/5 text-accent shadow-sm' 
                    : 'text-white/40 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Data table */}
        <div className="overflow-x-auto select-text">
          {paginatedItems.length === 0 ? (
            <div className="py-16 text-center text-xs text-white/30 flex flex-col items-center justify-center space-y-2.5">
              <Database className="w-8 h-8 opacity-25" />
              <span>No telemetry match found. Clear filters or query addresses first.</span>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-mono uppercase text-white/40 font-bold">
                  <th className="pb-3 pr-4">Resolved Target Address</th>
                  <th className="pb-3 pr-4">Spatial Coordinates</th>
                  <th className="pb-3 pr-4">Timestamp</th>
                  <th className="pb-3 pr-4">Match Index</th>
                  <th className="pb-3 pr-4">Latency</th>
                  <th className="pb-3 pr-4">State</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans text-white/80">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group">
                    
                    {/* Address Display */}
                    <td className="py-3.5 pr-4 max-w-[280px] truncate">
                      <div className="font-semibold text-white truncate" title={item.address}>
                        {item.address}
                      </div>
                      {item.raw_address && item.raw_address.toLowerCase().trim() !== item.address.toLowerCase().trim() && (
                        <div className="text-[10px] text-white/40 mt-0.5 truncate" title={item.raw_address}>
                          Original: {item.raw_address}
                        </div>
                      )}
                    </td>
                    
                    {/* Coordinates Copy */}
                    <td className="py-3.5 pr-4 font-mono text-[10px] text-white/50">
                      {item.lat !== 0 || item.lon !== 0 ? (
                        <button 
                          onClick={() => copyToClipboard(`${item.lat.toFixed(6)}, ${item.lon.toFixed(6)}`)}
                          className="flex items-center space-x-1.5 hover:text-accent select-none"
                          title="Copy Coordinates"
                        >
                          <span>{item.lat.toFixed(5)}, {item.lon.toFixed(5)}</span>
                          <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ) : (
                        <span className="text-white/20">N/A</span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 pr-4 text-white/40 font-mono text-[10px]">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>

                    {/* Confidence score */}
                    <td className="py-3.5 pr-4">
                      {item.confidence > 0 ? (
                        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          item.confidence >= 0.9 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {(item.confidence * 100).toFixed(0)}% accuracy
                        </span>
                      ) : (
                        <span className="text-white/20 font-mono">-</span>
                      )}
                    </td>

                    {/* Latency Response time */}
                    <td className="py-3.5 pr-4 font-mono text-white/50 text-[10px]">
                      {item.responseTime}ms
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 pr-4">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        item.status === 'Cached' 
                          ? 'bg-sky-500/10 text-sky-400' 
                          : item.status === 'Success' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    {/* Actions Trigger */}
                    <td className="py-3.5 text-right select-none">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleReTrigger(item.address)}
                          className="p-1 rounded bg-slate-900 border border-white/5 text-white/40 hover:text-accent hover:border-accent/20 transition-all"
                          title="Re-geocode location"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/5 pt-4 select-none">
            <span className="text-[10px] font-mono text-white/35">
              Showing page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-white/5 bg-slate-950 text-white/40 hover:text-white disabled:opacity-30 disabled:hover:text-white/40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-white/5 bg-slate-950 text-white/40 hover:text-white disabled:opacity-30 disabled:hover:text-white/40 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
