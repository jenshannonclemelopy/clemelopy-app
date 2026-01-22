'use client';

import React, { useState, useRef, useEffect } from 'react';

interface InfoTooltipProps {
  content: string;
  title?: string;
}

export default function InfoTooltip({ content, title }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate best position when tooltip opens
  useEffect(() => {
    if (isVisible && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      
      // Prefer top, but use bottom if not enough space above
      if (spaceAbove < 150 && spaceBelow > spaceAbove) {
        setPosition('bottom');
      } else {
        setPosition('top');
      }
    }
  }, [isVisible]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current && 
        !tooltipRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible]);

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setIsVisible(!isVisible)}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="flex items-center justify-center w-5 h-5 rounded-full transition-all duration-200 hover:scale-110"
        style={{
          background: 'rgba(0, 169, 157, 0.1)',
          border: '1px solid rgba(0, 169, 157, 0.3)',
          color: '#00A99D',
        }}
        aria-label={`Info about ${title || 'this metric'}`}
      >
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5"
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>

      {/* Tooltip */}
      {isVisible && (
        <div
          ref={tooltipRef}
          className="absolute z-50"
          style={{
            [position === 'top' ? 'bottom' : 'top']: '100%',
            right: 0,
            marginBottom: position === 'top' ? '8px' : undefined,
            marginTop: position === 'bottom' ? '8px' : undefined,
          }}
        >
          <div
            className="p-4 rounded-xl shadow-lg"
            style={{
              width: '260px',
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 169, 157, 0.2)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            }}
          >
            {title && (
              <h4 
                className="text-sm mb-2"
                style={{ 
                  fontFamily: 'Montserrat Alternates', 
                  fontWeight: 600, 
                  color: '#1a1a1a' 
                }}
              >
                {title}
              </h4>
            )}
            <p 
              className="text-sm leading-relaxed"
              style={{ 
                fontFamily: 'Inter', 
                fontWeight: 500, 
                color: '#4a4642' 
              }}
            >
              {content}
            </p>
          </div>
          
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              [position === 'top' ? 'bottom' : 'top']: '-6px',
              right: '6px',
              width: '12px',
              height: '12px',
              background: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid rgba(0, 169, 157, 0.2)',
              borderRight: 'none',
              borderBottom: position === 'top' ? 'none' : undefined,
              borderTop: position === 'bottom' ? 'none' : undefined,
              transform: position === 'top' ? 'rotate(-45deg)' : 'rotate(135deg)',
            }}
          />
        </div>
      )}
    </div>
  );
}
