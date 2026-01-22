'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const defaultPreferences = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState(defaultPreferences);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    } else {
      try {
        const saved = JSON.parse(consent);
        setPreferences(saved);
      } catch {
        setIsVisible(true);
      }
    }
  }, []);

  const savePreferences = (prefs: typeof defaultPreferences) => {
    localStorage.setItem('cookie-consent', JSON.stringify(prefs));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setPreferences(prefs);
    setIsVisible(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    savePreferences({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
  };

  const rejectAll = () => {
    savePreferences({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
  };

  const saveCustomPreferences = () => {
    savePreferences(preferences);
  };

  const togglePreference = (key: keyof typeof defaultPreferences) => {
    if (key === 'necessary') return;
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[998] bg-black/20 backdrop-blur-sm"
        aria-hidden="true"
      />
      
      {/* Banner */}
      <div 
        className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 z-[999] max-w-4xl mx-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-banner-title"
      >
        <div
          className="p-6 md:p-8"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          }}
        >
          {!showSettings ? (
            // Main Banner View
            <div>
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-6">
                <div className="text-4xl md:text-5xl flex-shrink-0">🍪</div>
                <div>
                  <h3 
                    id="cookie-banner-title"
                    className="text-lg md:text-xl text-[#2e2a27] mb-2"
                    style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
                  >
                    We value your privacy
                  </h3>
                  <p 
                    className="text-[#5c5652] text-sm md:text-base leading-relaxed"
                    style={{ fontFamily: 'Inter', fontWeight: 500 }}
                  >
                    We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
                    By clicking &quot;Accept All&quot;, you consent to our use of cookies. 
                    Read our{' '}
                    <Link 
                      href="https://clemelopy.com/cookies" 
                      className="text-[#00A99D] hover:text-[#0D7871] underline decoration-[#00A99D]/30 hover:decoration-[#0D7871] transition-colors"
                    >
                      Cookie Policy
                    </Link>
                    {' '}to learn more.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setShowSettings(true)}
                  className="px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    background: 'rgba(255, 255, 255, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                    color: '#5c5652',
                  }}
                >
                  Cookie Settings
                </button>
                <button 
                  onClick={rejectAll}
                  className="px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    background: 'rgba(255, 255, 255, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                    color: '#5c5652',
                  }}
                >
                  Reject All
                </button>
                <button 
                  onClick={acceptAll}
                  className="px-5 py-3 rounded-xl text-sm text-white font-semibold transition-all hover:scale-[1.02] sm:ml-auto"
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                    boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
                  }}
                >
                  Accept All
                </button>
              </div>
            </div>
          ) : (
            // Settings View
            <div>
              <div className="mb-6">
                <h3 
                  className="text-lg md:text-xl text-[#2e2a27] mb-2"
                  style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
                >
                  Cookie Preferences
                </h3>
                <p 
                  className="text-[#5c5652] text-sm"
                  style={{ fontFamily: 'Inter', fontWeight: 500 }}
                >
                  Manage your cookie preferences below. You can enable or disable different types of cookies.
                </p>
              </div>
              
              <div className="space-y-4 mb-6">
                {/* Necessary Cookies */}
                <div 
                  className="p-4 rounded-xl"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 
                        className="text-[#2e2a27] text-sm mb-1"
                        style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                      >
                        Strictly Necessary
                      </h4>
                      <p 
                        className="text-[#5c5652] text-xs"
                        style={{ fontFamily: 'Inter', fontWeight: 500 }}
                      >
                        Essential for the website to function properly. These cannot be disabled.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-not-allowed opacity-60">
                      <input 
                        type="checkbox" 
                        checked={true} 
                        disabled 
                        className="sr-only peer"
                      />
                      <div 
                        className="w-11 h-6 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                        style={{ background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)' }}
                      />
                    </label>
                  </div>
                </div>

                {/* Functional Cookies */}
                <div 
                  className="p-4 rounded-xl"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 
                        className="text-[#2e2a27] text-sm mb-1"
                        style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                      >
                        Functional
                      </h4>
                      <p 
                        className="text-[#5c5652] text-xs"
                        style={{ fontFamily: 'Inter', fontWeight: 500 }}
                      >
                        Remember your preferences and settings for a better experience.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={preferences.functional} 
                        onChange={() => togglePreference('functional')}
                        className="sr-only peer"
                      />
                      <div 
                        className="w-11 h-6 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"
                        style={{ 
                          background: preferences.functional 
                            ? 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)' 
                            : 'rgba(0, 0, 0, 0.2)'
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div 
                  className="p-4 rounded-xl"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 
                        className="text-[#2e2a27] text-sm mb-1"
                        style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                      >
                        Analytics
                      </h4>
                      <p 
                        className="text-[#5c5652] text-xs"
                        style={{ fontFamily: 'Inter', fontWeight: 500 }}
                      >
                        Help us understand how visitors interact with our website.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={preferences.analytics} 
                        onChange={() => togglePreference('analytics')}
                        className="sr-only peer"
                      />
                      <div 
                        className="w-11 h-6 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"
                        style={{ 
                          background: preferences.analytics 
                            ? 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)' 
                            : 'rgba(0, 0, 0, 0.2)'
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div 
                  className="p-4 rounded-xl"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 
                        className="text-[#2e2a27] text-sm mb-1"
                        style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                      >
                        Marketing
                      </h4>
                      <p 
                        className="text-[#5c5652] text-xs"
                        style={{ fontFamily: 'Inter', fontWeight: 500 }}
                      >
                        Used to deliver relevant advertisements and track campaign effectiveness.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={preferences.marketing} 
                        onChange={() => togglePreference('marketing')}
                        className="sr-only peer"
                      />
                      <div 
                        className="w-11 h-6 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"
                        style={{ 
                          background: preferences.marketing 
                            ? 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)' 
                            : 'rgba(0, 0, 0, 0.2)'
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    background: 'rgba(255, 255, 255, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                    color: '#5c5652',
                  }}
                >
                  ← Back
                </button>
                <div className="flex flex-col sm:flex-row gap-3 sm:ml-auto">
                  <button 
                    onClick={rejectAll}
                    className="px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                    style={{ 
                      fontFamily: 'Montserrat Alternates',
                      background: 'rgba(255, 255, 255, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.8)',
                      color: '#5c5652',
                    }}
                  >
                    Reject All
                  </button>
                  <button 
                    onClick={saveCustomPreferences}
                    className="px-5 py-3 rounded-xl text-sm text-white font-semibold transition-all hover:scale-[1.02]"
                    style={{ 
                      fontFamily: 'Montserrat Alternates',
                      background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                      boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
                    }}
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
