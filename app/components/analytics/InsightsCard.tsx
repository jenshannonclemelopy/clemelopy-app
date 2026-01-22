'use client';

import React, { useState, useRef, useEffect } from 'react';

// ============================================
// INFO TOOLTIP COMPONENT (built-in)
// ============================================

interface InfoTooltipProps {
  content: string;
  title?: string;
}

function InfoTooltip({ content, title }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      setPosition(spaceAbove < 150 && spaceBelow > spaceAbove ? 'bottom' : 'top');
    }
  }, [isVisible]);

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
    if (isVisible) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible]);

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setIsVisible(!isVisible)}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="flex items-center justify-center w-5 h-5 rounded-full"
        style={{
          background: 'rgba(0, 169, 157, 0.1)',
          border: '1px solid rgba(0, 169, 157, 0.3)',
          color: '#00A99D',
        }}
        aria-label={`Info about ${title || 'this metric'}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>

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
              <h4 className="text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>
                {title}
              </h4>
            )}
            <p className="text-sm leading-relaxed" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>
              {content}
            </p>
          </div>
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

// ============================================
// INSIGHTS CARD COMPONENT
// ============================================

interface InsightsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  tooltip?: string;
}

export default function InsightsCard({ title, value, change, icon, tooltip }: InsightsCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div 
      className="p-5 rounded-2xl relative h-full"
      style={{
        background: 'rgba(255, 255, 255, 0.5)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
      }}
    >
      {/* Info Tooltip - Top Right */}
      {tooltip && (
        <div className="absolute top-3 right-3">
          <InfoTooltip content={tooltip} title={title} />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        {icon && (
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(250, 168, 25, 0.15) 0%, rgba(0, 169, 157, 0.15) 100%)',
              color: '#00A99D',
            }}
          >
            {icon}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p 
            className="text-sm mb-1 truncate pr-6"
            style={{ 
              fontFamily: 'Inter', 
              fontWeight: 500, 
              color: '#4a4642' 
            }}
          >
            {title}
          </p>
          
          {/* Value */}
          <p 
            className="text-2xl"
            style={{ 
              fontFamily: 'Montserrat Alternates', 
              fontWeight: 700, 
              color: '#1a1a1a' 
            }}
          >
            {value}
          </p>
          
          {/* Change indicator - always reserve space for consistent height */}
          <div className="flex items-center gap-1 mt-1 min-h-[18px]">
            {change !== undefined && change !== null ? (
              <>
                {isPositive && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                )}
                {isNegative && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                )}
                {!isPositive && !isNegative && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
                <span 
                  className="text-xs"
                  style={{ 
                    fontFamily: 'Inter', 
                    fontWeight: 600, 
                    color: isPositive ? '#10B981' : isNegative ? '#EF4444' : '#6B7280' 
                  }}
                >
                  {isPositive && '+'}{change}%
                </span>
                <span 
                  className="text-xs"
                  style={{ fontFamily: 'Inter', fontWeight: 500, color: '#9CA3AF' }}
                >
                  vs. previous period
                </span>
              </>
            ) : (
              /* Empty placeholder to maintain consistent height */
              <span className="text-xs invisible">placeholder</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}