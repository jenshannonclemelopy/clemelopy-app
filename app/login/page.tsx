'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

function LoginContent() {
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  
  // 2FA states
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    console.log('Starting sign in...');

    const { data, error } = await signIn(email, password);
    console.log('Sign in response:', { data, error });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    // Check if user has 2FA enabled
    try {
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      console.log('MFA factors:', factorsData);

      if (factorsError) {
        console.error('Error checking MFA factors:', factorsError);
        // If we can't check factors, proceed without 2FA
        window.location.href = '/';
        return;
      }

      // Check for verified TOTP factors
      const verifiedFactor = factorsData?.totp?.find(
        (factor) => factor.status === 'verified'
      );

      if (verifiedFactor) {
        // User has 2FA enabled - show verification screen
        console.log('2FA required, factor:', verifiedFactor.id);
        setFactorId(verifiedFactor.id);
        setRequires2FA(true);
        setIsLoading(false);
      } else {
        // No 2FA - proceed to dashboard
        console.log('No 2FA required, redirecting...');
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Error in 2FA check:', err);
      // On error, proceed without 2FA
      window.location.href = '/';
    }
  };

  // Handle 2FA verification
  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!totpCode || totpCode.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    if (!factorId) {
      setError('Authentication error. Please try signing in again.');
      return;
    }

    setIsVerifying2FA(true);

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorId,
      });

      if (challengeError) {
        setError(challengeError.message);
        setIsVerifying2FA(false);
        return;
      }

      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: totpCode,
      });

      if (verifyError) {
        setError('Invalid verification code. Please try again.');
        setTotpCode('');
        setIsVerifying2FA(false);
        return;
      }

      window.location.href = '/';
    } catch (err) {
      console.error('2FA verification error:', err);
      setError('Verification failed. Please try again.');
      setIsVerifying2FA(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
  
      if (error) {
        setError(error.message);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError('Failed to connect to Google. Please try again.');
      setIsLoading(false);
    }
  };

  // 2FA verification screen
  if (requires2FA) {
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
            <div className="text-center mb-8">
              <img 
                src="/clemelopy-logo.svg" 
                alt="Clemelopy" 
                className="h-10 mx-auto mb-6"
              />
            </div>

            {/* 2FA Icon */}
            <div className="flex justify-center mb-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)' }}
                aria-hidden="true"
              >
                <svg width="32" height="32" fill="none" stroke="white" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>

            <h1 
              className="text-center mb-2 text-2xl"
              style={{ 
                fontFamily: 'Montserrat Alternates', 
                fontWeight: 700,
                color: '#1a1a1a'
              }}
            >
              Two-Factor Authentication
            </h1>
            <p 
              className="text-center mb-6 text-sm" 
              style={{ fontFamily: 'Inter', fontWeight: 500, color: '#5c5652' }}
            >
              Enter the 6-digit code from your authenticator app
            </p>

            {error && (
              <div 
                className="mb-4 p-3 rounded-xl text-sm"
                style={{ 
                  fontFamily: 'Inter',
                  fontWeight: 500,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#dc2626'
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handle2FAVerify}>
              <div className="mb-6">
                <label 
                  htmlFor="totp"
                  className="block mb-2 text-sm"
                  style={{ 
                    fontFamily: 'Montserrat Alternates', 
                    fontWeight: 500,
                    color: '#1a1a1a'
                  }}
                >
                  Verification Code
                </label>
                <input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  className="w-full p-3 rounded-xl text-center text-2xl tracking-[0.5em] border-none outline-none"
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 600,
                    backgroundColor: '#fafafa',
                    border: '1px solid #dedede',
                    color: '#1a1a1a'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying2FA || totpCode.length !== 6}
                className="w-full p-3.5 rounded-xl border-none text-white text-base cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                style={{ 
                  background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
                  fontFamily: 'Montserrat Alternates',
                  fontWeight: 600,
                  boxShadow: '0 4px 15px rgba(0, 169, 157, 0.3)',
                }}
              >
                {isVerifying2FA ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  'Verify & Continue'
                )}
              </button>
            </form>

            <button
              onClick={() => {
                setRequires2FA(false);
                setTotpCode('');
                setFactorId(null);
                setError('');
              }}
              className="w-full mt-4 p-3 rounded-xl text-sm cursor-pointer transition-colors bg-transparent border-none"
              style={{ 
                fontFamily: 'Inter', 
                fontWeight: 500,
                color: '#5c5652'
              }}
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              className="h-10 mx-auto mb-4"
            />
            <h1 
              className="text-2xl"
              style={{ 
                fontFamily: 'Montserrat Alternates', 
                fontWeight: 700,
                color: '#1a1a1a'
              }}
            >
              Welcome Back
            </h1>
            <p 
              className="mt-2 text-sm" 
              style={{ fontFamily: 'Inter', fontWeight: 500, color: '#5c5652' }}
            >
              Sign in to continue to your workspace
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div 
              className="mb-4 p-3 rounded-xl text-sm"
              style={{ 
                fontFamily: 'Inter',
                fontWeight: 500,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#dc2626'
              }}
            >
              {error}
            </div>
          )}

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 p-3 mb-6 rounded-xl text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            style={{ 
              fontFamily: 'Inter', 
              fontWeight: 500,
              backgroundColor: '#fafafa',
              border: '1px solid #dedede',
              color: '#1a1a1a'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px" style={{ backgroundColor: '#dedede' }}></div>
            <span className="text-sm" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#737373' }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#dedede' }}></div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="mb-4">
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
                  placeholder="you@example.com"
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

            {/* Password */}
            <div className="mb-4">
              <label 
                htmlFor="password"
                className="block mb-2 text-sm"
                style={{ 
                  fontFamily: 'Montserrat Alternates', 
                  fontWeight: 500,
                  color: '#1a1a1a'
                }}
              >
                Password
              </label>
              <div 
                className="flex items-center gap-2.5 p-3 rounded-xl transition-all"
                style={{
                  backgroundColor: '#fafafa',
                  border: '1px solid #dedede'
                }}
              >
                <svg width="20" height="20" fill="none" style={{ stroke: '#a3a3a3' }} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="flex-1 border-none outline-none bg-transparent text-base"
                  style={{ 
                    fontFamily: 'Inter', 
                    fontWeight: 500,
                    color: '#1a1a1a'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="bg-transparent border-none cursor-pointer p-0"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" fill="none" style={{ stroke: '#a3a3a3' }} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" fill="none" style={{ stroke: '#a3a3a3' }} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right mb-6">
              <a 
                href="/forgot-password" 
                className="text-sm no-underline hover:underline transition-colors"
                style={{ fontFamily: 'Inter', fontWeight: 500, color: '#00A99D' }}
              >
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full p-3.5 rounded-xl border-none text-white text-base cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-lg transition-all"
              style={{ 
                background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                fontFamily: 'Montserrat Alternates',
                fontWeight: 600,
                boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
              }}
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Sign Up Link - Now points to /subscribe */}
          <p 
            className="text-center mt-6 text-sm" 
            style={{ fontFamily: 'Inter', fontWeight: 500, color: '#5c5652' }}
          >
            Don&apos;t have an account?{' '}
            <a 
              href="/subscribe" 
              className="no-underline font-semibold hover:underline transition-colors"
              style={{ color: '#00A99D' }}
            >
              Sign up
            </a>
          </p>

          {/* Footer */}
          <footer 
            className="text-center mt-12 text-sm" 
            style={{ fontFamily: 'Inter', fontWeight: 500, color: '#737373' }}
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

export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex">
        <div 
          className="hidden lg:block lg:w-1/2 bg-cover bg-center bg-no-repeat" 
          style={{ backgroundImage: "url('/images/app-background.svg')" }} 
        />
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-3 border-[#FAA819] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}