'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';

export default function EmailConfirmationModal() {
  const { emailConfirmation, resendConfirmationEmail, user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const resendButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (emailConfirmation.status !== 'blocked') return;

    // Focus the resend button when modal opens
    resendButtonRef.current?.focus();

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      // Trap focus within modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [emailConfirmation.status]);

  // Don't show if confirmed or in grace period
  if (emailConfirmation.status !== 'blocked') {
    return null;
  }

  const handleResend = async () => {
    setIsResending(true);
    setResendError('');
    setResendSuccess(false);

    const { error } = await resendConfirmationEmail();

    if (error) {
      setResendError(error.message || 'Failed to send email. Please try again.');
    } else {
      setResendSuccess(true);
    }

    setIsResending(false);
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      aria-describedby="confirmation-modal-description"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
    >
      <div 
        ref={modalRef}
        style={{
          background: 'white',
          borderRadius: '24px',
          padding: '40px',
          maxWidth: '450px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Icon - decorative, hidden from screen readers */}
        <div 
          aria-hidden="true"
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <svg width="40" height="40" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        {/* Title */}
        <h2 
          id="confirmation-modal-title"
          style={{
            fontFamily: 'Montserrat Alternates, sans-serif',
            fontSize: '24px',
            fontWeight: 700,
            color: '#1a1a1a',
            margin: '0 0 12px',
          }}
        >
          Please Confirm Your Email
        </h2>

        {/* Description */}
        <div id="confirmation-modal-description">
          <p 
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '16px',
              lineHeight: 1.6,
              color: '#525252',
              margin: '0 0 8px',
            }}
          >
            To continue using Clemelopy, please confirm your email address.
          </p>

          <p 
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              color: '#5c5652',
              margin: '0 0 24px',
            }}
          >
            We sent a confirmation link to <strong style={{ color: '#1a1a1a' }}>{user?.email}</strong>
          </p>
        </div>

        {/* Success Message */}
        {resendSuccess && (
          <div 
            role="status"
            aria-live="polite"
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '16px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              color: '#166534',
            }}
          >
            <span aria-hidden="true">✓ </span>Confirmation email sent! Check your inbox.
          </div>
        )}

        {/* Error Message */}
        {resendError && (
          <div 
            role="alert"
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '16px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              color: '#b91c1c',
            }}
          >
            {resendError}
          </div>
        )}

        {/* Resend Button */}
        <button
          ref={resendButtonRef}
          onClick={handleResend}
          disabled={isResending}
          aria-busy={isResending}
          style={{
            width: '100%',
            padding: '14px 24px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
            color: 'white',
            fontFamily: 'Montserrat Alternates, sans-serif',
            fontWeight: 600,
            fontSize: '16px',
            cursor: isResending ? 'not-allowed' : 'pointer',
            opacity: isResending ? 0.7 : 1,
            boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
            marginBottom: '12px',
          }}
        >
          {isResending ? 'Sending...' : 'Resend Confirmation Email'}
        </button>

        {/* Help Text */}
        <p 
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            color: '#5c5652',
            margin: 0,
          }}
        >
          Didn't receive it? Check your spam folder or{' '}
          <a 
            href="mailto:support@clemelopy.com" 
            style={{ 
              color: '#00A99D', 
              textDecoration: 'underline',
            }}
          >
            contact support
          </a>
        </p>
      </div>
    </div>
  );
}