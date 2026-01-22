'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface SubscribePromptProps {
  /** Main headline */
  title?: string;
  /** Detailed message */
  message?: string;
  /** Number of runs remaining (shows badge) */
  runsRemaining?: number;
  /** Whether to show "View Existing Projects" button */
  showViewOnly?: boolean;
  /** Variant affects styling */
  variant?: 'full-page' | 'inline' | 'modal';
  /** Additional CSS classes */
  className?: string;
  /** Callback when user clicks subscribe */
  onSubscribeClick?: () => void;
}

/**
 * Prompt component shown when user needs to subscribe
 * Used when they've exhausted free runs or when accessing gated features
 */
export default function SubscribePrompt({
  title,
  message,
  runsRemaining = 0,
  showViewOnly = true,
  variant = 'inline',
  className = '',
  onSubscribeClick,
}: SubscribePromptProps) {
  // Dynamic title based on runs remaining
  const displayTitle = title || (
    runsRemaining > 0 
      ? `You have ${runsRemaining} free ${runsRemaining === 1 ? 'run' : 'runs'} left`
      : "You've used all your free runs"
  );

  // Dynamic message
  const displayMessage = message || (
    runsRemaining > 0
      ? "Subscribe now to get unlimited access and lock in founding member pricing before it increases."
      : "Subscribe to continue creating linking strategies and unlock the full power of Clemelopy."
  );

  const isFullPage = variant === 'full-page';

  return (
    <div 
      className={`glass-card rounded-2xl text-center ${isFullPage ? 'p-12' : 'p-8'} ${className}`}
    >
      {/* Icon */}
      <div 
        className={`rounded-full flex items-center justify-center mx-auto ${isFullPage ? 'w-24 h-24 mb-8' : 'w-20 h-20 mb-6'}`}
        style={{ 
          background: runsRemaining > 0 
            ? 'linear-gradient(135deg, rgba(250, 168, 25, 0.15), rgba(0, 169, 157, 0.15))'
            : 'linear-gradient(135deg, rgba(250, 168, 25, 0.2), rgba(233, 149, 2, 0.2))',
        }}
      >
        {runsRemaining > 0 ? (
          <svg 
            className={`${isFullPage ? 'w-12 h-12' : 'w-10 h-10'}`}
            fill="none" 
            stroke="url(#gradient-clock)" 
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <defs>
              <linearGradient id="gradient-clock" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FAA819" />
                <stop offset="100%" stopColor="#00A99D" />
              </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ) : (
          <svg 
            className={`${isFullPage ? 'w-12 h-12' : 'w-10 h-10'}`}
            fill="none" 
            stroke="url(#gradient-lock)" 
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <defs>
              <linearGradient id="gradient-lock" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FAA819" />
                <stop offset="100%" stopColor="#E99502" />
              </linearGradient>
            </defs>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        )}
      </div>

      {/* Title */}
      <h2 
        className={`text-primary ${isFullPage ? 'text-3xl mb-4' : 'text-2xl mb-3'}`}
        style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
      >
        {displayTitle}
      </h2>

      {/* Runs remaining badge (only if they have some left) */}
      {runsRemaining > 0 && (
        <div 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
          style={{
            background: 'rgba(250, 168, 25, 0.15)',
            border: '1px solid rgba(250, 168, 25, 0.3)',
          }}
        >
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: 'var(--clemelopy-orange)' }}
          />
          <span 
            className="text-sm font-medium"
            style={{ fontFamily: 'Inter', color: 'var(--clemelopy-orange-dark)' }}
          >
            {runsRemaining} {runsRemaining === 1 ? 'run' : 'runs'} remaining
          </span>
        </div>
      )}

      {/* Message */}
      <p 
        className={`text-secondary ${isFullPage ? 'text-lg mb-8' : 'mb-6'} max-w-md mx-auto`}
        style={{ fontFamily: 'Inter', fontWeight: 500, lineHeight: 1.6 }}
      >
        {displayMessage}
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/pricing"
          onClick={onSubscribeClick}
          className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-white transition-all hover:scale-105 ${isFullPage ? 'px-10 py-4 text-lg' : 'px-8 py-3'}`}
          style={{ 
            fontFamily: 'Montserrat Alternates',
            background: 'linear-gradient(135deg, var(--clemelopy-orange), var(--clemelopy-orange-dark))',
            boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {runsRemaining > 0 ? 'Upgrade Now' : 'Subscribe Now'}
        </Link>

        {showViewOnly && (
          <Link
            href="/my-projects"
            className={`glass-button inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all ${isFullPage ? 'px-10 py-4 text-lg' : 'px-8 py-3'}`}
            style={{ fontFamily: 'Montserrat Alternates' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Existing Projects
          </Link>
        )}
      </div>

      {/* Beta pricing note */}
      <p 
        className="mt-6 text-sm text-muted"
        style={{ fontFamily: 'Inter', fontWeight: 500 }}
      >
        🍊 Lock in founding member pricing during our beta launch
      </p>

      {/* Feature list for full-page variant */}
      {isFullPage && (
        <div className="mt-8 pt-8 glass-divider">
          <p 
            className="text-sm mb-4 text-primary"
            style={{ fontFamily: 'Inter', fontWeight: 600 }}
          >
            What you get with a subscription:
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-secondary" style={{ fontFamily: 'Inter' }}>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" style={{ color: 'var(--clemelopy-teal)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              8 strategies/month
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" style={{ color: 'var(--clemelopy-teal)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Full dashboard access
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" style={{ color: 'var(--clemelopy-teal)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Priority support
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" style={{ color: 'var(--clemelopy-teal)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Export & download
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ADA-compliant modal matching the tour modal style
 */
export function RunsWarningModal({ 
  runsRemaining,
  onClose,
  onUpgrade,
}: { 
  runsRemaining: number;
  onClose: () => void;
  onUpgrade?: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Focus trap and escape key handling for ADA compliance
  useEffect(() => {
    // Focus the first interactive element when modal opens
    firstFocusRef.current?.focus();

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;
      
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTab);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const isOutOfRuns = runsRemaining === 0;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="runs-warning-title"
      aria-describedby="runs-warning-description"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        ref={modalRef}
        className="glass-modal max-w-md w-full overflow-hidden"
        style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)' }}
      >
        {/* Top gradient bar - matches tour style */}
        <div 
          className="h-1 w-full"
          style={{ 
            background: 'linear-gradient(90deg, var(--clemelopy-orange) 0%, var(--clemelopy-orange-dark) 50%, var(--clemelopy-teal) 100%)' 
          }}
        />
        
        <div className="p-6">
          {/* Progress indicator - matches tour style */}
          <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1.5">
            {/* Single filled dot (orange) */}
            <div 
              className="w-6 h-2 rounded-full"
              style={{ background: 'linear-gradient(135deg, var(--clemelopy-orange), var(--clemelopy-orange-dark))' }}
            />
            {/* Empty dots */}
            <div className="w-2 h-2 rounded-full bg-gray-200" />
          </div>
          {/* Optional: could show "Upgrade" text here like "1 of 7" */}
        </div>

        {/* Title with emoji - matches tour style */}
        <h2 
          id="runs-warning-title"
          className="text-2xl mb-4 text-primary" 
          style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
        >
          {isOutOfRuns ? "You're Out of Runs!" : "Last Run!"} {' '}
          <span role="img" aria-label="clementine">🍊</span>
        </h2>

        {/* Description - matches tour style */}
        <p 
          id="runs-warning-description"
          className="mb-8 text-secondary leading-relaxed" 
          style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '1rem' }}
        >
          {isOutOfRuns 
            ? "Subscribe to continue creating linking strategies and unlock the full power of Clemelopy."
            : "After this generation, you'll need to subscribe to create more linking strategies."
          }
        </p>

        {/* Buttons - matches tour style exactly */}
        <div className="flex items-center justify-between">
          {/* Left: text link like "Skip tour" */}
          <button
            ref={firstFocusRef}
            onClick={onClose}
            className="text-base transition-colors hover:opacity-70 rounded-lg px-2 py-1"
            style={{ 
              fontFamily: 'Inter', 
              fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #005a54';
              e.currentTarget.style.outlineOffset = '4px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
              e.currentTarget.style.outlineOffset = '0';
            }}
          >
            {isOutOfRuns ? 'Maybe later' : 'Continue'}
          </button>

          {/* Right: orange button like "Next" */}
          <Link
            href="/pricing"
            onClick={onUpgrade}
            className="px-6 py-3 rounded-xl text-white transition-all hover:scale-105"
            style={{ 
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: '1rem',
              background: 'linear-gradient(135deg, var(--clemelopy-orange), var(--clemelopy-orange-dark))',
              boxShadow: '0 4px 12px rgba(250, 168, 25, 0.3)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #005a54';
              e.currentTarget.style.outlineOffset = '4px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
              e.currentTarget.style.outlineOffset = '0';
            }}
          >
            View Plans
          </Link>
        </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapper component that shows modal when runs are low/empty
 * Now includes isLoading prop to prevent flash during data fetch
 */
export function RunsWarningBanner({ 
  runsRemaining,
  isLoading = false,
}: { 
  runsRemaining: number;
  isLoading?: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [hasShownModal, setHasShownModal] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [dataHasLoaded, setDataHasLoaded] = useState(false);

  // Track when data has actually loaded (isLoading went from true to false)
  useEffect(() => {
    if (!isLoading && !dataHasLoaded) {
      // Data just finished loading - wait a bit before showing anything
      const timer = setTimeout(() => {
        setDataHasLoaded(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, dataHasLoaded]);

  // Add a delay before we're "ready" to show modal - prevents flash during initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1000); // Wait 1000ms after mount before allowing modal
    return () => clearTimeout(timer);
  }, []);

  // Show modal automatically when out of runs (only once per session)
  // IMPORTANT: Don't show while loading, before ready delay, or before data has loaded
  useEffect(() => {
    if (isReady && dataHasLoaded && !isLoading && runsRemaining === 0 && !hasShownModal) {
      setShowModal(true);
      setHasShownModal(true);
    }
  }, [runsRemaining, hasShownModal, isLoading, isReady, dataHasLoaded]);

  // Don't render anything while loading, not ready, data hasn't loaded, or if runs > 1 (no warning needed)
  if (!isReady || !dataHasLoaded || isLoading || runsRemaining > 1) return null;

  return (
    <>
      {showModal && (
        <RunsWarningModal 
          runsRemaining={runsRemaining}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}