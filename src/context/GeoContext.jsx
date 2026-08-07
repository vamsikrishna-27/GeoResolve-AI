import React, { createContext, useContext, useState, useEffect } from 'react';
import { resolveAddressAPI } from '../services/geocodingService';

const GeoContext = createContext(null);

// Default mock history data for beautiful visualization
const DEFAULT_HISTORY = [
  {
    id: 'hist_1',
    address: 'Times Square, New York, NY 10036, USA',
    lat: 40.7580,
    lon: -73.9851,
    confidence: 0.99,
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    status: 'Success',
    responseTime: 340,
    cached: false
  },
  {
    id: 'hist_2',
    address: 'Eiffel Tower, Champ de Mars, Paris, France',
    lat: 48.8584,
    lon: 2.2945,
    confidence: 0.98,
    timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(), // 32 min ago
    status: 'Success',
    responseTime: 450,
    cached: false
  },
  {
    id: 'hist_3',
    address: 'Sydney Opera House, Sydney, NSW, Australia',
    lat: -33.8568,
    lon: 151.2153,
    confidence: 0.97,
    timestamp: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(), // 2.5 hours ago
    status: 'Cached',
    responseTime: 12,
    cached: true
  },
  {
    id: 'hist_4',
    address: 'Shibuya Crossing, Tokyo, Japan',
    lat: 35.6595,
    lon: 139.7005,
    confidence: 0.96,
    timestamp: new Date(Date.now() - 6.8 * 3600 * 1000).toISOString(), // 6.8 hours ago
    status: 'Success',
    responseTime: 512,
    cached: false
  },
  {
    id: 'hist_5',
    address: 'Big Ben, London, SW1A 0AA, UK',
    lat: 51.5007,
    lon: -0.1246,
    confidence: 0.98,
    timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(), // 14 hours ago
    status: 'Success',
    responseTime: 290,
    cached: false
  },
  {
    id: 'hist_6',
    address: 'Taj Mahal, Agra, Uttar Pradesh, India',
    lat: 27.1751,
    lon: 78.0421,
    confidence: 0.95,
    timestamp: new Date(Date.now() - 26 * 3600 * 1000).toISOString(), // 26 hours ago
    status: 'Cached',
    responseTime: 8,
    cached: true
  },
  {
    id: 'hist_7',
    address: 'Colosseum, Piazza del Colosseo, Rome, Italy',
    lat: 41.8902,
    lon: 12.4922,
    confidence: 0.97,
    timestamp: new Date(Date.now() - 40 * 3600 * 1000).toISOString(), // 40 hours ago
    status: 'Success',
    responseTime: 310,
    cached: false
  }
];

// Default mock API keys
const DEFAULT_API_KEYS = [
  {
    id: 'key_1',
    name: 'Production Server Key',
    token: 'gr_live_8f32c912e8a10bc330fe549298ccaa12',
    status: 'Active',
    usage: 14892,
    limit: 50000,
    expiry: '2027-12-31',
    createdDate: '2026-01-10'
  },
  {
    id: 'key_2',
    name: 'Staging Environment Key',
    token: 'gr_test_d3a8e10b14c3e8055621a221fbc34a81',
    status: 'Active',
    usage: 342,
    limit: 10000,
    expiry: 'Never',
    createdDate: '2026-03-24'
  },
  {
    id: 'key_3',
    name: 'Internal Hackathon Demo',
    token: 'gr_test_aa490cf12bd6509fca121087e5512bca',
    status: 'Revoked',
    usage: 9024,
    limit: 10000,
    expiry: '2026-07-01',
    createdDate: '2026-05-15'
  }
];

export const GeoProvider = ({ children }) => {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('georesolve_history');
    return saved ? JSON.parse(saved) : DEFAULT_HISTORY;
  });

  const [apiKeys, setApiKeys] = useState(() => {
    const saved = localStorage.getItem('georesolve_apikeys');
    return saved ? JSON.parse(saved) : DEFAULT_API_KEYS;
  });

  useEffect(() => {
    localStorage.setItem('georesolve_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('georesolve_apikeys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  // Aggregate metrics based on historical loads and baseline amounts
  const getMetrics = () => {
    const sessionSuccessCount = history.filter(h => h.status !== 'Failed').length;
    const sessionTotal = history.length;
    
    // Add baseline dashboard values to make the SaaS platform look mature
    const baselineTotal = 42879;
    const baselineSuccess = 42710;
    const baselineCacheHits = 14352;
    
    const sessionCacheHits = history.filter(h => h.cached).length;
    const totalRequests = baselineTotal + sessionTotal;
    const successfulRequests = baselineSuccess + sessionSuccessCount;
    const totalCacheHits = baselineCacheHits + sessionCacheHits;
    const cacheHitRate = parseFloat(((totalCacheHits / totalRequests) * 100).toFixed(1));

    // Average response time
    const sessionTimes = history.filter(h => !h.cached).map(h => h.responseTime);
    const avgSessionTime = sessionTimes.length > 0 ? sessionTimes.reduce((a,b) => a+b, 0) / sessionTimes.length : 320;
    const averageResponseTime = Math.round((avgSessionTime * 0.2) + (295 * 0.8)); // blended average response time

    return {
      totalRequests,
      successfulRequests,
      cacheHitRate,
      averageResponseTime
    };
  };

  const resolveAddress = async (address) => {
    const startTime = performance.now();
    try {
      // Simple cache check in active history to make cached requests instant
      const cachedRecord = history.find(h => h.address.toLowerCase() === address.toLowerCase().trim());
      if (cachedRecord) {
        const newRecord = {
          ...cachedRecord,
          id: `hist_${Date.now()}`,
          timestamp: new Date().toISOString(),
          status: 'Cached',
          responseTime: Math.round(performance.now() - startTime + 5),
          cached: true
        };
        setHistory(prev => [newRecord, ...prev]);
        return newRecord;
      }

      // Query service
      const data = await resolveAddressAPI(address);
      const responseTime = Math.round(performance.now() - startTime);

      const record = {
        id: `hist_${Date.now()}`,
        address: data.address,
        lat: data.lat,
        lon: data.lon,
        confidence: data.confidence,
        country: data.country,
        state: data.state,
        city: data.city,
        postcode: data.postcode,
        timestamp: new Date().toISOString(),
        status: 'Success',
        responseTime,
        cached: false
      };

      setHistory(prev => [record, ...prev]);
      
      // Update key usage (increment first active key)
      setApiKeys(keys => 
        keys.map(k => k.id === 'key_1' ? { ...k, usage: k.usage + 1 } : k)
      );

      return record;
    } catch (error) {
      const responseTime = Math.round(performance.now() - startTime);
      const failedRecord = {
        id: `hist_${Date.now()}`,
        address,
        lat: 0,
        lon: 0,
        confidence: 0,
        timestamp: new Date().toISOString(),
        status: 'Failed',
        responseTime,
        cached: false,
        error: error.message
      };
      setHistory(prev => [failedRecord, ...prev]);
      throw error;
    }
  };

  const generateApiKey = (name) => {
    const chars = 'abcdef0123456789';
    let tokenValue = 'gr_live_';
    for (let i = 0; i < 32; i++) {
      tokenValue += chars[Math.floor(Math.random() * chars.length)];
    }

    const newKey = {
      id: `key_${Date.now()}`,
      name: name || 'Unnamed API Key',
      token: tokenValue,
      status: 'Active',
      usage: 0,
      limit: 25000,
      expiry: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0], // 1 year expiry
      createdDate: new Date().toISOString().split('T')[0]
    };

    setApiKeys(prev => [newKey, ...prev]);
    return newKey;
  };

  const toggleKeyStatus = (id) => {
    setApiKeys(prev => 
      prev.map(k => k.id === id ? { ...k, status: k.status === 'Active' ? 'Revoked' : 'Active' } : k)
    );
  };

  const deleteApiKey = (id) => {
    setApiKeys(prev => prev.filter(k => k.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <GeoContext.Provider value={{
      history,
      apiKeys,
      metrics: getMetrics(),
      resolveAddress,
      generateApiKey,
      toggleKeyStatus,
      deleteApiKey,
      clearHistory
    }}>
      {children}
    </GeoContext.Provider>
  );
};

export const useGeo = () => {
  const context = useContext(GeoContext);
  if (!context) {
    throw new Error('useGeo must be used within a GeoProvider');
  }
  return context;
};
