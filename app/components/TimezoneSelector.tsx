'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  TIMEZONE_OPTIONS, 
  getGroupedTimezones, 
  detectBrowserTimezone, 
  getTimezoneOffset,
  getCurrentTimeInTimezone 
} from '../lib/timezone';

interface TimezoneSelectorProps {
  value: string;
  onChange: (timezone: string) => void;
  showCurrentTime?: boolean;
  showDetectButton?: boolean;
  label?: string;
  className?: string;
}

export default function TimezoneSelector({
  value,
  onChange,
  showCurrentTime = true,
  showDetectButton = true,
  label = 'Timezone',
  className = '',
}: TimezoneSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update current time display every minute
  useEffect(() => {
    if (showCurrentTime && value) {
      const updateTime = () => {
        setCurrentTime(getCurrentTimeInTimezone(value));
      };
      updateTime();
      const interval = setInterval(updateTime, 60000);
      return () => clearInterval(interval);
    }
  }, [value, showCurrentTime]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDetect = () => {
    const detected = detectBrowserTimezone();
    onChange(detected);
  };

  const filteredTimezones = search
    ? TIMEZONE_OPTIONS.filter(
        tz =>
          tz.label.toLowerCase().includes(search.toLowerCase()) ||
          tz.value.toLowerCase().includes(search.toLowerCase())
      )
    : TIMEZONE_OPTIONS;

  const groupedTimezones = getGroupedTimezones();

  const selectedOption = TIMEZONE_OPTIONS.find(tz => tz.value === value);
  const offset = getTimezoneOffset(value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label 
          className="block text-sm mb-2" 
          style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}
        >
          {label}
        </label>
      )}
      
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 px-4 py-3 rounded-xl text-left flex items-center justify-between focus:outline-none transition-all"
          style={{ 
            fontFamily: 'Inter', 
            fontWeight: 500,
            background: 'rgba(255, 255, 255, 0.5)',
            border: isOpen ? '2px solid #FAA819' : '1px solid rgba(255, 255, 255, 0.6)',
            color: '#1a1a1a',
          }}
        >
          <div className="flex-1 min-w-0">
            <div className="truncate">
              {selectedOption?.label || value}
            </div>
            {showCurrentTime && currentTime && (
              <div className="text-xs mt-0.5" style={{ color: 'rgba(46, 42, 39, 0.5)' }}>
                Current time: {currentTime}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0, 169, 157, 0.15)', color: '#00A99D' }}>
              {offset}
            </span>
            <svg 
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        
        {showDetectButton && (
          <button
            type="button"
            onClick={handleDetect}
            className="px-3 py-3 rounded-xl transition-all hover:scale-105"
            style={{
              background: 'rgba(0, 169, 157, 0.15)',
              border: '1px solid rgba(0, 169, 157, 0.3)',
              color: '#00A99D',
            }}
            title="Detect my timezone"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div 
          className="absolute z-50 w-full mt-2 rounded-xl overflow-hidden"
          style={{ 
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            maxHeight: '320px',
          }}
        >
          {/* Search */}
          <div className="p-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.3)' }}>
            <div className="relative">
              <svg 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                style={{ color: 'rgba(46, 42, 39, 0.4)' }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search timezones..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none"
                style={{ 
                  fontFamily: 'Inter',
                  fontWeight: 500,
                  fontSize: '14px',
                  background: 'rgba(255, 255, 255, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.6)',
                  color: '#1a1a1a',
                }}
                autoFocus
              />
            </div>
          </div>

          {/* Timezone List */}
          <div className="overflow-y-auto" style={{ maxHeight: '250px' }}>
            {search ? (
              // Flat list when searching
              filteredTimezones.length > 0 ? (
                filteredTimezones.map((tz) => (
                  <button
                    key={tz.value}
                    type="button"
                    onClick={() => {
                      onChange(tz.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm transition flex items-center justify-between ${
                      value === tz.value ? 'bg-[#FAA819]/10' : 'hover:bg-[#fafafa]'
                    }`}
                    style={{ 
                      fontFamily: 'Inter', 
                      fontWeight: 500, 
                      color: value === tz.value ? '#E99502' : '#1a1a1a' 
                    }}
                  >
                    <span>{tz.label}</span>
                    <span className="text-xs" style={{ color: 'rgba(46, 42, 39, 0.4)' }}>
                      {getTimezoneOffset(tz.value)}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center" style={{ color: 'rgba(46, 42, 39, 0.5)' }}>
                  <p className="text-sm" style={{ fontFamily: 'Inter' }}>No timezones found</p>
                </div>
              )
            ) : (
              // Grouped list when not searching
              groupedTimezones.map((group) => (
                <div key={group.region}>
                  <div 
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wide sticky top-0"
                    style={{ 
                      color: 'rgba(46, 42, 39, 0.5)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    {group.region}
                  </div>
                  {group.timezones.map((tz) => (
                    <button
                      key={tz.value}
                      type="button"
                      onClick={() => {
                        onChange(tz.value);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition flex items-center justify-between ${
                        value === tz.value ? 'bg-[#FAA819]/10' : 'hover:bg-[#fafafa]'
                      }`}
                      style={{ 
                        fontFamily: 'Inter', 
                        fontWeight: 500, 
                        color: value === tz.value ? '#E99502' : '#1a1a1a' 
                      }}
                    >
                      <span>{tz.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'rgba(46, 42, 39, 0.4)' }}>
                          {getTimezoneOffset(tz.value)}
                        </span>
                        {value === tz.value && (
                          <svg className="w-4 h-4 text-[#00A99D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
