'use client';

import { useState } from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

export default function SubscribePage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [betaTermsAccepted, setBetaTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<'starter' | 'growth' | null>(null);

  const prices = {
    starter: { monthly: 29, yearly: 276, originalMonthly: 59, originalYearly: 531 },
    growth: { monthly: 79, yearly: 756, originalMonthly: 149, originalYearly: 1490 },
  };

  const handleCheckout = async (plan: 'starter' | 'growth') => {
    if (!betaTermsAccepted) {
      setPendingPlan(plan);
      setShowTermsModal(true);
      return;
    }
    
    proceedToCheckout(plan);
  };

  const proceedToCheckout = async (plan: 'starter' | 'growth') => {
    setLoading(plan);

    try {
      const priceType = `${plan}_${isAnnual ? 'yearly' : 'monthly'}`;
      
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceType,
          successUrl: `${window.location.origin}/checkout-success`,
          cancelUrl: `${window.location.origin}/subscribe`,
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

  const starterFeatures = [
    '8 Linking Strategy Maps per month',
    'Clemelopy Workspace',
    'Schema Studio',
    'GA4 Integration',
    'Orchard Audit — 3 pages/mo (coming soon)',
    'Share of Model — Manual tracking (coming soon)',
    'To-Do List',
    'Support',
  ];

  const growthFeatures = [
    '15 Linking Strategy Maps per month',
    'Clemelopy Workspace',
    'Schema Studio',
    'GA4 Integration',
    'Orchard Audit — 10 pages + 1 site/mo (coming soon)',
    'Share of Model — Automated + Manual (coming soon)',
    'To-Do List',
    'Priority support',
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#2d2a26' }}>
      <Navigation />

      {/* PRICING SECTION */}
      <section style={{
        padding: '60px 40px 80px',
        background: 'white',
        minHeight: '100vh',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* PRICING CARDS - THREE COLUMNS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '24px',
            marginBottom: '32px',
          }}>
            
            {/* STARTER PLAN */}
            <div style={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #faa819 100%)',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(255, 107, 107, 0.25)',
              color: 'white',
            }}>
              <div style={{ padding: '24px 28px 20px' }}>
                <span style={{
                  display: 'inline-block',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '100px',
                  marginBottom: '12px',
                  fontFamily: "'Montserrat Alternates', sans-serif",
                }}>
                  MOST POPULAR
                </span>
                <h3 style={{
                  fontFamily: "'Montserrat Alternates', sans-serif",
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  marginBottom: 0,
                  color: 'white',
                }}>
                  Starter
                </h3>
              </div>

              <div style={{ padding: '0 28px 28px' }}>
                {/* Billing Toggle */}
                <div style={{
                  display: 'flex',
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '4px',
                  marginBottom: '20px',
                }}>
                  <button
                    onClick={() => setIsAnnual(false)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: 'none',
                      background: !isAnnual ? 'white' : 'transparent',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: !isAnnual ? '#2d2a26' : 'rgba(255, 255, 255, 0.8)',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                      boxShadow: !isAnnual ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
                    }}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setIsAnnual(true)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: 'none',
                      background: isAnnual ? 'white' : 'transparent',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: isAnnual ? '#2d2a26' : 'rgba(255, 255, 255, 0.8)',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: isAnnual ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
                    }}
                  >
                    Annual
                    <span style={{
                      background: isAnnual ? '#F97316' : 'white',
                      color: isAnnual ? 'white' : '#F97316',
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      padding: '2px 5px',
                      borderRadius: '100px',
                    }}>
                      Save 20%
                    </span>
                  </button>
                </div>

                {/* Price */}
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '1rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    textDecoration: 'line-through',
                    marginRight: '8px',
                  }}>
                    ${isAnnual ? prices.starter.originalYearly : prices.starter.originalMonthly}
                  </span>
                  <span style={{
                    fontFamily: "'Montserrat Alternates', sans-serif",
                    fontSize: '3rem',
                    fontWeight: 700,
                    color: 'white',
                  }}>
                    <sup style={{ fontSize: '1.25rem', verticalAlign: 'super' }}>$</sup>
                    {isAnnual ? prices.starter.yearly : prices.starter.monthly}
                  </span>
                  <span style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    /{isAnnual ? 'year' : 'mo'}
                  </span>
                </div>
                <p style={{
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  marginBottom: '20px',
                }}>
                  Founding member rate during beta
                </p>

                {/* Divider */}
                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.2)', margin: '20px 0' }} />

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
                  {starterFeatures.map((feature, i) => (
                    <li key={i} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      fontSize: '0.9rem',
                      color: 'white',
                      padding: '8px 0',
                      borderBottom: i < starterFeatures.length - 1 ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }}>
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleCheckout('starter')}
                  disabled={loading === 'starter'}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'center',
                    padding: '14px 24px',
                    borderRadius: '10px',
                    background: 'white',
                    color: '#00A99D',
                    fontFamily: "'Montserrat Alternates', sans-serif",
                    fontSize: '1rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: loading === 'starter' ? 'not-allowed' : 'pointer',
                    opacity: loading === 'starter' ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {loading === 'starter' ? 'Loading...' : 'Get Started'}
                </button>

                {/* Addon */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: 'white',
                  marginTop: '16px',
                }}>
                  <strong>Need more?</strong> Add a 5-run pack for <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>$24</span> $19
                </div>
              </div>
            </div>

            {/* GROWTH PLAN */}
            <div style={{
              background: 'linear-gradient(135deg, #721590 0%, #ff5da7 100%)',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(114, 21, 144, 0.25)',
              color: 'white',
            }}>
              <div style={{ padding: '24px 28px 20px' }}>
                <span style={{
                  display: 'inline-block',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '100px',
                  marginBottom: '12px',
                  fontFamily: "'Montserrat Alternates', sans-serif",
                }}>
                  BEST VALUE
                </span>
                <h3 style={{
                  fontFamily: "'Montserrat Alternates', sans-serif",
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  marginBottom: 0,
                  color: 'white',
                }}>
                  Growth
                </h3>
              </div>

              <div style={{ padding: '0 28px 28px' }}>
                {/* Billing Toggle */}
                <div style={{
                  display: 'flex',
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '4px',
                  marginBottom: '20px',
                }}>
                  <button
                    onClick={() => setIsAnnual(false)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: 'none',
                      background: !isAnnual ? 'white' : 'transparent',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: !isAnnual ? '#2d2a26' : 'rgba(255, 255, 255, 0.8)',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                      boxShadow: !isAnnual ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
                    }}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setIsAnnual(true)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: 'none',
                      background: isAnnual ? 'white' : 'transparent',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: isAnnual ? '#2d2a26' : 'rgba(255, 255, 255, 0.8)',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: isAnnual ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
                    }}
                  >
                    Annual
                    <span style={{
                      background: isAnnual ? '#A855F7' : 'white',
                      color: isAnnual ? 'white' : '#A855F7',
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      padding: '2px 5px',
                      borderRadius: '100px',
                    }}>
                      Save 10%
                    </span>
                  </button>
                </div>

                {/* Price */}
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '1rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    textDecoration: 'line-through',
                    marginRight: '8px',
                  }}>
                    ${isAnnual ? prices.growth.originalYearly : prices.growth.originalMonthly}
                  </span>
                  <span style={{
                    fontFamily: "'Montserrat Alternates', sans-serif",
                    fontSize: '3rem',
                    fontWeight: 700,
                    color: 'white',
                  }}>
                    <sup style={{ fontSize: '1.25rem', verticalAlign: 'super' }}>$</sup>
                    {isAnnual ? prices.growth.yearly : prices.growth.monthly}
                  </span>
                  <span style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    /{isAnnual ? 'year' : 'mo'}
                  </span>
                </div>
                <p style={{
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  marginBottom: '20px',
                }}>
                  Founding member rate during beta
                </p>

                {/* Divider */}
                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.2)', margin: '20px 0' }} />

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
                  {growthFeatures.map((feature, i) => (
                    <li key={i} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      fontSize: '0.9rem',
                      color: 'white',
                      padding: '8px 0',
                      borderBottom: i < growthFeatures.length - 1 ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }}>
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleCheckout('growth')}
                  disabled={loading === 'growth'}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'center',
                    padding: '14px 24px',
                    borderRadius: '10px',
                    background: 'white',
                    color: '#A855F7',
                    fontFamily: "'Montserrat Alternates', sans-serif",
                    fontSize: '1rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: loading === 'growth' ? 'not-allowed' : 'pointer',
                    opacity: loading === 'growth' ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {loading === 'growth' ? 'Loading...' : 'Get Started'}
                </button>

                {/* Priority support note */}
                <p style={{
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginTop: '16px',
                }}>
                  Includes priority support & site audits
                </p>
              </div>
            </div>

            {/* BETA INFO CARD */}
            <div style={{
              background: '#fffaf3',
              borderRadius: '20px',
              overflow: 'hidden',
              border: '1px solid rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ padding: '24px 28px 20px' }}>
                <h3 style={{
                  fontFamily: "'Montserrat Alternates', sans-serif",
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: '#2d2a26',
                  marginBottom: '8px',
                  lineHeight: 1.3,
                }}>
                  Beta Launch Pricing{' '}
                  <span style={{
                    background: 'linear-gradient(135deg, #FAA819 0%, #00A99D 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                    (Founding Member Rates)
                  </span>
                </h3>
              </div>

              <div style={{ padding: '0 28px 28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <p style={{
                  fontSize: '0.9rem',
                  color: '#2d2a26',
                  lineHeight: 1.7,
                  marginBottom: '16px',
                }}>
                  Clemelopy Workspace and tools are currently in public beta. That means Clemelopy is in active development. While thoroughly tested, you may encounter occasional bugs.
                </p>
                
                <p style={{
                  fontSize: '0.9rem',
                  color: '#2d2a26',
                  lineHeight: 1.7,
                  marginBottom: '16px',
                }}>
                  In exchange for early access, beta feedback, and getting to use tools before anyone else, your beta pricing is locked in permanently as long as your subscription stays active.
                </p>
                
                <p style={{
                  fontSize: '0.9rem',
                  color: '#2d2a26',
                  lineHeight: 1.7,
                  marginBottom: '24px',
                }}>
                  Get early access at special founding-member pricing while the product evolves. These prices are temporary and will increase after beta. Join now to lock in your rate permanently.
                </p>

                <div style={{
                  background: 'rgba(250, 168, 25, 0.1)',
                  borderLeft: '4px solid #FAA819',
                  padding: '14px 16px',
                  borderRadius: '0 12px 12px 0',
                  marginTop: 'auto',
                }}>
                  <p style={{
                    fontSize: '0.9rem',
                    color: '#2d2a26',
                    lineHeight: 1.5,
                    margin: 0,
                    fontWeight: 600,
                  }}>
                    You keep beta pricing as long as your subscription is active.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* COMPARISON CHART */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
            marginBottom: '40px',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #FAA819 0%, #E99502 25%, #00A99D 75%, #0D7871 100%)',
              padding: '20px 28px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            }}>
              <h3 style={{
                fontFamily: "'Montserrat Alternates', sans-serif",
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'white',
                margin: 0,
                textAlign: 'center',
              }}>
                Compare Plans
              </h3>
            </div>
            
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: "'Inter', sans-serif",
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(0, 0, 0, 0.08)' }}>
                  <th style={{
                    padding: '16px 24px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: '#2d2a26',
                    fontSize: '0.9rem',
                    width: '50%',
                  }}>
                    Feature
                  </th>
                  <th style={{
                    padding: '16px 24px',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    background: 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                    Starter — $29/mo
                  </th>
                  <th style={{
                    padding: '16px 24px',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                    Growth — $79/mo
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Linking Strategy Maps', starter: '8/month', growth: '15/month' },
                  { feature: 'Clemelopy Workspace', starter: true, growth: true },
                  { feature: 'Schema Studio', starter: true, growth: true },
                  { feature: 'GA4 Integration', starter: true, growth: true },
                  { feature: 'To-Do List', starter: true, growth: true },
                  { feature: 'Orchard Audit — Pages', starter: '3/month', growth: '10/month', comingSoon: true },
                  { feature: 'Orchard Audit — Full Site', starter: '—', growth: '1/month', comingSoon: true },
                  { feature: 'Share of Model — Manual Tracking', starter: true, growth: true, comingSoon: true },
                  { feature: 'Share of Model — Automated Tracking', starter: '—', growth: true, comingSoon: true },
                  { feature: 'Support', starter: true, growth: 'Priority' },
                ].map((row, i) => (
                  <tr key={i} style={{ 
                    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                    background: i % 2 === 0 ? 'white' : 'rgba(0, 0, 0, 0.02)',
                  }}>
                    <td style={{
                      padding: '14px 24px',
                      color: '#2d2a26',
                      fontSize: '0.9rem',
                    }}>
                      {row.feature}
                      {row.comingSoon && (
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: '#00A99D',
                          background: 'rgba(0, 169, 157, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}>
                          Coming Soon
                        </span>
                      )}
                    </td>
                    <td style={{
                      padding: '14px 24px',
                      textAlign: 'center',
                      color: '#2d2a26',
                      fontSize: '0.9rem',
                    }}>
                      {row.starter === true ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="3" style={{ width: '20px', height: '20px', display: 'inline-block' }}>
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : row.starter === '—' ? (
                        <span style={{ color: '#ccc' }}>—</span>
                      ) : (
                        <span style={{ fontWeight: 500 }}>{row.starter}</span>
                      )}
                    </td>
                    <td style={{
                      padding: '14px 24px',
                      textAlign: 'center',
                      color: '#2d2a26',
                      fontSize: '0.9rem',
                    }}>
                      {row.growth === true ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="3" style={{ width: '20px', height: '20px', display: 'inline-block' }}>
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
      </section>

      {/* TRUST BADGES */}
      <section style={{ padding: '40px', background: 'white' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '48px',
          flexWrap: 'wrap',
          maxWidth: '800px',
          margin: '0 auto',
        }}>
          {[
            { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', text: 'Secure payments via Stripe' },
            { icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 6v4l3 2', text: 'Cancel anytime' },
            { icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', text: 'Priority beta support' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#666' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#00A99D" strokeWidth="2" style={{ width: '22px', height: '22px' }}>
                <path d={item.icon}></path>
              </svg>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.95rem', fontWeight: 500 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      <Footer />

      {/* BETA TERMS MODAL */}
      {showTermsModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowTermsModal(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '24px',
              padding: '32px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div 
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 24px rgba(250, 168, 25, 0.3)',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ width: '32px', height: '32px' }}>
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 style={{
                fontFamily: "'Montserrat Alternates', sans-serif",
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#2d2a26',
                marginBottom: '8px',
              }}>
                One Quick Thing! 🍊
              </h3>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.95rem',
                color: '#666',
                lineHeight: 1.6,
              }}>
                Please review and accept the beta terms to continue.
              </p>
            </div>

            {/* Terms Content */}
            <div style={{
              background: '#fffaf3',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.9rem',
                color: '#2d2a26',
                lineHeight: 1.7,
                marginBottom: '16px',
              }}>
                I understand this is a <strong>beta product</strong> and agree to the{' '}
                <a 
                  href="https://clemelopy.com/terms" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#00A99D', textDecoration: 'underline' }}
                >
                  beta terms
                </a>.
              </p>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.9rem',
                color: '#2d2a26',
                lineHeight: 1.7,
                margin: 0,
              }}>
                My <strong>founding member pricing is locked in</strong> as long as my subscription stays active.
              </p>
            </div>

            {/* Checkbox */}
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer',
              marginBottom: '24px',
              padding: '16px',
              background: betaTermsAccepted ? 'rgba(0, 169, 157, 0.08)' : 'transparent',
              borderRadius: '12px',
              border: betaTermsAccepted ? '2px solid #00A99D' : '2px solid #e0e0e0',
              transition: 'all 0.2s',
            }}>
              <input
                type="checkbox"
                checked={betaTermsAccepted}
                onChange={(e) => setBetaTermsAccepted(e.target.checked)}
                style={{
                  width: '24px',
                  height: '24px',
                  accentColor: '#00A99D',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.95rem',
                fontWeight: 500,
                color: '#2d2a26',
              }}>
                I agree to the beta terms and understand my pricing is locked in
              </span>
            </label>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowTermsModal(false);
                  setPendingPlan(null);
                }}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  borderRadius: '12px',
                  border: '1px solid #e0e0e0',
                  background: 'white',
                  fontFamily: "'Montserrat Alternates', sans-serif",
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#666',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (betaTermsAccepted && pendingPlan) {
                    setShowTermsModal(false);
                    proceedToCheckout(pendingPlan);
                  }
                }}
                disabled={!betaTermsAccepted}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: betaTermsAccepted 
                    ? 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)' 
                    : '#e0e0e0',
                  fontFamily: "'Montserrat Alternates', sans-serif",
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: betaTermsAccepted ? 'white' : '#999',
                  cursor: betaTermsAccepted ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: betaTermsAccepted ? '0 4px 15px rgba(0, 169, 157, 0.3)' : 'none',
                }}
              >
                Continue to Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}