import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: readonly string[] | string[];
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  required?: boolean;
  formatOption?: (opt: string) => string;
  renderRightBadge?: (opt: string) => React.ReactNode;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  icon,
  required = false,
  formatOption,
  renderRightBadge,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
  };

  const displayLabel = value ? (formatOption ? formatOption(value) : value) : placeholder;

  return (
    <div className="relative" ref={containerRef}>
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required={required}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      <div
        className={`flex items-center justify-between cursor-pointer select-none transition-colors ${className} ${
          !value ? 'text-gray-400' : 'text-gray-900 font-medium'
        }`}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          } else if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
            {icon}
          </div>
        )}

        <span className="truncate text-sm">{displayLabel}</span>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {value && renderRightBadge && renderRightBadge(value)}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
          role="listbox"
        >
          {options.map((opt) => {
            const isSelected = value === opt;
            const label = formatOption ? formatOption(opt) : opt;
            return (
              <div
                key={opt}
                className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-green-50 text-green-700 font-bold'
                    : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
                }`}
                onClick={() => handleSelect(opt)}
                role="option"
                aria-selected={isSelected}
              >
                <span>{label}</span>
                {renderRightBadge && renderRightBadge(opt)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
