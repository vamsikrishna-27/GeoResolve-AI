import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export const InteractiveMap = ({ lat = 40.7128, lon = -74.0060, zoomLevel = 1, address = 'New York, USA' }) => {
  const canvasRef = useRef(null);

  // Simple Mercator-like projection to map Lat/Lon to Canvas coordinate space
  const projectCoordinates = (latitude, longitude, width, height) => {
    // Center of map is (width/2, height/2)
    // Longitude maps linearly from -180 to 180 to 0 to width
    const x = ((longitude + 180) * (width / 360));
    // Latitude maps from 90 to -90 to 0 to height
    const y = (((90 - latitude) * (height / 180)));
    return { x, y };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let pulseRadius = 0;
    let angle = 0;

    // Responsive sizing
    const resizeCanvas = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // List of major world coordinates to draw as passive glowing network nodes
    const worldNodes = [
      { lat: 40.7128, lon: -74.0060, label: 'NYC' },      // NYC
      { lat: 37.7749, lon: -122.4194, label: 'SFO' },     // SFO
      { lat: 51.5074, lon: -0.1278, label: 'LDN' },       // London
      { lat: 48.8566, lon: 2.3522, label: 'PAR' },        // Paris
      { lat: 35.6762, lon: 139.6503, label: 'TYO' },      // Tokyo
      { lat: -33.8688, lon: 151.2093, label: 'SYD' },     // Sydney
      { lat: 12.9716, lon: 77.5946, label: 'BLR' },       // Bangalore
      { lat: -23.5505, lon: -46.6333, label: 'SP' },      // Sao Paulo
      { lat: 30.0444, lon: 31.2357, label: 'CAI' },       // Cairo
      { lat: -26.2041, lon: 28.0473, label: 'JNB' }       // Johannesburg
    ];

    const draw = () => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      
      ctx.clearRect(0, 0, width, height);

      // 1. Dark Futuristic Grid Background
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 25;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw crosshairs at center
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.beginPath();
      ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height);
      ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2);
      ctx.stroke();

      // 2. Draw Network Connection Lines to Active Query Point
      const targetPos = projectCoordinates(lat, lon, width, height);

      // Draw global network connections
      ctx.lineWidth = 0.5;
      worldNodes.forEach((node) => {
        const nodePos = projectCoordinates(node.lat, node.lon, width, height);
        
        // Network line
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
        ctx.moveTo(nodePos.x, nodePos.y);
        ctx.lineTo(targetPos.x, targetPos.y);
        ctx.stroke();

        // Node dot
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.beginPath();
        ctx.arc(nodePos.x, nodePos.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Draw Sonar Scan Arc (Rotates dynamically)
      angle += 0.005;
      ctx.fillStyle = 'rgba(37, 99, 235, 0.015)';
      ctx.beginPath();
      ctx.moveTo(width / 2, height / 2);
      ctx.arc(width / 2, height / 2, Math.max(width, height), angle, angle + Math.PI / 4);
      ctx.lineTo(width / 2, height / 2);
      ctx.fill();

      // 4. Draw Active Target Glowing pulse
      pulseRadius = (pulseRadius + 0.5) % 35;
      
      // Outer pulse ring
      ctx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0, (35 - pulseRadius) / 35) * 0.4})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(targetPos.x, targetPos.y, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Target pointer dot
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(targetPos.x, targetPos.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Drop shadow glow effect on target pointer
      ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.beginPath();
      ctx.arc(targetPos.x, targetPos.y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Dynamic bounding box brackets for the active target
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1;
      const bracSize = 10;
      const off = 8;
      
      // Top-Left bracket
      ctx.beginPath();
      ctx.moveTo(targetPos.x - off, targetPos.y - off + bracSize);
      ctx.lineTo(targetPos.x - off, targetPos.y - off);
      ctx.lineTo(targetPos.x - off + bracSize, targetPos.y - off);
      ctx.stroke();

      // Top-Right bracket
      ctx.beginPath();
      ctx.moveTo(targetPos.x + off - bracSize, targetPos.y - off);
      ctx.lineTo(targetPos.x + off, targetPos.y - off);
      ctx.lineTo(targetPos.x + off, targetPos.y - off + bracSize);
      ctx.stroke();

      // Bottom-Left bracket
      ctx.beginPath();
      ctx.moveTo(targetPos.x - off, targetPos.y + off - bracSize);
      ctx.lineTo(targetPos.x - off, targetPos.y + off);
      ctx.lineTo(targetPos.x - off + bracSize, targetPos.y + off);
      ctx.stroke();

      // Bottom-Right bracket
      ctx.beginPath();
      ctx.moveTo(targetPos.x + off - bracSize, targetPos.y + off);
      ctx.lineTo(targetPos.x + off, targetPos.y + off);
      ctx.lineTo(targetPos.x + off, targetPos.y + off - bracSize);
      ctx.stroke();

      // Text metadata coordinates in map space
      ctx.fillStyle = '#f8fafc';
      ctx.font = '9px monospace';
      ctx.fillText(`LAT: ${lat.toFixed(4)}°`, targetPos.x + 14, targetPos.y - 4);
      ctx.fillText(`LON: ${lon.toFixed(4)}°`, targetPos.x + 14, targetPos.y + 6);

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [lat, lon]);

  return (
    <div className="relative w-full h-full min-h-[300px] bg-[#020617] border border-white/5 rounded-xl overflow-hidden glass">
      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* Futuristic Telemetry HUD */}
      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/5 px-2.5 py-1 rounded text-[10px] font-mono text-accent flex items-center space-x-2 select-none">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>LOCATION ACQUIRED</span>
      </div>

      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md border border-white/5 p-2 rounded text-[10px] font-mono text-white/70 max-w-[200px] select-none">
        <div className="text-accent font-semibold truncate mb-0.5">{address}</div>
        <div className="text-[9px] text-white/40">
          X-COORD: {((lon + 180) * 10).toFixed(0)}m / Y-COORD: {((90 - lat) * 10).toFixed(0)}m
        </div>
      </div>

      <div className="absolute right-3 top-3 bg-black/60 backdrop-blur-md border border-white/5 px-2 py-1 rounded text-[9px] font-mono text-white/50 select-none">
        GRID: 2.5KM / SCANNER
      </div>
      
      {/* Compass rose */}
      <div className="absolute right-3 bottom-3 w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[9px] font-mono text-white/40 select-none bg-black/30 backdrop-blur-sm">
        N
        <div className="absolute inset-0.5 rounded-full border-t border-accent border-r border-transparent animate-spin" style={{ animationDuration: '4s' }} />
      </div>
    </div>
  );
};
