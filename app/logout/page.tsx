'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';

export default function Logout() {
  const { signOut } = useAuth();
  const [showMessage, setShowMessage] = useState(false);
  const [showSubtext, setShowSubtext] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    // Set year on client side to avoid hydration mismatch
    setCurrentYear(new Date().getFullYear());
    
    // Sign out from Supabase immediately
    const performSignOut = async () => {
      try {
        await signOut();
      } catch (error) {
        console.error('Error signing out:', error);
      }
    };
    performSignOut();

    // Trigger animations
    const timer1 = setTimeout(() => setShowMessage(true), 100);
    const timer2 = setTimeout(() => setShowSubtext(true), 500);
    const timer3 = setTimeout(() => setRedirecting(true), 2000);
    
    // Redirect to login after 5 seconds
    const redirectTimer = setTimeout(() => {
      window.location.href = '/login';
    }, 5000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(redirectTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        {/* Live region for screen readers to announce logout status */}
        <div 
          role="status" 
          aria-live="polite" 
          className="sr-only"
        >
          {showMessage && 'You have been signed out successfully.'}
          {redirecting && 'Redirecting to login page.'}
        </div>

        <div className="w-full max-w-md text-center">
          {/* Logo */}
          <div 
            className={`mb-8 transition-all duration-700 ${showMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
          >
            <img 
              src="/clemelopy-logo.svg" 
              alt="Clemelopy" 
              className="h-12 mx-auto"
            />
          </div>

          {/* Main Message */}
          <div 
            className={`mb-4 transition-all duration-700 ${showMessage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <h1 
              id="logout-heading"
              className="text-3xl md:text-4xl"
              style={{ 
                fontFamily: 'Montserrat Alternates', 
                fontWeight: 700,
                color: '#1a1a1a'
              }}
            >
              See you next time!
            </h1>
          </div>

          {/* Subtext */}
          <div 
            className={`transition-all duration-700 delay-300 ${showSubtext ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <p 
              className="text-lg md:text-xl"
              style={{ 
                fontFamily: 'Inter', 
                fontWeight: 500,
                color: '#5c5652'
              }}
            >
              Until then, keep growing forward! 🌱
            </p>
          </div>

          {/* Redirecting message */}
          <div 
            className={`mt-10 transition-all duration-700 delay-500 ${redirecting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            aria-hidden={!redirecting}
          >
            <p 
              className="text-sm flex items-center justify-center gap-2"
              style={{ 
                fontFamily: 'Inter', 
                fontWeight: 500,
                color: '#6b6560'
              }}
            >
              <svg 
                className="w-4 h-4 animate-spin" 
                fill="none" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Redirecting to login...
            </p>
          </div>

          {/* Manual link */}
          <div 
            className={`mt-3 transition-all duration-700 delay-500 ${redirecting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <a 
              href="/login"
              className="text-sm underline underline-offset-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2 rounded"
              style={{ 
                fontFamily: 'Inter', 
                fontWeight: 500,
                color: '#00A99D'
              }}
            >
              Click here if you're not redirected
            </a>
          </div>

          {/* Footer */}
          <footer 
            className="mt-16 text-sm" 
            style={{ 
              fontFamily: 'Inter', 
              fontWeight: 500, 
              color: '#737373' 
            }}
          >
            <p>
              © {currentYear || new Date().getFullYear()} Clemelopy<span aria-label=" Trademark">™</span> All Rights Reserved.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}