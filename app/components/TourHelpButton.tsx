'use client';

import React from 'react';

interface TourHelpButtonProps {
  onClick: () => void;
  hasCompleted?: boolean;
}

export default function TourHelpButton({ onClick, hasCompleted = false }: TourHelpButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-105"
      style={{
        background: 'rgba(255, 255, 255, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        fontFamily: 'Inter',
        fontWeight: 500,
        fontSize: '14px',
        color: '#1a1a1a',
      }}
      aria-label={hasCompleted ? 'Restart page tour' : 'Take a tour of this page'}
    >
      <svg 
        className="w-4 h-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        style={{ color: '#006b63' }}
        aria-hidden="true"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>
      <span>Tour</span>
    </button>
  );
}