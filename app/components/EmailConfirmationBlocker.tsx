'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

export default function EmailConfirmationBlocker() {
  const { emailConfirmation, resendConfirmationEmail, user, signOut } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Only show if blocked
  if (emailConfirmation.status !== 'blocked') {
    return null;
  }

  const handleResend = async () => {
    setIsResending(true);
    setResendMessage(null);
    
    const { error } = await resendConfirmationEmail();
    
    if (error) {
      setResendMessage({ type: 'error', text: 'Failed to send email. Please try again.' });
    } else {
      setResendMessage({ type: 'success', text: 'Confirmation email sent! Check your inbox.' });
    }
    
    setIsResending(false);
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <div 
      className="fixed inset-0 z-99999 flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, rgba(250, 168, 25, 0.95) 0%, rgba(233, 149, 2, 0.95) 50%, rgba(0, 169, 157, 0.95) 100%)',
      }}
    >
      <div 
        className="w-full max-w-md"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header gradient bar */}
        <div 
          style={{
            height: '4px',
            background: 'linear-gradient(to right, #FAA819, #E99502, #00A99D)',
          }}
        />

        <div className="p-8 text-center">
          {/* Email icon */}
          <div 
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(250, 168, 25, 0.15) 0%, rgba(0, 169, 157, 0.15) 100%)',
            }}
          >
            <svg className="w-10 h-10 text-[#FAA819]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          {/* Title */}
          <h1 
            className="text-2xl text-[#1a1a1a] mb-3"
            style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
          >
            Please Confirm Your Email
          </h1>

          {/* Description */}
          <p 
            className="text-[#1a1a1a]/70 mb-2"
            style={{ fontFamily: 'Inter', fontWeight: 500 }}
          >
            To continue using Clemelopy, please confirm your email address.
          </p>
          
          {user?.email && (
            <p 
              className="text-[#1a1a1a]/60 mb-6 text-sm"
              style={{ fontFamily: 'Inter' }}
            >
              We sent a confirmation link to <strong>{user.email}</strong>
            </p>
          )}

          {/* Status message */}
          {resendMessage && (
            <div 
              className={`p-3 rounded-xl mb-6 ${
                resendMessage.type === 'success' 
                  ? 'bg-[#00A99D]/10 border border-[#00A99D]/30' 
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <p 
                className={`text-sm ${
                  resendMessage.type === 'success' ? 'text-[#00A99D]' : 'text-red-600'
                }`}
                style={{ fontFamily: 'Inter', fontWeight: 500 }}
              >
                {resendMessage.text}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleResend}
              disabled={isResending}
              className="w-full py-3 px-6 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              style={{ 
                fontFamily: 'Montserrat Alternates',
                background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
              }}
            >
              {isResending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Resend Confirmation Email
                </>
              )}
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-6 rounded-xl font-semibold transition-all hover:bg-[#00A99D]/10"
              style={{ 
                fontFamily: 'Montserrat Alternates',
                background: 'rgba(0, 169, 157, 0.05)',
                border: '1px solid rgba(0, 169, 157, 0.3)',
                color: '#00A99D',
              }}
            >
              I've Confirmed - Refresh Page
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#1a1a1a]/10"></div>
            <span className="text-xs text-[#1a1a1a]/40" style={{ fontFamily: 'Inter' }}>or</span>
            <div className="flex-1 h-px bg-[#1a1a1a]/10"></div>
          </div>

          {/* Sign out option */}
          <button
            onClick={handleSignOut}
            className="text-sm text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors"
            style={{ fontFamily: 'Inter', fontWeight: 500 }}
          >
            Sign out and use a different account
          </button>

          {/* Help text */}
          <p 
            className="mt-6 text-xs text-[#1a1a1a]/50"
            style={{ fontFamily: 'Inter' }}
          >
            Didn't receive the email? Check your spam folder or{' '}
            <a href="mailto:support@clemelopy.com" className="text-[#00A99D] hover:underline">
              contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
