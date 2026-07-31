import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

interface CollapsibleActivityProps {
  isCompleted: boolean;
  title: string;
  children: React.ReactNode;
  score?: string;
  isPerfectScore?: boolean;
}

const playFanfare = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'square';
    // Success fanfare: C5 -> E5 -> G5 -> C6
    const startTime = ctx.currentTime;
    osc.frequency.setValueAtTime(523.25, startTime); // C5
    osc.frequency.setValueAtTime(659.25, startTime + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, startTime + 0.2); // G5
    osc.frequency.setValueAtTime(1046.50, startTime + 0.3); // C6
    
    gain.gain.setValueAtTime(0.15, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);
    
    osc.start(startTime);
    osc.stop(startTime + 0.6);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
};

export const CollapsibleActivity: React.FC<CollapsibleActivityProps> = ({
  isCompleted,
  title,
  children,
  score,
  isPerfectScore = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastHeightRef = useRef<number>(0);
  const isAdjustingRef = useRef<boolean>(false);
  const hasPlayedFanfare = useRef(isCompleted && isPerfectScore);

  useEffect(() => {
    if (!isCompleted) {
      setIsCollapsed(false);
      hasPlayedFanfare.current = false;
      return;
    }

    if (isCompleted && isPerfectScore && !hasPlayedFanfare.current) {
      hasPlayedFanfare.current = true;
      playFanfare();
    }

    // Keep collapse box open on completion
    setIsCollapsed(false);
  }, [isCompleted, isPerfectScore]);

  // Handle scroll compensation to prevent "jerking" when height changes above viewport
  React.useLayoutEffect(() => {
    if (lastHeightRef.current && containerRef.current && isAdjustingRef.current) {
      const newHeight = containerRef.current.offsetHeight;
      const delta = lastHeightRef.current - newHeight;
      const rect = containerRef.current.getBoundingClientRect();
      
      // We only care if the element's top is above or near the top of the viewport
      if (delta !== 0 && rect.top < 100) {
        // Use requestAnimationFrame to ensure the scroll happens after layout but before paint
        requestAnimationFrame(() => {
          window.scrollBy({
            top: -delta,
            behavior: 'instant'
          } as ScrollToOptions);
        });
      }
      
      lastHeightRef.current = 0;
      isAdjustingRef.current = false;
    }
  }, [isCollapsed]);

  const handleToggle = (collapsed: boolean) => {
    if (containerRef.current) {
      lastHeightRef.current = containerRef.current.offsetHeight;
      isAdjustingRef.current = true;
    }
    setIsCollapsed(collapsed);
  };

  if (!isCollapsed) {
    return (
      <div 
        ref={containerRef} 
        className="mb-2 animate-fade-in group relative"
        style={{ overflowAnchor: isAdjustingRef.current ? 'none' : 'auto' }}
      >
        <button 
          className="w-full justify-end px-0 py-1 mb-1 rounded-md text-[10px] font-bold text-gray-400 uppercase tracking-tighter hover:text-green-600 transition-colors flex items-center gap-1"
          onClick={() => handleToggle(true)}
        >
          <span>Collapse</span>
          <ChevronUp className="w-3 h-3" />
        </button>
        {children}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="bg-white p-3 mb-2 md:p-4 rounded-xl border border-green-50 shadow-sm flex items-center justify-between animate-fade-in group cursor-pointer hover:bg-green-50 transition-colors"
      onClick={() => handleToggle(false)}
      style={{ overflowAnchor: isAdjustingRef.current ? 'none' : 'auto' }}
    >
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isCompleted ? 'bg-green-100' : 'bg-gray-100'}`}>
          <CheckCircle2 className={`w-5 h-5 ${isCompleted ? 'text-green-600' : 'text-gray-300'}`} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm md:text-base">{title}</h3>
          <p className="text-[10px] md:text-xs text-gray-500 font-medium">
            {isCompleted ? `Activity completed ${score ? `• Score: ${score}` : ''}` : 'Activity in progress'}
          </p>
        </div>
      </div>
      
      <button className="p-2 text-gray-400 group-hover:text-green-600 transition-colors">
        <div className="flex items-center gap-1 text-xs md:text-sm font-bold uppercase tracking-tighter">
          <span>Expand</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>
    </div>
  );
};
