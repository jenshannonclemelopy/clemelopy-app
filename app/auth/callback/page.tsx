'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('Authenticating...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatusMessage('Verifying your account...');
        
        // Get the session from the URL hash (Supabase puts tokens there after OAuth)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setStatus('error');
          setErrorMessage(sessionError.message);
          return;
        }

        if (!session) {
          // No session yet, wait a moment and try again (OAuth redirect can be slow)
          setStatusMessage('Completing sign-in...');
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const { data: { session: retrySession }, error: retryError } = await supabase.auth.getSession();
          
          if (retryError || !retrySession) {
            console.error('No session found after retry');
            setStatus('error');
            setErrorMessage('Authentication failed. Please try again.');
            return;
          }
          
          await handleUserSetup(retrySession);
          return;
        }

        await handleUserSetup(session);
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    };

    const handleUserSetup = async (session: any) => {
      const userId = session.user.id;
      const email = session.user.email || '';

      setStatusMessage('Setting up your account...');

      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, onboarding_completed')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 = no rows returned (new user), other errors are real errors
        console.error('Profile fetch error:', profileError);
      }

      const isNewUser = !profile;

      if (isNewUser) {
        setStatusMessage('Creating your profile...');
        
        // New user - create profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            first_name: session.user.user_metadata?.first_name || session.user.user_metadata?.full_name?.split(' ')[0] || null,
            last_name: session.user.user_metadata?.last_name || session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || null,
            avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
            onboarding_completed: 'false',
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Profile creation error:', insertError);
          // Don't block - they can still proceed
        }
      }

      // Initialize license (handles free trial eligibility check atomically)
      setStatusMessage('Preparing your workspace...');
      
      try {
        const response = await fetch('/api/auth/init-license', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('License init error:', errorData);
          // Don't block - let them continue (they just might not get free runs)
        } else {
          const licenseData = await response.json();
          console.log('License initialized:', {
            status: licenseData.status,
            runsGranted: licenseData.free_trial?.runs,
          });
          
          // Could show a toast/notification about free runs here
          if (licenseData.free_trial?.granted) {
            console.log(`🎉 ${licenseData.free_trial.runs} free runs granted!`);
          } else if (licenseData.free_trial?.message) {
            console.log('Free trial status:', licenseData.free_trial.message);
          }
        }
      } catch (err) {
        console.error('License init fetch error:', err);
        // Don't block - let them continue
      }

      // Redirect based on onboarding status
      setStatusMessage('Almost there...');
      
      // Small delay so user sees the final message
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (isNewUser || profile?.onboarding_completed !== 'true') {
        window.location.href = '/onboarding';
      } else {
        window.location.href = '/';
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAA819] via-[#E99502] to-[#00A99D] flex items-center justify-center p-4">
      {/* Live region for screen readers */}
      <div 
        role="status" 
        aria-live="polite" 
        className="sr-only"
      >
        {status === 'loading' ? statusMessage : `Error: ${errorMessage}`}
      </div>
      
      <main 
        className="p-8 max-w-md w-full text-center"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
        role="region"
        aria-labelledby={status === 'error' ? 'error-heading' : undefined}
      >
        <div className="mb-6">
          <img 
            src="/clemelopy-logo.svg" 
            alt="Clemelopy" 
            className="h-10 mx-auto"
          />
        </div>

        {status === 'loading' ? (
          <>
            {/* Animated loader */}
            <div 
              className="relative w-16 h-16 mx-auto mb-6"
              aria-hidden="true"
            >
              <div 
                className="absolute inset-0 rounded-full animate-spin"
                style={{
                  border: '3px solid rgba(250, 168, 25, 0.2)',
                  borderTopColor: '#FAA819',
                }}
              />
              <div 
                className="absolute inset-2 rounded-full animate-spin"
                style={{
                  border: '3px solid rgba(0, 169, 157, 0.2)',
                  borderTopColor: '#00A99D',
                  animationDirection: 'reverse',
                  animationDuration: '1.5s',
                }}
              />
            </div>
            
            <p 
              className="text-lg text-[#2e2a27]"
              style={{ fontFamily: 'Inter', fontWeight: 500 }}
            >
              {statusMessage}
            </p>
            
            <p 
              className="mt-2 text-sm text-[#5c5652]"
              style={{ fontFamily: 'Inter', fontWeight: 400 }}
            >
              This will only take a moment
            </p>
          </>
        ) : (
          <>
            {/* Error state */}
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(239, 68, 68, 0.1)' }}
              aria-hidden="true"
            >
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h2 
              id="error-heading"
              className="text-xl mb-3 text-[#2e2a27]"
              style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
            >
              Authentication Error
            </h2>
            
            <p 
              className="mb-6 text-[#5c5652]"
              style={{ fontFamily: 'Inter', fontWeight: 500 }}
              role="alert"
            >
              {errorMessage}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.href = '/login'}
                className="px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#FAA819] focus:ring-offset-2"
                style={{ 
                  fontFamily: 'Montserrat Alternates',
                  background: 'linear-gradient(135deg, #FAA819, #E99502)',
                  boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
                }}
              >
                Try Again
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 rounded-xl font-semibold transition-all hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2"
                style={{ 
                  fontFamily: 'Montserrat Alternates',
                  background: 'rgba(255, 255, 255, 0.5)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  color: '#2e2a27',
                }}
              >
                Go Home
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}