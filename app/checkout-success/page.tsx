'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Verify the session and get customer email
    const verifySession = async () => {
      if (!sessionId) {
        setStatus('success'); // Still show success even without session_id
        return;
      }

      try {
        const response = await fetch(`/api/checkout/verify?session_id=${sessionId}`);
        const data = await response.json();
        
        if (data.email) {
          setEmail(data.email);
        }
        setStatus('success');
      } catch (err) {
        console.error('Session verification error:', err);
        setStatus('success'); // Still show success - webhook will handle account creation
      }
    };

    verifySession();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-[#fffaf3] flex items-center justify-center p-6">
      <div 
        className="max-w-md w-full p-8 text-center"
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '32px',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Logo */}
        <div className="mb-6">
          <Image 
            src="/clemelopy-logo.svg" 
            alt="Clemelopy" 
            width={140} 
            height={36}
            className="mx-auto"
          />
        </div>

        {status === 'loading' ? (
          <>
            <div className="w-16 h-16 mx-auto mb-6">
              <div 
                className="w-full h-full rounded-full animate-spin"
                style={{
                  border: '3px solid rgba(250, 168, 25, 0.2)',
                  borderTopColor: '#FAA819',
                }}
              />
            </div>
            <p 
              className="text-[#525252]"
              style={{ fontFamily: 'Inter', fontWeight: 500 }}
            >
              Confirming your subscription...
            </p>
          </>
        ) : (
          <>
            {/* Success Icon */}
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{
                background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
                boxShadow: '0 8px 24px rgba(0, 169, 157, 0.3)',
              }}
            >
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Title */}
            <h1 
              className="text-2xl text-[#2e2a27] mb-3"
              style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
            >
              Welcome to Clemelopy! 🍊
            </h1>

            {/* Message */}
            <p 
              className="text-[#525252] mb-6 leading-relaxed"
              style={{ fontFamily: 'Inter', fontWeight: 500 }}
            >
              Your subscription is confirmed. 
              {email ? (
                <>
                  <br />
                  <span className="text-[#2e2a27] font-semibold">Check your email at {email}</span>
                </>
              ) : (
                <>
                  <br />
                  <span className="text-[#2e2a27] font-semibold">Check your email</span>
                </>
              )}
              {' '}for a magic link to access your workspace.
            </p>

            {/* Email illustration */}
            <div 
              className="p-4 rounded-xl mb-6"
              style={{
                background: 'rgba(0, 169, 157, 0.1)',
                border: '1px solid rgba(0, 169, 157, 0.2)',
              }}
            >
              <div className="flex items-center justify-center gap-3">
                <svg className="w-8 h-8 text-[#00A99D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span 
                  className="text-sm text-[#00A99D]"
                  style={{ fontFamily: 'Inter', fontWeight: 600 }}
                >
                  Magic link on its way!
                </span>
              </div>
            </div>

            {/* Info */}
            <p 
              className="text-sm text-[#525252]/70 mb-6"
              style={{ fontFamily: 'Inter', fontWeight: 500 }}
            >
              Didn't receive it? Check your spam folder or{' '}
              <Link href="/support" className="text-[#00A99D] hover:underline">
                contact support
              </Link>.
            </p>

            {/* Already have account? */}
            <div 
              className="pt-6 border-t border-[#2e2a27]/10"
            >
              <p 
                className="text-sm text-[#525252]/70 mb-3"
                style={{ fontFamily: 'Inter', fontWeight: 500 }}
              >
                Already have an account?
              </p>
              <Link
                href="/login"
                className="inline-block px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
                style={{
                  fontFamily: 'Montserrat Alternates',
                  background: 'rgba(0, 0, 0, 0.05)',
                  color: '#2e2a27',
                }}
              >
                Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
