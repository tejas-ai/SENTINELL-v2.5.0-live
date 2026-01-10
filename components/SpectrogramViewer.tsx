import React, { useState, useRef, MouseEvent } from 'react';
import { IconGrid, IconContrast, IconZoom, IconFire } from '../constants';

interface SpectrogramViewerProps {
  imageUrl: string;
}

type FilterType = 'normal' | 'high-contrast' | 'heatmap' | 'invert';

const ForensicImageViewer: React.FC<SpectrogramViewerProps> = ({ imageUrl }) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('normal');
  const [showGrid, setShowGrid] = useState(true);
  const [isZoomActive, setIsZoomActive] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter Definitions
  const filters: Record<FilterType, string> = {
    'normal': 'none',
    'high-contrast': 'contrast(200%) brightness(120%) grayscale(100%)', // Useful for ELA simulation
    'heatmap': 'contrast(150%) hue-rotate(180deg) saturate(300%)', // Useful for spotting color inconsistencies
    'invert': 'invert(100%)'
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;

    // Constrain inside
    if (x >= 0 && x <= width && y >= 0 && y <= height) {
      setCursorPos({ x, y });
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
        <div className="flex gap-1">
          <button 
            onClick={() => setActiveFilter('normal')}
            className={`p-2 rounded hover:bg-slate-700 transition-colors ${activeFilter === 'normal' ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-900' : 'text-slate-400'}`}
            title="Normal View"
          >
            <span className="text-xs font-bold">RAW</span>
          </button>
          <button 
            onClick={() => setActiveFilter('high-contrast')}
            className={`p-2 rounded hover:bg-slate-700 transition-colors ${activeFilter === 'high-contrast' ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-900' : 'text-slate-400'}`}
            title="High Contrast (Edge Detection)"
          >
            <IconContrast />
          </button>
           <button 
            onClick={() => setActiveFilter('heatmap')}
            className={`p-2 rounded hover:bg-slate-700 transition-colors ${activeFilter === 'heatmap' ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-900' : 'text-slate-400'}`}
            title="Heatmap"
          >
            <IconFire />
          </button>
        </div>

        <div className="flex gap-1">
          <button 
            onClick={() => setIsZoomActive(!isZoomActive)}
            className={`p-2 rounded hover:bg-slate-700 transition-colors ${isZoomActive ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-900' : 'text-slate-400'}`}
            title="Toggle Magnifying Lens"
          >
            <IconZoom />
          </button>
          <button 
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded hover:bg-slate-700 transition-colors ${showGrid ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-900' : 'text-slate-400'}`}
            title="Toggle Grid"
          >
            <IconGrid />
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div 
        ref={containerRef}
        className="relative w-full rounded-lg overflow-hidden border border-slate-700 shadow-xl bg-black group cursor-crosshair select-none"
        onMouseEnter={() => {}}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {}}
      >
        {/* Main Image */}
        <img 
          src={imageUrl} 
          alt="Evidence" 
          className="w-full h-auto block"
          style={{ filter: filters[activeFilter] }}
        />

        {/* Grid Overlay */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none opacity-30" 
            style={{ 
               backgroundImage: `linear-gradient(to right, #22d3ee 1px, transparent 1px), linear-gradient(to bottom, #22d3ee 1px, transparent 1px)`,
               backgroundSize: '40px 40px'
            }}
          >
             {/* Reticle Center */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-cyan-500/50"></div>
          </div>
        )}

        {/* Magnifying Loupe */}
        {isZoomActive && (
          <div 
            className="absolute w-32 h-32 rounded-full border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)] overflow-hidden pointer-events-none z-20"
            style={{
              top: cursorPos.y - 64, // Center the 128px circle
              left: cursorPos.x - 64,
              backgroundImage: `url(${imageUrl})`,
              backgroundRepeat: 'no-repeat',
              // Calculate zoom position. Assuming 2x zoom for the lens.
              backgroundPosition: `-${cursorPos.x * 2 - 64}px -${cursorPos.y * 2 - 64}px`,
              backgroundSize: `${(containerRef.current?.offsetWidth || 0) * 2}px auto`,
              filter: filters[activeFilter]
            }}
          >
            {/* Crosshair inside lens */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-red-500/50 rounded-full"></div>
          </div>
        )}
        
        {/* Coordinates Overlay */}
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-cyan-500 border border-cyan-900/50 pointer-events-none">
             X: {Math.round(cursorPos.x)} | Y: {Math.round(cursorPos.y)}
        </div>
      </div>
    </div>
  );
};

export default ForensicImageViewer;
