'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

export default function EmailConfirmationBanner() {
  const { emailConfirmation, resendConfirmationEmail, user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if confirmed, blocked (blocker will show instead), or dismissed
  if (emailConfirmation.isConfirmed || emailConfirmation.status === 'blocked' || isDismissed) {
    return null;
  }

  const handleResend = async () => {
    setIsResending(true);
    setResendMessage(null);
    
    const { error } = await resendConfirmationEmail();
    
    if (error) {
      setResendMessage('Failed to send. Please try again.');
    } else {
      setResendMessage('Confirmation email sent!');
    }
    
    setIsResending(false);
  };

  // Determine urgency level for styling
  const isUrgent = emailConfirmation.daysRemaining <= 2 || emailConfirmation.runsRemaining <= 1;

  return (
    <div 
      className={`w-full px-4 py-3 flex items-center justify-between gap-4 ${
        isUrgent 
          ? 'bg-gradient-to-r from-red-500 to-orange-500' 
          : 'bg-gradient-to-r from-amber-500 to-orange-500'
      }`}
      style={{ zIndex: 9999 }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate" style={{ fontFamily: 'Inter' }}>
            {isUrgent ? (
              <>⚠️ Please confirm your email to continue using Clemelopy</>
            ) : (
              <>Please confirm your email address</>
            )}
          </p>
          <p className="text-white/80 text-xs truncate" style={{ fontFamily: 'Inter' }}>
            {emailConfirmation.daysRemaining > 0 && emailConfirmation.runsRemaining > 0 ? (
              <>{emailConfirmation.daysRemaining} day{emailConfirmation.daysRemaining !== 1 ? 's' : ''} or {emailConfirmation.runsRemaining} free run{emailConfirmation.runsRemaining !== 1 ? 's' : ''} remaining</>
            ) : emailConfirmation.daysRemaining > 0 ? (
              <>{emailConfirmation.daysRemaining} day{emailConfirmation.daysRemaining !== 1 ? 's' : ''} remaining</>
            ) : (
              <>{emailConfirmation.runsRemaining} free run{emailConfirmation.runsRemaining !== 1 ? 's' : ''} remaining</>
            )}
            {user?.email && <span className="hidden sm:inline"> • Check {user.email}</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {resendMessage && (
          <span className="text-white/90 text-xs hidden sm:block" style={{ fontFamily: 'Inter' }}>
            {resendMessage}
          </span>
        )}
        
        <button
          onClick={handleResend}
          disabled={isResending}
          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
          style={{ fontFamily: 'Montserrat Alternates' }}
        >
          {isResending ? 'Sending...' : 'Resend Email'}
        </button>
        
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-white/20 rounded transition-all"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
