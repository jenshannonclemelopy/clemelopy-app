'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

interface SchemaRunLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SchemaRunLimitModal({ isOpen, onClose }: SchemaRunLimitModalProps) {
  const { user } = useAuth();
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const generateTicketNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `CLM-${year}-${random}`;
  };

  const handleRequestMore = async () => {
    if (!user) {
      setError('You must be logged in to request more runs.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const ticketNumber = generateTicketNumber();
    const customerEmail = user.email || 'anonymous@unknown.com';
    const customerName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

    try {
      // Create support ticket
      const { error: insertError } = await supabase
        .from('support_tickets')
        .insert({
          ticket_number: ticketNumber,
          subject: 'Schema Studio - Request More Runs',
          message: `User has used their 10 Schema Studio runs this month and is requesting 10 more.\n\n${note ? `Note from user: ${note}` : 'No additional note provided.'}`,
          category: 'feature_request',
          priority: 'low',
          status: 'open',
          user_email: customerEmail,
          user_name: customerName,
          user_id: user.id,
        });

      if (insertError) {
        throw insertError;
      }

      // Optionally send email notification
      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ticket_created',
            data: {
              customerEmail: customerEmail,
              customerName: customerName,
              ticketNumber: ticketNumber,
              subject: 'Schema Studio - Request More Runs',
              message: `User has used their 10 Schema Studio runs this month and is requesting 10 more.\n\n${note ? `Note from user: ${note}` : 'No additional note provided.'}`,
              category: 'feature_request',
              priority: 'low',
            },
          }),
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't block on email failure
      }

      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Failed to submit request:', err);
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNote('');
    setIsSubmitted(false);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleClose}
    >
      <div 
        className="relative w-full max-w-md rounded-2xl p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {!isSubmitted ? (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <span className="text-5xl mb-4 block">🎉</span>
              <h2 
                className="text-2xl mb-2"
                style={{ 
                  fontFamily: 'Montserrat Alternates', 
                  fontWeight: 700,
                  color: '#1a1a1a'
                }}
              >
                You've been busy!
              </h2>
              <p 
                className="text-base"
                style={{ 
                  fontFamily: 'Inter', 
                  fontWeight: 500,
                  color: '#4a4642',
                  lineHeight: 1.6
                }}
              >
                You've used 10 Schema Studio generations this month. Need more? Just let us know — we're happy to add 10 more for free to your account.
              </p>
            </div>

            {/* Optional Note */}
            <div className="mb-6">
              <label 
                className="block text-sm mb-2"
                style={{ 
                  fontFamily: 'Inter', 
                  fontWeight: 500,
                  color: '#4a4642'
                }}
              >
                Anything you'd like us to know? (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="E.g., I'm working on a big project..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-base resize-none focus:outline-none transition-all"
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 500,
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  color: '#1a1a1a',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#00A99D';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 169, 157, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div 
                className="mb-4 p-3 rounded-lg text-sm"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  fontFamily: 'Inter',
                  fontWeight: 500,
                }}
              >
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all hover:shadow-md"
                style={{
                  fontFamily: 'Montserrat Alternates',
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  color: '#4a4642',
                }}
              >
                Maybe Later
              </button>
              <button
                onClick={handleRequestMore}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl text-white font-semibold transition-all hover:shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
                style={{
                  fontFamily: 'Montserrat Alternates',
                  background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Requesting...
                  </>
                ) : (
                  'Request More Runs'
                )}
              </button>
            </div>
          </>
        ) : (
          /* Success State */
          <div className="text-center py-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #00A99D, #0D7871)' }}
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 
              className="text-xl mb-2"
              style={{ 
                fontFamily: 'Montserrat Alternates', 
                fontWeight: 700,
                color: '#00A99D'
              }}
            >
              Request Submitted!
            </h2>
            
            <p 
              className="text-base mb-6"
              style={{ 
                fontFamily: 'Inter', 
                fontWeight: 500,
                color: '#4a4642',
                lineHeight: 1.6
              }}
            >
              We'll add 10 more runs to your account shortly. You'll receive an email confirmation.
            </p>

            <button
              onClick={handleClose}
              className="py-3 px-8 rounded-xl text-white font-semibold transition-all hover:shadow-lg"
              style={{
                fontFamily: 'Montserrat Alternates',
                background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
              }}
            >
              Got It!
            </button>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full transition-all hover:bg-black/5"
          style={{ color: '#9ca3af' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
