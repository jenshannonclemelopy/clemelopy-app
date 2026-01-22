'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';

const WORKER_URL = 'https://linking-strategy-map.jen-86f.workers.dev';

export default function PricingPage() {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  // Check if user is a subscriber
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user?.email) {
        setCheckingSubscription(false);
        return;
      }

      try {
        const { data: license } = await supabase
          .from('licenses')
          .select('plan, status')
          .eq('email', user.email)
          .single();

        // User is a subscriber if they have an active subscription plan
        const hasActiveSubscription = license?.plan === 'subscription' && license?.status === 'active';
        setIsSubscriber(hasActiveSubscription);
      } catch (err) {
        console.error('Error checking subscription:', err);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [user?.email]);

  const handleCheckout = async (priceType: 'monthly' | 'annual' | 'pack') => {
    if (!user || !session) {
      alert('Please sign in first');
      return;
    }

    // Prevent pack purchase if not a subscriber
    if (priceType === 'pack' && !isSubscriber) {
      alert('Please subscribe first to purchase additional packs.');
      return;
    }

    setLoading(priceType);

    try {
      const response = await fetch(`${WORKER_URL}/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          priceType,
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  // Glassmorphic card style
  const glassCard = {
    background: 'rgba(255, 255, 255, 0.65)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    borderRadius: '24px',
  };

  return (
    <Layout activeNav="settings">
      {/* Skip to main content link */}
      <a 
        href="#pricing-main" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-[#005a54] focus:rounded-lg focus:font-semibold"
        style={{ fontFamily: 'Montserrat Alternates' }}
      >
        Skip to main content
      </a>

      <main id="pricing-main" role="main">
        {/* Header - Frosted Glass Container */}
        <header 
          className="rounded-2xl p-8 mb-8 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.05) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          }}
        >
          <h1 
            className="text-3xl lg:text-4xl mb-2" 
            style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
          >
            <span style={{ color: '#1a1a1a' }}>Choose your </span>
            <span 
              style={{ 
                background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              plan
            </span>
          </h1>
          <p 
            className="text-base max-w-2xl mx-auto"
            style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
          >
            Get more GEO Linking Strategy Maps
          </p>
        </header>

        {/* Main Glassmorphic Container */}
        <div 
          style={{ 
            background: 'rgba(255, 255, 255, 0.35)', 
            backdropFilter: 'blur(20px)', 
            WebkitBackdropFilter: 'blur(20px)', 
            border: '1px solid rgba(255, 255, 255, 0.4)', 
            borderRadius: '32px', 
            padding: '32px', 
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' 
          }}
        >
          {/* Subscription Plans */}
          <div className={`grid ${isSubscriber ? 'md:grid-cols-1 max-w-md' : 'md:grid-cols-2 max-w-4xl'} gap-8 mx-auto`}>
            
            {/* Monthly Plan - Only show if NOT already a subscriber */}
            {!isSubscriber && (
              <section 
                style={{ ...glassCard, border: '2px solid #0D7871', padding: '32px' }}
                aria-labelledby="monthly-plan-heading"
              >
                <div className="text-center mb-6">
                  <span 
                    className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
                    style={{ 
                      background: 'rgba(0, 169, 157, 0.15)',
                      color: '#006b63',
                      fontFamily: 'Montserrat Alternates',
                    }}
                  >
                    MOST POPULAR
                  </span>
                  <h2 
                    id="monthly-plan-heading"
                    className="text-2xl mb-2"
                    style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700, color: '#1a1a1a' }}
                  >
                    Monthly
                  </h2>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-xl line-through" style={{ fontFamily: 'Montserrat Alternates', color: '#6b6560' }}>$59</span>
                    <span className="text-4xl font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>$29</span>
                    <span style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>/month</span>
                  </div>
                  <p 
                    className="text-sm mt-2"
                    style={{ fontFamily: 'Inter', fontWeight: 600, color: '#0D7871' }}
                  >
                    🍊 Founding member pricing
                  </p>
                </div>

                <ul className="space-y-3 mb-8" aria-label="Monthly plan features">
                  {['Up to 8 maps per month', 'Resets every month', 'Cancel anytime', 'Access to bonus packs'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#1a1a1a' }}>
                      <svg className="w-5 h-5 shrink-0" style={{ color: '#0D7871' }} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout('monthly')}
                  disabled={loading === 'monthly'}
                  className="w-full py-3 rounded-xl font-semibold transition-all disabled:opacity-50 hover:scale-105"
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    background: 'linear-gradient(135deg, #0D7871 0%, #065f5b 100%)',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(0, 169, 157, 0.3)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.outline = '2px solid #005a54';
                    e.currentTarget.style.outlineOffset = '2px';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.outlineOffset = '0';
                  }}
                  aria-busy={loading === 'monthly'}
                >
                  {loading === 'monthly' ? 'Loading...' : 'Subscribe Now'}
                </button>
              </section>
            )}

            {/* Annual Plan - Only show if NOT already a subscriber */}
            {!isSubscriber && (
              <section 
                style={{ ...glassCard, padding: '32px' }}
                aria-labelledby="annual-plan-heading"
              >
                <div className="text-center mb-6">
                  <span 
                    className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
                    style={{ 
                      background: 'rgba(219, 39, 119, 0.15)',
                      color: '#db2777',
                      fontFamily: 'Montserrat Alternates',
                    }}
                  >
                    BEST VALUE
                  </span>
                  <h2 
                    id="annual-plan-heading"
                    className="text-2xl mb-2"
                    style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700, color: '#1a1a1a' }}
                  >
                    Annual
                  </h2>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-xl line-through" style={{ fontFamily: 'Montserrat Alternates', color: '#6b6560' }}>$531</span>
                    <span className="text-4xl font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>$299</span>
                    <span style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>/year</span>
                  </div>
                  <p 
                    className="text-sm mt-2"
                    style={{ fontFamily: 'Inter', fontWeight: 600, color: '#db2777' }}
                  >
                    Save $49 vs monthly
                  </p>
                </div>

                <ul className="space-y-3 mb-8" aria-label="Annual plan features">
                  {['Up to 8 maps per month', 'Billed annually', 'Cancel anytime', 'Access to bonus packs'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#1a1a1a' }}>
                      <svg className="w-5 h-5 shrink-0" style={{ color: '#db2777' }} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout('annual')}
                  disabled={loading === 'annual'}
                  className="w-full py-3 rounded-xl font-semibold transition-all disabled:opacity-50 hover:scale-105"
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.outline = '2px solid #005a54';
                    e.currentTarget.style.outlineOffset = '2px';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.outlineOffset = '0';
                  }}
                  aria-busy={loading === 'annual'}
                >
                  {loading === 'annual' ? 'Loading...' : 'Subscribe Now'}
                </button>
              </section>
            )}

            {/* 5-Pack - Only show for SUBSCRIBERS */}
            {isSubscriber && (
              <section 
                style={{ ...glassCard, padding: '32px' }}
                aria-labelledby="pack-plan-heading"
              >
                <div className="text-center mb-6">
                  <span 
                    className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
                    style={{ 
                      background: 'rgba(124, 58, 237, 0.15)',
                      color: '#7c3aed',
                      fontFamily: 'Montserrat Alternates',
                    }}
                  >
                    SUBSCRIBER BONUS
                  </span>
                  <h2 
                    id="pack-plan-heading"
                    className="text-2xl mb-2"
                    style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700, color: '#1a1a1a' }}
                  >
                    5-Pack Add-On
                  </h2>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-xl line-through" style={{ fontFamily: 'Montserrat Alternates', color: '#6b6560' }}>$24</span>
                    <span className="text-4xl font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>$19</span>
                    <span style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>one-time</span>
                  </div>
                  <p 
                    className="text-sm mt-2"
                    style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
                  >
                    Need extra maps this month?
                  </p>
                </div>

                <ul className="space-y-3 mb-8" aria-label="5-Pack features">
                  {['5 additional map credits', 'Never expires', 'Stack with other packs'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#1a1a1a' }}>
                      <svg className="w-5 h-5 shrink-0" style={{ color: '#7c3aed' }} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout('pack')}
                  disabled={loading === 'pack'}
                  className="w-full py-3 rounded-xl font-semibold transition-all disabled:opacity-50 hover:scale-105"
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.outline = '2px solid #005a54';
                    e.currentTarget.style.outlineOffset = '2px';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.outlineOffset = '0';
                  }}
                  aria-busy={loading === 'pack'}
                >
                  {loading === 'pack' ? 'Loading...' : 'Buy 5-Pack'}
                </button>
              </section>
            )}
          </div>

          {/* Already subscribed message */}
          {isSubscriber && (
            <div 
              className="mt-8 text-center p-4 rounded-xl"
              style={{
                background: 'rgba(0, 169, 157, 0.1)',
                border: '1px solid rgba(0, 169, 157, 0.2)',
              }}
            >
              <p style={{ fontFamily: 'Inter', fontWeight: 500, color: '#0D7871' }}>
                ✓ You're a subscriber! Purchase additional packs above if you need more maps this month.
              </p>
            </div>
          )}

          {/* Pack teaser for non-subscribers */}
          {!isSubscriber && !checkingSubscription && (
            <div 
              className="mt-8 text-center p-6 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
              }}
            >
              <p style={{ fontFamily: 'Inter', fontWeight: 500, color: '#1a1a1a' }}>
                🍊 <strong style={{ color: '#1a1a1a' }}>Subscribers get access to bonus 5-packs</strong> — extra maps when you need them!
              </p>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}