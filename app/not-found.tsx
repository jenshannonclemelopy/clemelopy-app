'use client';

import React from 'react';
import { Montserrat_Alternates, Inter } from 'next/font/google';
import AuthLayout from './components/AuthLayout';

const montserratAlternates = Montserrat_Alternates({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export default function NotFound() {
  return (
    <AuthLayout>
      <main className="w-full max-w-md mx-auto text-center">
        {/* Lost Clementine Illustration */}
        <div className="animate-float mb-8">
          <div className="relative inline-block">
            {/* Big 404 */}
            <div 
              className={`text-[150px] md:text-[200px] font-bold leading-none select-none ${montserratAlternates.className}`}
              style={{ 
                background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
              aria-hidden="true"
            >
              404
            </div>
            {/* Clementine on top */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-wiggle"
              aria-hidden="true"
            >
              <div className="text-8xl md:text-9xl">🍊</div>
            </div>
          </div>
        </div>

        {/* Message Card */}
        <div 
          className="p-8"
          style={{ 
            background: 'rgba(255, 255, 255, 0.7)', 
            backdropFilter: 'blur(20px)', 
            WebkitBackdropFilter: 'blur(20px)', 
            border: '1px solid rgba(255, 255, 255, 0.4)', 
            borderRadius: '32px', 
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' 
          }}
          role="region"
          aria-labelledby="error-heading"
        >
          <img 
            src="/clemelopy-logo.svg" 
            alt="Clemelopy" 
            className="h-10 mx-auto mb-6"
          />
          
          <h1 
            id="error-heading"
            className={`text-2xl text-[#00A99D] mb-3 font-bold ${montserratAlternates.className}`}
          >
            Oops! Page not found
          </h1>
          
          <p 
            className={`text-[#5c5652] mb-6 font-medium ${inter.className}`}
          >
            Looks like this clementine rolled away! The page you're looking for doesn't exist or has been moved.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <a 
              href="/"
              className={`flex-1 py-3 px-6 rounded-xl text-white font-semibold transition-all text-center hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#FAA819] focus:ring-offset-2 ${montserratAlternates.className}`}
              style={{ 
                background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
              }}
            >
              Go to Dashboard
            </a>
            <button 
              onClick={() => window.history.back()}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2 ${montserratAlternates.className}`}
              style={{ 
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                color: '#2e2a27',
              }}
            >
              Go Back
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className={`mt-8 text-center ${inter.className}`}>
          <p className="text-[#5c5652] text-sm font-medium mb-3">
            ©2025 Clemelopy™ All Rights Reserved.
          </p>
          <nav aria-label="Legal links">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              <a 
                href="https://clemelopy.com/privacy"
                className="text-[#5c5652] hover:text-[#0D7871] text-xs font-medium transition-colors underline decoration-[#5c5652]/30 hover:decoration-[#0D7871]"
              >
                Privacy Policy
              </a>
              <a 
                href="https://clemelopy.com/terms"
                className="text-[#5c5652] hover:text-[#0D7871] text-xs font-medium transition-colors underline decoration-[#5c5652]/30 hover:decoration-[#0D7871]"
              >
                Terms of Use
              </a>
              <a 
                href="https://clemelopy.com/aiterms"
                className="text-[#5c5652] hover:text-[#0D7871] text-xs font-medium transition-colors underline decoration-[#5c5652]/30 hover:decoration-[#0D7871]"
              >
                AI Supplemental Terms
              </a>
              <a 
                href="https://clemelopy.com/accessibility"
                className="text-[#5c5652] hover:text-[#0D7871] text-xs font-medium transition-colors underline decoration-[#5c5652]/30 hover:decoration-[#0D7871]"
              >
                Accessibility
              </a>
            </div>
          </nav>
        </footer>
      </main>
    </AuthLayout>
  );
}