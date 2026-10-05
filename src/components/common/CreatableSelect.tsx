import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check, Edit3, List } from 'lucide-react';

interface CreatableSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const CreatableSelect: React.FC<CreatableSelectProps> = ({
  label,
  value,
  onChange,
  options: initialOptions,
  placeholder = 'Select or type custom...',
  className = '',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customInputValue, setCustomInputValue] = useState('');
  const [options, setOptions] = useState<string[]>(initialOptions);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize options if initialOptions changes
  useEffect(() => {
    const combined = Array.from(new Set([...initialOptions, ...(value ? [value] : [])]));
    setOptions(combined);
  }, [initialOptions, value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOption = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
    setIsCustomMode(false);
  };

  const handleAddCustom = () => {
    if (customInputValue.trim()) {
      const val = customInputValue.trim();
      if (!options.includes(val)) {
        setOptions((prev) => [...prev, val]);
      }
      onChange(val);
      setCustomInputValue('');
      setIsCustomMode(false);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustom();
    } else if (e.key === 'Escape') {
      setIsCustomMode(false);
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          <button
            type="button"
            onClick={() => {
              setIsCustomMode(!isCustomMode);
              if (!isCustomMode) {
                setCustomInputValue(value || '');
                setTimeout(() => inputRef.current?.focus(), 50);
              }
            }}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            {isCustomMode ? (
              <>
                <List className="w-3 h-3" /> Pick from list
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" /> Type & Add
              </>
            )}
          </button>
        </div>
      )}

      {isCustomMode ? (
        /* Custom Input Mode */
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={customInputValue}
              onChange={(e) => setCustomInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type custom option and press Enter..."
              className="w-full text-sm rounded-lg border border-indigo-400 dark:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-16"
            />
            <button
              type="button"
              onClick={handleAddCustom}
              disabled={!customInputValue.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-md transition-colors"
            >
              Add
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsCustomMode(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg"
            title="Cancel custom input"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Dropdown Mode with integrated "+ Type & Add" */
        <div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between text-left text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors shadow-2xs"
          >
            <span className="truncate">{value || <span className="text-slate-400">{placeholder}</span>}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                {options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors ${
                      value === opt
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <span>{opt}</span>
                    {value === opt && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                ))}
              </div>

              {/* Add Custom Footer */}
              <div className="p-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(true);
                    setIsOpen(false);
                    setCustomInputValue('');
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors border border-dashed border-indigo-200 dark:border-indigo-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Type & Add Custom Option...</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
