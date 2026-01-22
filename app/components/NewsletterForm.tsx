'use client';

import { useState, useEffect, useRef } from 'react';

interface NewsletterFormProps {
  heading?: string;
  description?: string;
  buttonText?: string;
  successHeading?: string;
  successMessage?: string;
  variant?: 'card' | 'inline' | 'minimal';
}

export default function NewsletterForm({
  heading = "Stay in the loop",
  description = "Get GEO tips, product updates, and exclusive offers delivered to your inbox.",
  buttonText = "Subscribe",
  successHeading = "You're in!",
  successMessage = "Thanks for subscribing. Keep an eye on your inbox!",
  variant = 'card'
}: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const mlFormLoaded = useRef(false);

  // Load MailerLite universal script
  useEffect(() => {
    if (mlFormLoaded.current) return;
    
    // Add the universal script
    const script = document.createElement('script');
    script.src = 'https://assets.mailerlite.com/js/universal.js';
    script.async = true;
    script.onload = () => {
      // Initialize MailerLite account
      if (typeof window !== 'undefined' && (window as any).ml) {
        (window as any).ml('account', '1879470');
      }
    };
    document.body.appendChild(script);
    mlFormLoaded.current = true;

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Watch for MailerLite success
  useEffect(() => {
    // Create a MutationObserver to watch for the success state
    const observer = new MutationObserver((mutations) => {
      const successDiv = document.querySelector('.ml-subscribe-form-34867304 .row-success');
      if (successDiv && window.getComputedStyle(successDiv).display !== 'none') {
        setIsSuccess(true);
        setIsLoading(false);
      }
    });

    const checkForForm = setInterval(() => {
      const formContainer = document.querySelector('.ml-subscribe-form-34867304');
      if (formContainer) {
        observer.observe(formContainer, { attributes: true, subtree: true, attributeFilter: ['style'] });
        clearInterval(checkForForm);
      }
    }, 100);

    return () => {
      observer.disconnect();
      clearInterval(checkForForm);
    };
  }, []);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    // Find MailerLite's hidden form elements and submit
    try {
      const mlInput = document.querySelector('.ml-subscribe-form-34867304 input[name="fields[email]"]') as HTMLInputElement;
      const mlButton = document.querySelector('.ml-subscribe-form-34867304 button[type="submit"]') as HTMLButtonElement;

      if (mlInput && mlButton) {
        mlInput.value = email;
        
        // Trigger input event so MailerLite registers the value
        mlInput.dispatchEvent(new Event('input', { bubbles: true }));
        mlInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Small delay then click submit
        setTimeout(() => {
          mlButton.click();
        }, 100);

        // Set a timeout to check if something went wrong
        setTimeout(() => {
          if (isLoading && !isSuccess) {
            setIsLoading(false);
            setError('Something went wrong. Please try again.');
          }
        }, 10000);
      } else {
        setError('Form not loaded yet. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  // Base styles for all variants
  const baseInputStyles = `
    w-full px-4 py-3 
    bg-white/50 backdrop-blur-sm
    border border-white/40 
    rounded-xl
    font-inter text-gray-800 
    placeholder:text-gray-400
    focus:outline-none focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D]/50
    transition-all duration-300
  `;

  const baseButtonStyles = `
    px-6 py-3
    bg-gradient-to-r from-[#FAA819] to-[#E99502]
    hover:from-[#E99502] hover:to-[#d88a02]
    text-white font-semibold
    rounded-xl
    transition-all duration-300
    hover:shadow-lg hover:shadow-orange-500/25
    hover:-translate-y-0.5
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
  `;

  // Card variant (glassmorphic card)
  if (variant === 'card') {
    return (
      <>
        {/* Hidden MailerLite form */}
        <div className="hidden" aria-hidden="true">
          <div className="ml-embedded" data-form="j8nGRs"></div>
        </div>

        {/* Your styled form */}
        <div className="relative p-8 rounded-3xl bg-white/25 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          {!isSuccess ? (
            <>
              {heading && (
                <h3 className="text-2xl font-semibold text-gray-800 mb-2 font-montserrat">
                  {heading}
                </h3>
              )}
              {description && (
                <p className="text-gray-600 mb-6 font-inter">
                  {description}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className={baseInputStyles}
                    disabled={isLoading}
                  />
                  {error && (
                    <p className="mt-2 text-sm text-red-500 font-inter">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full ${baseButtonStyles}`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle 
                          className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4"
                          fill="none"
                        />
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Subscribing...
                    </span>
                  ) : buttonText}
                </button>
              </form>

              <p className="mt-4 text-xs text-gray-500 font-inter">
                No spam, ever. Unsubscribe anytime.
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-linear-to-br from-[#00A99D] to-[#0D7871] flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-2 font-montserrat">
                {successHeading}
              </h3>
              <p className="text-gray-600 font-inter">
                {successMessage}
              </p>
            </div>
          )}
        </div>
      </>
    );
  }

  // Inline variant (horizontal layout for headers/footers)
  if (variant === 'inline') {
    return (
      <>
        {/* Hidden MailerLite form */}
        <div className="hidden" aria-hidden="true">
          <div className="ml-embedded" data-form="j8nGRs"></div>
        </div>

        {/* Your styled form */}
        <div className="w-full">
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className={`${baseInputStyles} ${error ? 'border-red-400' : ''}`}
                  disabled={isLoading}
                />
                {error && (
                  <p className="mt-1 text-sm text-red-500 font-inter">{error}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className={`${baseButtonStyles} whitespace-nowrap`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                        fill="none"
                      />
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span className="sr-only">Subscribing...</span>
                  </span>
                ) : buttonText}
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-3 text-[#00A99D]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-semibold font-inter">{successHeading}</span>
            </div>
          )}
        </div>
      </>
    );
  }

  // Minimal variant (just input and button, no container styling)
  return (
    <>
      {/* Hidden MailerLite form */}
      <div className="hidden" aria-hidden="true">
        <div className="ml-embedded" data-form="j8nGRs"></div>
      </div>

      {/* Your styled form */}
      {!isSuccess ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className={`${baseInputStyles} ${error ? 'border-red-400' : ''}`}
            disabled={isLoading}
          />
          {error && (
            <p className="text-sm text-red-500 font-inter">{error}</p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full ${baseButtonStyles}`}
          >
            {isLoading ? 'Subscribing...' : buttonText}
          </button>
        </form>
      ) : (
        <p className="text-[#00A99D] font-semibold font-inter flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successHeading}
        </p>
      )}
    </>
  );
}
