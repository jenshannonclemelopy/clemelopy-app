'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import PageContainer from '../components/PageContainer';
import { supabase } from '../lib/supabase';

const WORKER_URL = 'https://linking-strategy-map.jen-86f.workers.dev';

export default function PricingPage() {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [starterBilling, setStarterBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [growthBilling, setGrowthBilling] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user?.email) {
        setCheckingSubscription(false);
        return;
      }

      try {
        const { data: license } = await supabase
          .from('licenses')
          .select('plan, status, tier')
          .eq('email', user.email)
          .single();

        if (license?.status === 'active') {
          setCurrentPlan(license.tier || license.plan);
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [user?.email]);

  const handleCheckout = async (tier: 'starter' | 'growth', period: 'monthly' | 'yearly') => {
    if (!user || !session) {
      alert('Please sign in first');
      return;
    }

    const priceType = `${tier}_${period}`;
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
          successUrl: `${window.location.origin}/workspace?checkout=success`,
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

  // Toggle component
  const BillingToggle = ({ 
    value, 
    onChange 
  }: { 
    value: 'monthly' | 'yearly'; 
    onChange: (v: 'monthly' | 'yearly') => void;
  }) => (
    <div 
      className="inline-flex items-center rounded-full p-1"
      style={{ background: 'rgba(0, 0, 0, 0.06)' }}
    >
      <button
        onClick={() => onChange('monthly')}
        className="px-4 py-1.5 rounded-full text-sm transition-all"
        style={{
          fontFamily: 'Inter',
          fontWeight: 600,
          fontSize: '13px',
          background: value === 'monthly' ? 'white' : 'transparent',
          color: value === 'monthly' ? '#1a1a1a' : '#6b6560',
          boxShadow: value === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange('yearly')}
        className="px-4 py-1.5 rounded-full text-sm transition-all"
        style={{
          fontFamily: 'Inter',
          fontWeight: 600,
          fontSize: '13px',
          background: value === 'yearly' ? 'white' : 'transparent',
          color: value === 'yearly' ? '#1a1a1a' : '#6b6560',
          boxShadow: value === 'yearly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        Yearly
      </button>
    </div>
  );

  const isCurrentPlan = (tier: string) => currentPlan === tier;

  return (
    <Layout activeNav="settings">
      <main>
        <PageHeader
          titleStart="Choose your"
          titleEnd="plan"
          subtitle="Optimize your content for AI-powered search engines"
          centered={true}
          showTour={false}
        />

        <PageContainer>
          {checkingSubscription ? (
            <div className="flex items-center justify-center py-12">
              <div
                className="w-8 h-8 border-3 rounded-full animate-spin"
                style={{ borderColor: 'rgba(0, 169, 157, 0.2)', borderTopColor: '#00A99D' }}
              />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              
              {/* Starter Plan */}
              <div
                className="rounded-3xl p-8 relative"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 50%, rgba(0,169,157,0.08) 100%)',
                  border: '2px solid #00A99D',
                  boxShadow: '0 4px 24px rgba(0, 169, 157, 0.12)',
                }}
              >
                {/* Badge */}
                <div className="flex justify-center mb-6">
                  <span
                    className="px-4 py-1.5 rounded-full text-xs font-bold tracking-wide"
                    style={{
                      background: 'rgba(0, 169, 157, 0.15)',
                      color: '#007a70',
                      fontFamily: 'Montserrat Alternates',
                    }}
                  >
                    MOST POPULAR
                  </span>
                </div>

                {/* Plan Name */}
                <h2
                  className="text-3xl text-center mb-2"
                  style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700, color: '#1a1a1a' }}
                >
                  Starter
                </h2>

                {/* Toggle */}
                <div className="flex justify-center mb-6">
                  <BillingToggle value={starterBilling} onChange={setStarterBilling} />
                </div>

                {/* Pricing */}
                <div className="text-center mb-2">
                  <div className="flex items-baseline justify-center gap-2">
                    <span
                      className="text-xl line-through"
                      style={{ fontFamily: 'Montserrat Alternates', color: '#9ca3af' }}
                    >
                      ${starterBilling === 'monthly' ? '59' : '531'}
                    </span>
                    <span
                      className="text-5xl"
                      style={{ fontFamily: 'Montserrat Alternates', fontWeight: 800, color: '#1a1a1a' }}
                    >
                      ${starterBilling === 'monthly' ? '29' : '299'}
                    </span>
                    <span style={{ fontFamily: 'Inter', fontWeight: 500, color: '#6b6560', fontSize: '16px' }}>
                      /{starterBilling === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                </div>

                {/* Beta Badge */}
                <div className="flex justify-center mb-6">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm"
                    style={{
                      background: 'linear-gradient(135deg, #00A99D, #0D7871)',
                      color: 'white',
                      fontFamily: 'Inter',
                      fontWeight: 600,
                    }}
                  >
                    🍊 Beta pricing
                  </span>
                </div>

                {/* Savings (yearly only) */}
                {starterBilling === 'yearly' && (
                  <p
                    className="text-center text-sm mb-6"
                    style={{ fontFamily: 'Inter', fontWeight: 600, color: '#db2777' }}
                  >
                    Save $49 vs monthly
                  </p>
                )}

                {/* Divider */}
                <div className="h-px my-6" style={{ background: 'rgba(0,0,0,0.08)' }} />

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {[
                    'Access to Clemelopy Workspace',
                    'Up to 8 Linking Strategy Maps per month',
                    '3 page audits through Orchard Audits per month',
                    'Schema Studio access',
                    'GA4 referral analytics tracking',
                    'To-do list & project management',
                    'Cancel anytime',
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 shrink-0 mt-0.5"
                        style={{ color: '#00A99D' }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span style={{ fontFamily: 'Inter', fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrentPlan('starter') ? (
                  <div
                    className="w-full py-4 rounded-2xl text-center"
                    style={{
                      fontFamily: 'Montserrat Alternates',
                      fontWeight: 600,
                      fontSize: '16px',
                      background: 'rgba(0, 169, 157, 0.1)',
                      color: '#007a70',
                      border: '2px solid rgba(0, 169, 157, 0.3)',
                    }}
                  >
                    ✓ Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleCheckout('starter', starterBilling)}
                    disabled={loading === `starter_${starterBilling}`}
                    className="w-full py-4 rounded-2xl font-semibold transition-all disabled:opacity-50 hover:shadow-lg hover:scale-[1.02] flex items-center justify-center gap-2"
                    style={{
                      fontFamily: 'Montserrat Alternates',
                      fontSize: '16px',
                      background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
                      color: 'white',
                      boxShadow: '0 4px 15px rgba(0, 169, 157, 0.35)',
                    }}
                  >
                    {loading === `starter_${starterBilling}` ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Loading...
                      </>
                    ) : (
                      'Subscribe Now'
                    )}
                  </button>
                )}
              </div>

              {/* Growth Plan */}
              <div
                className="rounded-3xl p-8 relative"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 50%, rgba(250,168,25,0.08) 100%)',
                  border: '2px solid #FAA819',
                  boxShadow: '0 4px 24px rgba(250, 168, 25, 0.15)',
                }}
              >
                {/* Badge */}
                <div className="flex justify-center mb-6">
                  <span
                    className="px-4 py-1.5 rounded-full text-xs font-bold tracking-wide"
                    style={{
                      background: 'linear-gradient(135deg, #FAA819, #E99502)',
                      color: 'white',
                      fontFamily: 'Montserrat Alternates',
                    }}
                  >
                    BEST VALUE
                  </span>
                </div>

                {/* Plan Name */}
                <h2
                  className="text-3xl text-center mb-2"
                  style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700, color: '#1a1a1a' }}
                >
                  Growth
                </h2>

                {/* Toggle */}
                <div className="flex justify-center mb-6">
                  <BillingToggle value={growthBilling} onChange={setGrowthBilling} />
                </div>

                {/* Pricing */}
                <div className="text-center mb-2">
                  <div className="flex items-baseline justify-center gap-2">
                    <span
                      className="text-xl line-through"
                      style={{ fontFamily: 'Montserrat Alternates', color: '#9ca3af' }}
                    >
                      ${growthBilling === 'monthly' ? '149' : '1,490'}
                    </span>
                    <span
                      className="text-5xl"
                      style={{ fontFamily: 'Montserrat Alternates', fontWeight: 800, color: '#1a1a1a' }}
                    >
                      ${growthBilling === 'monthly' ? '79' : '849'}
                    </span>
                    <span style={{ fontFamily: 'Inter', fontWeight: 500, color: '#6b6560', fontSize: '16px' }}>
                      /{growthBilling === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                </div>

                {/* Beta Badge */}
                <div className="flex justify-center mb-6">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm"
                    style={{
                      background: 'linear-gradient(135deg, #FAA819, #E99502)',
                      color: 'white',
                      fontFamily: 'Inter',
                      fontWeight: 600,
                    }}
                  >
                    🍊 Beta pricing
                  </span>
                </div>

                {/* Savings (yearly only) */}
                {growthBilling === 'yearly' && (
                  <p
                    className="text-center text-sm mb-6"
                    style={{ fontFamily: 'Inter', fontWeight: 600, color: '#db2777' }}
                  >
                    Save $99 vs monthly
                  </p>
                )}

                {/* Divider */}
                <div className="h-px my-6" style={{ background: 'rgba(0,0,0,0.08)' }} />

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {[
                    'Access to Clemelopy Workspace',
                    'Up to 15 Linking Strategy Maps per month',
                    '1 full site Orchard Audit per month',
                    'Schema Studio access',
                    'GA4 referral analytics tracking',
                    'To-do list & project management',
                    'Cancel anytime',
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 shrink-0 mt-0.5"
                        style={{ color: '#FAA819' }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span style={{ fontFamily: 'Inter', fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrentPlan('growth') ? (
                  <div
                    className="w-full py-4 rounded-2xl text-center"
                    style={{
                      fontFamily: 'Montserrat Alternates',
                      fontWeight: 600,
                      fontSize: '16px',
                      background: 'rgba(250, 168, 25, 0.1)',
                      color: '#b37400',
                      border: '2px solid rgba(250, 168, 25, 0.3)',
                    }}
                  >
                    ✓ Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleCheckout('growth', growthBilling)}
                    disabled={loading === `growth_${growthBilling}`}
                    className="w-full py-4 rounded-2xl font-semibold transition-all disabled:opacity-50 hover:shadow-lg hover:scale-[1.02] flex items-center justify-center gap-2"
                    style={{
                      fontFamily: 'Montserrat Alternates',
                      fontSize: '16px',
                      background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                      color: 'white',
                      boxShadow: '0 4px 15px rgba(250, 168, 25, 0.35)',
                    }}
                  >
                    {loading === `growth_${growthBilling}` ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Loading...
                      </>
                    ) : (
                      'Subscribe Now'
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Already subscribed message */}
          {currentPlan && (
            <div
              className="mt-8 text-center p-4 rounded-xl max-w-md mx-auto"
              style={{
                background: 'rgba(0, 169, 157, 0.1)',
                border: '1px solid rgba(0, 169, 157, 0.2)',
              }}
            >
              <p style={{ fontFamily: 'Inter', fontWeight: 500, color: '#0D7871' }}>
                ✓ You're on the {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan.{' '}
                <a href="/settings" className="underline hover:no-underline">
                  Manage subscription
                </a>
              </p>
            </div>
          )}
        </PageContainer>
      </main>
    </Layout>
  );
}