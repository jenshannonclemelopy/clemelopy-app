'use client';

import React from 'react';

interface PageHeaderProps {
  /** First part of title (black text) */
  titleStart: string;
  /** Second part of title (gradient text) */
  titleEnd: string;
  /** Subtitle text below the title */
  subtitle: string;
  /** Whether to center the title and subtitle (default: true) */
  centered?: boolean;
  /** Whether to show the Tour button (default: true) */
  showTour?: boolean;
  /** Callback when Tour button is clicked */
  onTourClick?: () => void;
}

export default function PageHeader({
  titleStart,
  titleEnd,
  subtitle,
  centered = true,
  showTour = true,
  onTourClick,
}: PageHeaderProps) {
  return (
    <header 
      className="rounded-2xl px-8 py-12 mb-8"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.05) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.7)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className={`flex-1 ${centered ? 'text-center' : ''}`}>
          <h1 
            className="text-3xl lg:text-4xl mb-2" 
            style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
          >
            <span style={{ color: '#1a1a1a' }}>{titleStart} </span>
            <span 
              style={{ 
                background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {titleEnd}
            </span>
          </h1>
          <p 
            className={`text-base max-w-2xl ${centered ? 'mx-auto' : ''}`}
            style={{ 
              fontFamily: 'Inter', 
              fontWeight: 500,
              color: '#4a4642',
            }}
          >
            {subtitle}
          </p>
        </div>
        
        {showTour && (
          <button
            onClick={onTourClick}
            className="px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shrink-0 transition-all hover:shadow-md"
            style={{
              fontFamily: 'Montserrat Alternates',
              fontWeight: 500,
              background: 'rgba(255, 255, 255, 0.6)',
              border: '1px solid rgba(0, 169, 157, 0.3)',
              color: '#005a54',
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tour
          </button>
        )}
      </div>
    </header>
  );
}
