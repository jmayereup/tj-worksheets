import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface TextSizeControlProps {
  textSizeLevel: number;
  onDecrease: () => void;
  onIncrease: () => void;
  minLevel?: number;
  maxLevel?: number;
  className?: string;
}

const LEVEL_LABELS: Record<number, string> = {
  0: 'S',
  1: 'M',
  2: 'L',
  3: 'XL',
};

export const TextSizeControl: React.FC<TextSizeControlProps> = ({
  textSizeLevel,
  onDecrease,
  onIncrease,
  minLevel = 0,
  maxLevel = 3,
  className = "",
}) => {
  const canDecrease = textSizeLevel > minLevel;
  const canIncrease = textSizeLevel < maxLevel;

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden text-gray-700 ${className}`}
      title="Adjust text size"
    >
      <button
        type="button"
        onClick={onDecrease}
        disabled={!canDecrease}
        className="flex items-center px-2 py-1.5 text-xs font-black text-gray-700 hover:bg-green-50 hover:text-green-700 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-400 disabled:cursor-not-allowed transition-all"
        title="Smaller text (A-)"
        aria-label="Decrease text size"
      >
        <Minus className="w-3 h-3" />
      </button>

      <div className="h-4 w-px bg-gray-200" />

      <span className="px-1.5 text-[11px] font-bold text-gray-400 select-none tracking-tight min-w-[20px] text-center">
        {LEVEL_LABELS[textSizeLevel] || 'M'}
      </span>

      <div className="h-4 w-px bg-gray-200" />

      <button
        type="button"
        onClick={onIncrease}
        disabled={!canIncrease}
        className="flex items-center px-2 py-1.5 text-xs font-black text-gray-700 hover:bg-green-50 hover:text-green-700 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-400 disabled:cursor-not-allowed transition-all"
        title="Larger text (A+)"
        aria-label="Increase text size"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
};
