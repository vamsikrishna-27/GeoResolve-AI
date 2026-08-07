import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const InteractiveChart = ({ data = [], type = 'area', height = 200 }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [width, setWidth] = useState(600);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.clientWidth);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!data || data.length === 0) return null;

  // Max value for scaling
  const values = data.map(item => item.value);
  const maxValue = Math.max(...values, 100);
  const minValue = Math.min(...values, 0);
  const valueRange = maxValue - minValue;

  const handleMouseMove = (e, index) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTooltipPos({ x, y });
    setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // Rendering Dimensions
  const paddingX = 40;
  const paddingY = 20;

  return (
    <div ref={containerRef} className="relative w-full h-full select-none" style={{ height }}>
      {/* SVG Canvas */}
      <svg className="w-full h-full overflow-visible">
        <defs>
          {/* Neon Blue Line Gradient */}
          <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
          </linearGradient>
          {/* Fill Gradient under Area Chart */}
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(37, 99, 235, 0.25)" />
            <stop offset="100%" stopColor="rgba(37, 99, 235, 0.0)" />
          </linearGradient>
        </defs>

        {/* Dynamic Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = paddingY + (1 - ratio) * (height - 2 * paddingY);
          return (
            <g key={i}>
              <line 
                x1={paddingX} 
                y1={y} 
                x2={`calc(100% - ${paddingX}px)`} 
                y2={y} 
                stroke="rgba(255, 255, 255, 0.04)" 
                strokeDasharray="4 4" 
              />
              <text 
                x={paddingX - 10} 
                y={y + 4} 
                fill="rgba(203, 213, 225, 0.3)" 
                fontSize="9" 
                textAnchor="end"
                fontFamily="monospace"
              >
                {Math.round(minValue + ratio * valueRange)}
              </text>
            </g>
          );
        })}

        {/* Chart Drawing Area */}
        <RenderSVGData 
          data={data} 
          type={type} 
          height={height} 
          width={width}
          paddingX={paddingX} 
          paddingY={paddingY} 
          maxValue={maxValue} 
          minValue={minValue}
          valueRange={valueRange}
        />
      </svg>

      {/* Invisible Interactive Columns for Mouse Tracking */}
      <div className="absolute inset-0 flex" style={{ paddingLeft: paddingX, paddingRight: paddingX, paddingTop: paddingY, paddingBottom: paddingY }}>
        {data.map((item, idx) => (
          <div
            key={idx}
            className="flex-1 h-full cursor-crosshair relative"
            onMouseMove={(e) => handleMouseMove(e, idx)}
            onMouseLeave={handleMouseLeave}
          />
        ))}
      </div>

      {/* Modern Interactive Tooltip */}
      <AnimatePresence>
        {hoveredIndex !== null && data[hoveredIndex] && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 pointer-events-none p-3 rounded-lg border border-white/10 glass shadow-xl text-xs flex flex-col font-sans min-w-[120px] bg-slate-900/90"
            style={{ 
              left: Math.min(tooltipPos.x + 10, window.innerWidth - 150), 
              top: tooltipPos.y - 65 
            }}
          >
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold font-mono">
              {data[hoveredIndex].label}
            </span>
            <span className="text-sm font-bold text-accent mt-0.5">
              {data[hoveredIndex].value.toLocaleString()} Queries
            </span>
            {data[hoveredIndex].extra && (
              <span className="text-[9px] text-emerald-400 mt-1 flex items-center">
                ● {data[hoveredIndex].extra}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Internal Sub-component to compute paths and render shapes
const RenderSVGData = ({ data, type, height, width, paddingX, paddingY, maxValue, minValue, valueRange }) => {
  const drawableWidth = width - 2 * paddingX;
  const drawableHeight = height - 2 * paddingY;

  if (drawableWidth <= 0) return null;

  // Calculate coordinates for every point
  const points = data.map((item, idx) => {
    const x = paddingX + (idx / (data.length - 1)) * drawableWidth;
    const normVal = valueRange > 0 ? (item.value - minValue) / valueRange : 0.5;
    const y = paddingY + (1 - normVal) * drawableHeight;
    return { x, y, label: item.label, value: item.value };
  });

  // Calculate SVG Line / Area Paths
  let pathD = '';
  let fillD = '';

  if (points.length > 0) {
    // 1. Build standard line path
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    // 2. Build closed area fill path
    fillD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;
  }

  return (
    <g>
      {/* 1. Render Area (under-fill) */}
      {type === 'area' && (
        <motion.path
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          d={fillD}
          fill="url(#chartFill)"
        />
      )}

      {/* 2. Render Line */}
      {(type === 'line' || type === 'area') && (
        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          d={pathD}
          fill="none"
          stroke="url(#chartGlow)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* 3. Render Bars */}
      {type === 'bar' && (
        <g>
          {points.map((pt, idx) => {
            const barWidth = Math.max(4, Math.min(24, drawableWidth / (data.length * 2.2)));
            const barHeight = height - paddingY - pt.y;
            return (
              <motion.rect
                key={idx}
                initial={{ height: 0, y: height - paddingY }}
                animate={{ height: barHeight, y: pt.y }}
                transition={{ duration: 0.5, delay: idx * 0.04, ease: "easeOut" }}
                x={pt.x - barWidth / 2}
                y={pt.y}
                width={barWidth}
                height={barHeight}
                rx={Math.min(3, barWidth / 2)}
                fill="url(#chartGlow)"
                className="hover:fill-sky-400 transition-colors duration-200"
              />
            );
          })}
        </g>
      )}

      {/* 4. Render interactive nodes */}
      {(type === 'line' || type === 'area') && points.map((pt, idx) => (
        <g key={idx}>
          <circle 
            cx={pt.x} 
            cy={pt.y} 
            r="3" 
            fill="#020617" 
            stroke="#38bdf8" 
            strokeWidth="1.5" 
          />
        </g>
      ))}

      {/* 5. Render X Labels at bottom */}
      {points.map((pt, idx) => {
        // Show labels strategically to avoid overlapping on small widths
        const modulo = points.length > 10 ? 2 : 1;
        if (idx % modulo !== 0) return null;

        return (
          <text
            key={idx}
            x={pt.x}
            y={height - 4}
            fill="rgba(203, 213, 225, 0.4)"
            fontSize="9"
            textAnchor="middle"
            fontFamily="sans-serif"
          >
            {pt.label}
          </text>
        );
      })}
    </g>
  );
};
