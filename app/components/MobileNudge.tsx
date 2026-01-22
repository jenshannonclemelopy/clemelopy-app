'use client';

import React, { useState, useEffect } from 'react';

export default function MobileNudge() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    const dismissed = sessionStorage.getItem('mobileNudgeDismissed');
    if (dismissed) return;

    // Only show on mobile screens
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setIsVisible(true);
      }
    };

    checkMobile();
    // Don't add resize listener - only check on mount
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('mobileNudgeDismissed', 'true');
    setIsVisible(false);
  };

  const handleSendReminder = async () => {
    if (!email) return;
    
    setIsSending(true);
    // For now, just simulate sending - you can hook this up to your email service later
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSent(true);
    setIsSending(false);
    
    // Auto dismiss after showing success
    setTimeout(() => {
      handleDismiss();
    }, 2000);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-slide-up">
        {/* Gradient bar */}
        <div className="h-1 bg-gradient-to-r from-[#FAA819] via-[#E99502] to-[#00A99D]" />
        
        <div className="p-6">
          {/* Icon */}
          <div className="w-14 h-14 bg-linear-to-br from-[#FAA819] to-[#E99502] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#FAA819]/20">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-[#00A99D]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#00A99D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p 
                className="text-[#1a1a1a] font-medium"
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
              >
                Reminder sent!
              </p>
              <p 
                className="text-sm text-[#1a1a1a]/60 mt-1"
                style={{ fontFamily: 'Inter', fontWeight: 500 }}
              >
                Check your inbox 📬
              </p>
            </div>
          ) : (
            <>
              {/* Content */}
              <h2 
                className="text-lg text-[#1a1a1a] text-center mb-2"
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
              >
                Clemelopy works best on desktop 🖥️
              </h2>
              <p 
                className="text-sm text-[#1a1a1a]/70 text-center mb-6 leading-relaxed"
                style={{ fontFamily: 'Inter', fontWeight: 500 }}
              >
                For the best experience creating and reviewing your linking strategies, we recommend using a laptop or desktop.
              </p>

              {/* Email reminder option */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email me a reminder"
                    className="flex-1 px-4 py-2.5 rounded-xl border-2 border-[#dedede] bg-[#fffaf3] text-[#1a1a1a] text-sm placeholder-[#6b6560] focus:outline-none focus:border-[#FAA819] transition-colors"
                    style={{ fontFamily: 'Inter', fontWeight: 500 }}
                  />
                  <button
                    onClick={handleSendReminder}
                    disabled={!email || isSending}
                    className="px-4 py-2.5 bg-[#00A99D] hover:bg-[#0D7871] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                  >
                    {isSending ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : 'Send'}
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[#dedede]"></div>
                <span className="text-xs text-[#1a1a1a]/40" style={{ fontFamily: 'Inter', fontWeight: 500 }}>or</span>
                <div className="flex-1 h-px bg-[#dedede]"></div>
              </div>

              {/* Continue anyway */}
              <button
                onClick={handleDismiss}
                className="w-full py-3 rounded-xl border-2 border-[#dedede] text-[#1a1a1a] text-sm font-medium hover:bg-[#fffaf3] hover:border-[#FAA819]/50 transition-all"
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
              >
                Continue on mobile anyway
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}