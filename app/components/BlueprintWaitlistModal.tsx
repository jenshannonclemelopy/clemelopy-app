'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BlueprintWaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BlueprintWaitlistModal({ isOpen, onClose }: BlueprintWaitlistModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setError('');
      setIsSuccess(false);
    }
  }, [isOpen]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

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

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist');
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Waitlist error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
          onClick={handleBackdropClick}
        >
          {/* Backdrop blur layer */}
          <div 
            className="absolute inset-0"
            style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full transition-all duration-200 hover:scale-110"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
              }}
            >
              <svg className="w-5 h-5" style={{ color: '#1a1a1a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-8">
              {!isSuccess ? (
                <>
                  {/* Icon */}
                  <div 
                    className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                      boxShadow: '0 8px 24px rgba(250, 168, 25, 0.3)',
                    }}
                  >
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="text-center mb-6">
                    <h2 
                      className="text-2xl font-semibold mb-2"
                      style={{ color: '#1a1a1a', fontFamily: 'Montserrat Alternates, sans-serif' }}
                    >
                      GEO Blueprint Coming Soon
                    </h2>
                    <p 
                      className="text-base leading-relaxed"
                      style={{ color: '#1a1a1a', fontFamily: 'Inter, sans-serif', opacity: 0.8 }}
                    >
                      Be the first to know when our comprehensive GEO Blueprint launches. Get early access and exclusive launch pricing.
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        disabled={isLoading}
                        className="w-full px-4 py-3 rounded-xl transition-all duration-300 outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.5)',
                          border: error ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.6)',
                          color: '#1a1a1a',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '15px',
                        }}
                      />
                      {error && (
                        <p className="mt-2 text-sm text-red-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {error}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-300 disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                        fontFamily: 'Montserrat Alternates, sans-serif',
                        fontSize: '15px',
                        boxShadow: '0 4px 14px rgba(250, 168, 25, 0.35)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(250, 168, 25, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(250, 168, 25, 0.35)';
                      }}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle 
                              className="opacity-25" 
                              cx="12" cy="12" r="10" 
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
                          Joining waitlist...
                        </span>
                      ) : (
                        'Notify Me'
                      )}
                    </button>
                  </form>

                  <p 
                    className="mt-4 text-center text-xs"
                    style={{ color: '#1a1a1a', fontFamily: 'Inter, sans-serif', opacity: 0.6 }}
                  >
                    No spam, ever. Unsubscribe anytime.
                  </p>
                </>
              ) : (
                /* Success State */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-4"
                >
                  <div 
                    className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
                      boxShadow: '0 8px 24px rgba(0, 169, 157, 0.3)',
                    }}
                  >
                    <motion.svg 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                      className="w-10 h-10 text-white" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </motion.svg>
                  </div>

                  <h2 
                    className="text-2xl font-semibold mb-2"
                    style={{ color: '#1a1a1a', fontFamily: 'Montserrat Alternates, sans-serif' }}
                  >
                    You're on the list!
                  </h2>
                  <p 
                    className="text-base mb-6"
                    style={{ color: '#1a1a1a', fontFamily: 'Inter, sans-serif', opacity: 0.8 }}
                  >
                    We'll let you know the moment GEO Blueprint is ready. Keep an eye on your inbox!
                  </p>

                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl font-medium transition-all duration-200 hover:scale-105"
                    style={{
                      background: 'rgba(255, 255, 255, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.6)',
                      color: '#1a1a1a',
                      fontFamily: 'Montserrat Alternates, sans-serif',
                      fontSize: '14px',
                    }}
                  >
                    Got it
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
