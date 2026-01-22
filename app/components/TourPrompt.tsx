'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TourPromptProps {
  isVisible: boolean;
  onStartTour: () => void;
  onDismiss: () => void;
}

export default function TourPrompt({ isVisible, onStartTour, onDismiss }: TourPromptProps) {
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    // Wait before allowing any render
    const timer = setTimeout(() => {
      setCanRender(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Don't render until delay has passed AND isVisible is true
  if (!canRender || !isVisible) return null;

  const colors = {
    bg: 'white',
    text: '#1a1a1a',
    textMuted: 'rgba(46, 42, 39, 0.7)',
    dismissBg: 'rgba(46, 42, 39, 0.05)',
    dismissText: 'rgba(46, 42, 39, 0.6)',
    dismissBorder: 'rgba(46, 42, 39, 0.1)',
    shadow: '0 20px 60px rgba(250, 168, 25, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)',
    border: 'rgba(250, 168, 25, 0.2)',
  };

  return createPortal(
    <div 
      className="tour-prompt-overlay"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9998,
      }}
      onClick={onDismiss}
    >
      <div 
        style={{
          background: colors.bg,
          borderRadius: '24px',
          padding: '32px',
          maxWidth: '420px',
          width: '90%',
          boxShadow: colors.shadow,
          border: `1px solid ${colors.border}`,
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(to right, #FAA819, #E99502, #00A99D)',
            borderRadius: '24px 24px 0 0',
          }}
        />
        
        <div 
          style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            marginLeft: 'auto',
            marginRight: 'auto',
            boxShadow: '0 4px 12px rgba(250, 168, 25, 0.3)',
          }}
        >
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>

        <h3 
          style={{ 
            fontFamily: 'Montserrat Alternates', 
            fontWeight: 700,
            fontSize: '22px',
            color: colors.text,
            marginBottom: '12px',
            textAlign: 'center',
          }}
        >
          Welcome to Clemelopy! 🍊
        </h3>
        <p 
          style={{ 
            fontFamily: 'Inter', 
            fontWeight: 500,
            fontSize: '15px',
            color: colors.textMuted,
            marginBottom: '24px',
            lineHeight: '1.6',
            textAlign: 'center',
          }}
        >
          Take a quick tour to learn how to create linking strategies and navigate your dashboard.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={onStartTour}
            className="tour-start-button"
            style={{ 
              width: '100%',
              padding: '14px 24px',
              borderRadius: '14px',
              fontFamily: 'Montserrat Alternates',
              fontWeight: 600,
              fontSize: '16px',
              background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Start Tour
          </button>
          <button
            onClick={onDismiss}
            className="tour-dismiss-button"
            style={{ 
              width: '100%',
              padding: '12px 24px',
              borderRadius: '14px',
              fontFamily: 'Montserrat Alternates',
              fontWeight: 600,
              fontSize: '14px',
              background: colors.dismissBg,
              color: colors.dismissText,
              border: `1px solid ${colors.dismissBorder}`,
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
