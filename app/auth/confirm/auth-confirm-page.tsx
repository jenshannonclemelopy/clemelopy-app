'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import AuthLayout from '../../components/AuthLayout';

function ConfirmContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const [redirectPath, setRedirectPath] = useState('/');

  useEffect(() => {
    const verifyToken = async () => {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type') as 'signup' | 'recovery' | 'magiclink' | 'email_change' | 'invite';

      if (!tokenHash || !type) {
        setStatus('error');
        setMessage('Invalid or missing verification link. Please request a new one.');
        return;
      }

      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type,
        });

        if (error) {
          console.error('Verification error:', error);
          setStatus('error');
          
          if (error.message.includes('expired')) {
            setMessage('This link has expired. Please request a new one.');
          } else if (error.message.includes('already')) {
            setMessage('This email has already been confirmed. You can sign in now.');
            setRedirectPath('/login');
          } else {
            setMessage(error.message || 'Verification failed. Please try again.');
          }
          return;
        }

        // Success! Set appropriate message and redirect based on type
        setStatus('success');
        
        switch (type) {
          case 'signup':
            setMessage('Email confirmed! Redirecting to your dashboard...');
            setRedirectPath('/');
            break;
          case 'recovery':
            setMessage('Verified! Redirecting to reset your password...');
            setRedirectPath('/reset-password');
            break;
          case 'magiclink':
            setMessage('Signed in! Redirecting to your dashboard...');
            setRedirectPath('/');
            break;
          case 'email_change':
            setMessage('Email updated! Redirecting to settings...');
            setRedirectPath('/settings');
            break;
          case 'invite':
            setMessage('Invitation accepted! Redirecting to complete setup...');
            setRedirectPath('/onboarding');
            break;
          default:
            setMessage('Verified! Redirecting...');
            setRedirectPath('/');
        }

        // Redirect after a short delay
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 2000);

      } catch (err) {
        console.error('Verification exception:', err);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    verifyToken();
  }, [searchParams]);

  // Trigger redirect when redirectPath changes after success
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        window.location.href = redirectPath;
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, redirectPath]);

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div 
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '32px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            padding: '40px 32px',
            textAlign: 'center',
          }}
        >
          {/* Logo */}
          <div className="mb-6">
            <img 
              src="/clemelopy-logo.svg" 
              alt="Clemelopy" 
              className="h-10 mx-auto"
            />
          </div>

          {/* Loading State */}
          {status === 'loading' && (
            <>
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div 
                  className="absolute inset-0 rounded-full animate-spin"
                  style={{
                    border: '3px solid rgba(250, 168, 25, 0.2)',
                    borderTopColor: '#FAA819',
                  }}
                />
                <div 
                  className="absolute inset-2 rounded-full animate-spin"
                  style={{
                    border: '3px solid rgba(0, 169, 157, 0.2)',
                    borderTopColor: '#00A99D',
                    animationDirection: 'reverse',
                    animationDuration: '1.5s',
                  }}
                />
              </div>
              <p 
                style={{ 
                  fontFamily: 'Inter', 
                  fontWeight: 500, 
                  fontSize: '16px',
                  color: '#2e2a27',
                }}
              >
                {message}
              </p>
            </>
          )}

          {/* Success State */}
          {status === 'success' && (
            <>
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ 
                  background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
                  boxShadow: '0 4px 20px rgba(0, 169, 157, 0.3)',
                }}
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 
                style={{ 
                  fontFamily: 'Montserrat Alternates', 
                  fontWeight: 700, 
                  fontSize: '24px',
                  color: '#00A99D',
                  marginBottom: '12px',
                }}
              >
                Success!
              </h2>
              <p 
                style={{ 
                  fontFamily: 'Inter', 
                  fontWeight: 500, 
                  fontSize: '16px',
                  color: '#5c5652',
                }}
              >
                {message}
              </p>
            </>
          )}

          {/* Error State */}
          {status === 'error' && (
            <>
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(250, 168, 25, 0.2) 0%, rgba(233, 149, 2, 0.2) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                }}
              >
                <svg className="w-8 h-8 text-[#FAA819]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 
                style={{ 
                  fontFamily: 'Montserrat Alternates', 
                  fontWeight: 700, 
                  fontSize: '24px',
                  color: '#2e2a27',
                  marginBottom: '12px',
                }}
              >
                Verification Issue
              </h2>
              <p 
                style={{ 
                  fontFamily: 'Inter', 
                  fontWeight: 500, 
                  fontSize: '16px',
                  color: '#5c5652',
                  marginBottom: '24px',
                }}
              >
                {message}
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="/login"
                  style={{
                    display: 'block',
                    padding: '14px 24px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                    color: 'white',
                    fontFamily: 'Montserrat Alternates',
                    fontWeight: 600,
                    fontSize: '16px',
                    textDecoration: 'none',
                    boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
                    textAlign: 'center',
                  }}
                >
                  Sign In to Request New Link
                </a>
                <p
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    fontSize: '13px',
                    color: '#737373',
                    textAlign: 'center',
                    margin: 0,
                  }}
                >
                  Sign in to your account, then you can request a new confirmation email from your dashboard.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p 
          style={{ 
            textAlign: 'center', 
            marginTop: '32px', 
            fontFamily: 'Inter', 
            fontWeight: 500, 
            fontSize: '14px', 
            color: '#5c5652',
          }}
        >
          ©2025 Clemelopy™ All Rights Reserved.
        </p>
      </div>
    </AuthLayout>
  );
}

export default function AuthConfirm() {
  return (
    <Suspense fallback={
      <AuthLayout>
        <div className="w-full max-w-md flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-3 border-[#FAA819] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AuthLayout>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
