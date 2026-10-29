import React, { useState, useRef, useEffect } from 'react';
import { Layout, ChevronDown } from 'lucide-react';
import { LESSON_TYPE_OPTIONS, formatLessonType } from '../../../types';
import { isExternalWebComponent } from '../../../utils/componentMapper';

interface LessonTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export const LessonTypeSelect: React.FC<LessonTypeSelectProps> = ({
  value,
  onChange,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
  };

  const isSelectedWC = isExternalWebComponent(value);

  return (
    <div className="relative" ref={containerRef}>
      {/* Hidden input to support required HTML form validation */}
      <input
        type="text"
        value={value}
        onChange={() => {}}
        required={required}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Select trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white outline-none hover:border-gray-300 transition-colors text-left flex items-center justify-between cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Layout className="h-4 w-4 text-gray-400" />
        </div>

        <span className={`truncate text-sm ${value ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {value ? formatLessonType(value) : 'Select lesson type...'}
        </span>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {isSelectedWC && (
            <span className="text-xs font-medium text-gray-400 select-none">WC</span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto custom-scrollbar"
          role="listbox"
        >
          {value && !LESSON_TYPE_OPTIONS.includes(value as any) && (
            <div
              onClick={() => handleSelect(value)}
              className="flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer bg-green-50 text-green-700 font-bold"
              role="option"
              aria-selected={true}
            >
              <span>{formatLessonType(value)}</span>
              {isSelectedWC && (
                <span className="text-xs font-medium text-gray-400 select-none">WC</span>
              )}
            </div>
          )}

          {LESSON_TYPE_OPTIONS.map((opt) => {
            const isSelected = value === opt;
            const isWC = isExternalWebComponent(opt);
            return (
              <div
                key={opt}
                onClick={() => handleSelect(opt)}
                className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-green-50 text-green-700 font-bold'
                    : 'text-gray-700 hover:bg-green-50/50 hover:text-green-700'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <span>{formatLessonType(opt)}</span>
                {isWC && (
                  <span className="text-xs font-medium text-gray-400 select-none">WC</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
