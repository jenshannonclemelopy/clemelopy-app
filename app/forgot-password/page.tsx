'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    const { error } = await resetPassword(email);

    if (error) {
      setError(error.message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - SVG Background */}
      <div 
        className="hidden lg:block lg:w-1/2 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/app-background.svg')" }}
      />

      {/* Right side - Form */}
      <div 
        className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 min-h-screen"
        style={{ backgroundColor: '#ffffff' }}
      >
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img 
              src="/clemelopy-logo.svg" 
              alt="Clemelopy" 
              className="h-10 mx-auto"
            />
          </div>

          {!isSubmitted ? (
            <div>
              {/* Header */}
              <div className="text-center mb-8">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(250, 168, 25, 0.2) 0%, rgba(233, 149, 2, 0.2) 100%)',
                  }}
                  aria-hidden="true"
                >
                  <svg className="w-8 h-8 text-[#FAA819]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h1 
                  id="forgot-heading"
                  className="text-2xl mb-2"
                  style={{ 
                    fontFamily: 'Montserrat Alternates', 
                    fontWeight: 700,
                    color: '#00A99D'
                  }}
                >
                  Forgot your password?
                </h1>
                <p 
                  className="text-sm"
                  style={{ 
                    fontFamily: 'Inter', 
                    fontWeight: 500,
                    color: '#5c5652'
                  }}
                >
                  No worries! Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div 
                  className="mb-4 p-3 rounded-xl text-sm"
                  style={{ 
                    fontFamily: 'Inter',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c'
                  }}
                  role="alert"
                >
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label 
                    htmlFor="email"
                    className="block mb-2 text-sm"
                    style={{ 
                      fontFamily: 'Montserrat Alternates', 
                      fontWeight: 500,
                      color: '#1a1a1a'
                    }}
                  >
                    Email Address
                  </label>
                  <div 
                    className="flex items-center gap-2.5 p-3 rounded-xl transition-all"
                    style={{
                      backgroundColor: '#fafafa',
                      border: '1px solid #dedede'
                    }}
                  >
                    <svg width="20" height="20" fill="none" style={{ stroke: '#a3a3a3' }} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      autoComplete="email"
                      className="flex-1 border-none outline-none bg-transparent text-base"
                      style={{ 
                        fontFamily: 'Inter', 
                        fontWeight: 500,
                        color: '#1a1a1a'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full p-3.5 rounded-xl border-none text-white text-base cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                  style={{ 
                    background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                    fontFamily: 'Montserrat Alternates',
                    fontWeight: 600,
                    boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              {/* Back to Login */}
              <div className="text-center mt-6">
                <a 
                  href="/login"
                  className="text-sm font-medium transition-colors inline-flex items-center gap-1"
                  style={{ 
                    fontFamily: 'Inter',
                    color: '#00A99D'
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Sign In
                </a>
              </div>
            </div>
          ) : (
            /* Success State */
            <div className="text-center">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ 
                  background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
                  boxShadow: '0 8px 32px rgba(0, 169, 157, 0.3)',
                }}
                aria-hidden="true"
              >
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              
              <h1 
                id="success-heading"
                className="text-2xl mb-3"
                style={{ 
                  fontFamily: 'Montserrat Alternates', 
                  fontWeight: 700,
                  color: '#00A99D'
                }}
              >
                Check your email!
              </h1>
              
              <p 
                className="text-sm mb-2"
                style={{ 
                  fontFamily: 'Inter', 
                  fontWeight: 500,
                  color: '#5c5652'
                }}
              >
                We've sent a password reset link to:
              </p>
              
              <p 
                className="font-semibold mb-6"
                style={{ 
                  fontFamily: 'Inter',
                  color: '#1a1a1a'
                }}
              >
                {email}
              </p>

              <div 
                className="rounded-xl p-4 mb-6"
                style={{
                  backgroundColor: '#fafafa',
                  border: '1px solid #dedede'
                }}
              >
                <p 
                  className="text-sm"
                  style={{ 
                    fontFamily: 'Inter', 
                    fontWeight: 500,
                    color: '#5c5652'
                  }}
                >
                  Didn't receive the email? Check your spam folder or{' '}
                  <button 
                    onClick={() => {
                      setIsSubmitted(false);
                      setEmail('');
                    }}
                    className="font-semibold transition-colors focus:outline-none focus:underline"
                    style={{ color: '#FAA819' }}
                  >
                    try again
                  </button>
                </p>
              </div>

              <a 
                href="/login"
                className="inline-block w-full p-3.5 rounded-xl text-white font-semibold transition-all text-center hover:shadow-lg"
                style={{ 
                  fontFamily: 'Montserrat Alternates',
                  background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
                  boxShadow: '0 4px 15px rgba(0, 169, 157, 0.3)',
                }}
              >
                Back to Sign In
              </a>
            </div>
          )}

          {/* Footer */}
          <footer 
            className="text-center mt-12 text-sm" 
            style={{ 
              fontFamily: 'Inter', 
              fontWeight: 500, 
              color: '#737373' 
            }}
          >
            <p>
              © {new Date().getFullYear()} Clemelopy<span aria-label=" Trademark">™</span> All Rights Reserved.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}