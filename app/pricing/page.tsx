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
                    🍊 Founding member rate during beta
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
                    'Clemelopy Workspace',
                    'Orchard Audit — 3 pages/mo',
                    'Share of Model — Manual tracking',
                    '8 Linking Strategy Maps per month',
                    'GA4 Integration',
                    'Schema Studio',
                    'To-Do List',
                    'Support',
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

                {/* Extra Pack Note */}
                <p
                  className="text-center text-sm mb-6"
                  style={{ fontFamily: 'Inter', fontWeight: 500, color: '#6b6560' }}
                >
                  Need more? Add a 5-run pack for <span style={{ textDecoration: 'line-through', color: '#9ca3af' }}>$24</span> <span style={{ fontWeight: 600, color: '#00A99D' }}>$19</span>
                </p>

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
                      'Get Started'
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
                    🍊 Founding member rate during beta
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
                    'Clemelopy Workspace',
                    'Orchard Audit — 10 pages + 1 site/mo',
                    'Share of Model — Automated + Manual',
                    'Research Notes — 10/mo',
                    '15 Linking Strategy Maps per month',
                    'GA4 Integration',
                    'Schema Studio',
                    'To-Do List',
                    'Priority support',
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

                {/* Priority Support Note */}
                <p
                  className="text-center text-sm mb-6"
                  style={{ fontFamily: 'Inter', fontWeight: 500, color: '#6b6560' }}
                >
                  Includes priority support & site audits
                </p>

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
                      'Get Started'
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Comparison Chart */}
          <div
            className="mt-12 rounded-2xl overflow-hidden max-w-4xl mx-auto"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            }}
          >
            {/* Header */}
            <div
              className="py-4 px-6"
              style={{
                background: 'linear-gradient(135deg, #FAA819 0%, #E99502 25%, #00A99D 75%, #0D7871 100%)',
              }}
            >
              <h3
                className="text-center text-white"
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700, fontSize: '1.25rem', margin: 0 }}
              >
                Compare Plans
              </h3>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse', fontFamily: 'Inter', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(0, 0, 0, 0.08)' }}>
                    <th
                      className="text-left py-4 px-6"
                      style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '0.9rem', width: '50%' }}
                    >
                      Feature
                    </th>
                    <th
                      className="text-center py-4 px-6"
                      style={{ fontWeight: 700, fontSize: '0.95rem', color: '#00A99D' }}
                    >
                      Starter — $29/mo
                    </th>
                    <th
                      className="text-center py-4 px-6"
                      style={{ fontWeight: 700, fontSize: '0.95rem', color: '#E99502' }}
                    >
                      Growth — $79/mo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Clemelopy Workspace', starter: true, growth: true },
                    { feature: 'Orchard Audit — Pages', starter: '3/month', growth: '10/month' },
                    { feature: 'Orchard Audit — Full Site', starter: '—', growth: '1/month' },
                    { feature: 'Share of Model — Manual Tracking', starter: true, growth: true },
                    { feature: 'Share of Model — Automated Tracking', starter: '—', growth: true },
                    { feature: 'Research Notes', starter: '—', growth: '10/month' },
                    { feature: 'Linking Strategy Maps', starter: '8/month', growth: '15/month' },
                    { feature: 'GA4 Integration', starter: true, growth: true },
                    { feature: 'Schema Studio', starter: true, growth: true },
                    { feature: 'To-Do List', starter: true, growth: true },
                    { feature: 'Support', starter: 'Standard', growth: 'Priority' },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                        background: i % 2 === 0 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.02)',
                      }}
                    >
                      <td className="py-3.5 px-6" style={{ color: '#1a1a1a', fontSize: '0.9rem' }}>
                        {row.feature}
                      </td>
                      <td className="py-3.5 px-6 text-center" style={{ color: '#1a1a1a', fontSize: '0.9rem' }}>
                        {row.starter === true ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#00A99D"
                            strokeWidth="3"
                            style={{ width: '20px', height: '20px', display: 'inline-block' }}
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ) : row.starter === '—' ? (
                          <span style={{ color: '#ccc' }}>—</span>
                        ) : (
                          <span style={{ fontWeight: 500 }}>{row.starter}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-center" style={{ color: '#1a1a1a', fontSize: '0.9rem' }}>
                        {row.growth === true ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#E99502"
                            strokeWidth="3"
                            style={{ width: '20px', height: '20px', display: 'inline-block' }}
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ) : row.growth === '—' ? (
                          <span style={{ color: '#ccc' }}>—</span>
                        ) : (
                          <span style={{ fontWeight: 500 }}>{row.growth}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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