'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isValidLink, setIsValidLink] = useState(true);


  // Check if user arrived via valid reset link
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !window.location.hash) {
        setIsValidLink(false);
      }
    };
    checkSession();
  }, []);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-[#00A99D]', 'bg-[#0D7871]'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (passwordStrength < 2) {
      setError('Please choose a stronger password.');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setIsSuccess(true);
  };

  // Invalid link state
  if (!isValidLink) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left side - SVG Background */}
        <div 
          className="hidden lg:block lg:w-1/2 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/app-background.svg')" }}
        />

        {/* Right side - Content */}
        <div 
          className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 min-h-screen"
          style={{ backgroundColor: '#ffffff' }}
        >
          <div className="w-full max-w-md text-center">
            {/* Logo */}
            <div className="mb-8">
              <img 
                src="/clemelopy-logo.svg" 
                alt="Clemelopy" 
                className="h-10 mx-auto"
              />
            </div>
            
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ 
                background: 'rgba(250, 168, 25, 0.15)' 
              }}
            >
              <svg className="w-8 h-8 text-[#FAA819]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            
            <h1 
              className="text-2xl mb-2"
              style={{ 
                fontFamily: 'Montserrat Alternates', 
                fontWeight: 700,
                color: '#1a1a1a'
              }}
            >
              Reset Your Password
            </h1>
            
            <p 
              className="text-sm mb-6"
              style={{ 
                fontFamily: 'Inter', 
                fontWeight: 500,
                color: '#5c5652'
              }}
            >
              To reset your password, we'll send you an email with a secure link. Click the button below to get started.
            </p>

            <a 
              href="/forgot-password"
              className="inline-block w-full p-3.5 rounded-xl text-white font-semibold transition-all text-center hover:shadow-lg"
              style={{ 
                fontFamily: 'Montserrat Alternates',
                background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
              }}
            >
              Request Password Reset Link
            </a>
            
            <div className="text-center mt-4">
              <a 
                href="/login"
                className="text-sm font-medium transition-colors inline-flex items-center gap-1"
                style={{ 
                  fontFamily: 'Inter',
                  color: '#00A99D'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Sign In
              </a>
            </div>

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

          {!isSuccess ? (
            <div>
              {/* Header */}
              <div className="text-center mb-6">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(0, 169, 157, 0.2) 0%, rgba(13, 120, 113, 0.2) 100%)'
                  }}
                >
                  <svg 
                    className="w-8 h-8" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#00A99D' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h1 
                  className="text-2xl mb-2"
                  style={{ 
                    fontFamily: 'Montserrat Alternates', 
                    fontWeight: 700,
                    color: '#00A99D'
                  }}
                >
                  Create new password
                </h1>
                <p 
                  className="text-sm"
                  style={{ 
                    fontFamily: 'Inter', 
                    fontWeight: 500,
                    color: '#5c5652'
                  }}
                >
                  Your new password must be different from previously used passwords.
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
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div>
                  <label 
                    htmlFor="password"
                    className="block mb-2 text-sm"
                    style={{ 
                      fontFamily: 'Montserrat Alternates', 
                      fontWeight: 500,
                      color: '#1a1a1a'
                    }}
                  >
                    New Password
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
                      placeholder="Enter your new password"
                      autoComplete="new-password"
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

                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all ${
                              i < passwordStrength 
                                ? strengthColors[passwordStrength - 1] 
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p 
                        className={`text-xs ${
                          passwordStrength >= 3 
                            ? ('text-[#00A99D]')
                            : passwordStrength >= 2 
                              ? 'text-yellow-500' 
                              : 'text-red-500'
                        }`}
                        style={{ fontFamily: 'Inter', fontWeight: 500 }}
                      >
                        {strengthLabels[passwordStrength - 1] || 'Too weak'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label 
                    htmlFor="confirm-password"
                    className="block mb-2 text-sm"
                    style={{ 
                      fontFamily: 'Montserrat Alternates', 
                      fontWeight: 500,
                      color: '#1a1a1a'
                    }}
                  >
                    Confirm Password
                  </label>
                  <div 
                    className="flex items-center gap-2.5 p-3 rounded-xl transition-all"
                    style={{
                      backgroundColor: '#fafafa',
                      border: confirmPassword && password !== confirmPassword 
                        ? '1px solid #ef4444'
                        : confirmPassword && password === confirmPassword
                          ? ('1px solid #00A99D')
                          : ('1px solid #dedede')
                    }}
                  >
                    <svg width="20" height="20" fill="none" style={{ stroke: '#a3a3a3' }} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      autoComplete="new-password"
                      className="flex-1 border-none outline-none bg-transparent text-base"
                      style={{ 
                        fontFamily: 'Inter', 
                        fontWeight: 500,
                        color: '#1a1a1a'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="bg-transparent border-none cursor-pointer p-0"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
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
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                      Passwords do not match
                    </p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <p 
                      className="text-xs mt-1" 
                      style={{ fontFamily: 'Inter', fontWeight: 500, color: '#00A99D' }}
                    >
                      ✓ Passwords match
                    </p>
                  )}
                </div>

                {/* Password Requirements */}
                <div 
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: '#fafafa',
                    border: '1px solid #dedede'
                  }}
                >
                  <p 
                    className="text-xs font-medium mb-2" 
                    style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}
                  >
                    Password requirements:
                  </p>
                  <ul className="space-y-1">
                    {[
                      { check: password.length >= 8, text: 'At least 8 characters' },
                      { check: /[a-z]/.test(password) && /[A-Z]/.test(password), text: 'Upper & lowercase letters' },
                      { check: /\d/.test(password), text: 'At least one number' },
                      { check: /[^a-zA-Z0-9]/.test(password), text: 'At least one special character' },
                    ].map((req, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                        {req.check ? (
                          <svg 
                            className="w-4 h-4" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                            style={{ color: '#00A99D' }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg 
                            className="w-4 h-4" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                            style={{ color: '#d4d4d4' }}
                          >
                            <circle cx="12" cy="12" r="10" strokeWidth={2} />
                          </svg>
                        )}
                        <span style={{ color: req.check ? ('#00A99D') : ('#737373') }}>
                          {req.text}
                        </span>
                      </li>
                    ))}
                  </ul>
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
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                style={{ background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)' }}
              >
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={3} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              
              <h1 
                className="text-2xl mb-3"
                style={{ 
                  fontFamily: 'Montserrat Alternates', 
                  fontWeight: 700,
                  color: '#00A99D'
                }}
              >
                Password reset successful!
              </h1>
              
              <p 
                className="text-sm mb-6"
                style={{ 
                  fontFamily: 'Inter', 
                  fontWeight: 500,
                  color: '#5c5652'
                }}
              >
                Your password has been updated. You can now sign in with your new password.
              </p>

              <a 
                href="/login"
                className="inline-block w-full p-3.5 rounded-xl text-white font-semibold transition-all text-center hover:shadow-lg"
                style={{ 
                  fontFamily: 'Montserrat Alternates',
                  background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
                  boxShadow: '0 4px 15px rgba(0, 169, 157, 0.3)',
                }}
              >
                Sign In Now
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