'use client';

/**
 * Analytics Dashboard Page
 * 
 * Complete analytics page with:
 * - GA4 connection flow
 * - Stats cards with info tooltips (❓ buttons)
 * - Charts and tables
 * - Adaptive tour based on connection status
 * 
 * File location: app/tools/analytics/page.tsx
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import ConnectGA4Button from '../../components/analytics/ConnectGA4Button';
import PropertySelector from '../../components/analytics/PropertySelector';
import AIReferralChart from '../../components/analytics/AIReferralChart';
import ReferralTable from '../../components/analytics/ReferralTable';
import DateRangePicker from '../../components/analytics/DateRangePicker';
import InsightsCard from '../../components/analytics/InsightsCard';
import { AIReferralData } from '../../lib/google-analytics';
import Layout from '../../components/Layout';
import PageTour from '../../components/PageTour';
import TourHelpButton from '../../components/TourHelpButton';
import { getAnalyticsTourSteps } from '../../components/analyticsTourSteps';

// Types
type ConnectionStatus = 'loading' | 'disconnected' | 'select_property' | 'connected';
type DateRange = '7days' | '30days' | '90days';

// ============================================
// TOOLTIP CONTENT
// ============================================

const METRIC_TOOLTIPS = {
  sessions: "Total visits from AI platforms. Each session represents someone who clicked through from ChatGPT, Perplexity, Claude, or other AI tools.",
  users: "Unique visitors from AI platforms. One user might have multiple sessions, so this shows how many individuals found you through AI.",
  conversions: "Goal completions from AI traffic. This tracks when AI-referred visitors take meaningful actions like signing up, purchasing, or contacting you.",
  engagement: "How engaged AI visitors are with your content. Higher engagement means AI is sending you quality traffic that's genuinely interested in what you offer.",
};

// ============================================
// ANALYTICS CONTENT COMPONENT
// ============================================

function AnalyticsContent({ 
  connectionStatus,
  setConnectionStatus,
}: { 
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;
}) {
  const searchParams = useSearchParams();
  const [analyticsData, setAnalyticsData] = useState<AIReferralData | null>(null);
  const [propertyName, setPropertyName] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      if (searchParams.get('select_property') === 'true') {
        setConnectionStatus('select_property');
      } else {
        checkConnectionStatus();
      }
    }
    const errorParam = searchParams.get('error');
    if (errorParam) setError(getErrorMessage(errorParam));
  }, [searchParams, setConnectionStatus]);

  useEffect(() => {
    if (connectionStatus === 'connected') fetchAnalyticsData();
  }, [connectionStatus, dateRange]);

  async function checkConnectionStatus() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setConnectionStatus('disconnected'); return; }

      const response = await fetch('/api/analytics/properties', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.status === 404) { setConnectionStatus('disconnected'); return; }

      const data = await response.json();
      if (data.selectedPropertyId) {
        setPropertyName(data.selectedPropertyName || '');
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('select_property');
      }
    } catch (err) {
      console.error('Error checking connection:', err);
      setConnectionStatus('disconnected');
    }
  }

  async function fetchAnalyticsData() {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/analytics/data?period=${dateRange}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json();

      if (!response.ok) {
        if (result.needsConnection || result.needsReconnect) {
          setConnectionStatus('disconnected');
          setError(result.error);
        } else {
          setError(result.error || 'Failed to fetch data');
        }
        return;
      }
      setAnalyticsData(result.data);
      setPropertyName(result.propertyName || '');
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePropertySelected(propertyId: string, name: string) {
    setPropertyName(name);
    setConnectionStatus('connected');
  }

  async function handleDisconnect() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/analytics/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setConnectionStatus('disconnected');
      setAnalyticsData(null);
      setPropertyName('');
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  }

  function getErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      'access_denied': 'You denied access to Google Analytics.',
      'no_properties': 'No GA4 properties found in your account.',
      'callback_failed': 'Connection failed. Please try again.',
      'database_error': 'Failed to save connection. Please try again.',
      'invalid_state': 'Invalid request. Please try again.',
    };
    return messages[code] || 'An error occurred. Please try again.';
  }

  return (
    <>
      {/* Connected Header: Status, Date Range, Refresh */}
      {connectionStatus === 'connected' && (
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div data-tour="connected-status" className="flex items-center gap-2">
            <span className="text-sm px-3 py-1.5 rounded-lg" style={{ fontFamily: 'Inter', fontWeight: 500, background: 'rgba(0, 169, 157, 0.1)', color: '#005a54' }}>
              Connected to: <strong>{propertyName}</strong>
            </span>
            <button onClick={handleDisconnect} className="text-sm underline" style={{ fontFamily: 'Inter', color: '#DC2626' }}>
              Disconnect
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div data-tour="date-range">
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
            <button
              data-tour="refresh-button"
              onClick={() => fetchAnalyticsData()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm disabled:opacity-50"
              style={{
                fontFamily: 'Montserrat Alternates',
                fontWeight: 500,
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                color: '#1a1a1a',
              }}
            >
              <RefreshIcon />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl mb-6" style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)' }}>
          <p style={{ fontFamily: 'Inter', fontWeight: 500, color: '#DC2626' }}>{error}</p>
        </div>
      )}

      {/* Loading State */}
      {connectionStatus === 'loading' && (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: '#00A99D', borderTopColor: 'transparent' }} />
        </div>
      )}

      {/* Disconnected State */}
      {connectionStatus === 'disconnected' && (
        <div className="text-center p-12 rounded-2xl" style={{ background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)' }}>
            <AnalyticsIcon />
          </div>
          <h3 className="text-2xl mb-3" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>
            Connect Google Analytics
          </h3>
          <p className="mb-6 max-w-md mx-auto" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>
            Link your GA4 property to see how much traffic AI platforms like ChatGPT, Perplexity, and Claude are sending to your website.
          </p>
          <div data-tour="connect-ga4">
            <ConnectGA4Button />
          </div>
          <div data-tour="connection-benefits" className="mt-6 flex items-center justify-center gap-6 text-sm flex-wrap" style={{ color: '#4a4642' }}>
            <div className="flex items-center gap-2"><CheckIcon /><span style={{ fontFamily: 'Inter', fontWeight: 500 }}>Read-only access</span></div>
            <div className="flex items-center gap-2"><CheckIcon /><span style={{ fontFamily: 'Inter', fontWeight: 500 }}>No data stored</span></div>
            <div className="flex items-center gap-2"><CheckIcon /><span style={{ fontFamily: 'Inter', fontWeight: 500 }}>Disconnect anytime</span></div>
          </div>
        </div>
      )}

      {/* Property Selection */}
      {connectionStatus === 'select_property' && (
        <div data-tour="property-selector">
          <PropertySelector onSelect={handlePropertySelected} />
        </div>
      )}

      {/* Connected State - Analytics Dashboard */}
      {connectionStatus === 'connected' && (
        <>
          {isLoading && !analyticsData ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: '#00A99D', borderTopColor: 'transparent' }} />
            </div>
          ) : analyticsData ? (
            <>
              {/* Stats Cards with Tooltips */}
              <div data-tour="stats-cards" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 items-stretch">
                <div data-tour="stat-sessions">
                  <InsightsCard
                    title="AI Sessions"
                    value={analyticsData.totalSessions.toLocaleString()}
                    change={analyticsData.previousPeriodComparison?.sessionsChange}
                    icon={<SessionsIcon />}
                    tooltip={METRIC_TOOLTIPS.sessions}
                  />
                </div>
                <div data-tour="stat-users">
                  <InsightsCard
                    title="AI Users"
                    value={analyticsData.totalUsers.toLocaleString()}
                    change={analyticsData.previousPeriodComparison?.usersChange}
                    icon={<UsersIcon />}
                    tooltip={METRIC_TOOLTIPS.users}
                  />
                </div>
                <div data-tour="stat-conversions">
                  <InsightsCard
                    title="Conversions"
                    value={analyticsData.totalConversions.toLocaleString()}
                    change={analyticsData.previousPeriodComparison?.conversionsChange}
                    icon={<ConversionsIcon />}
                    tooltip={METRIC_TOOLTIPS.conversions}
                  />
                </div>
                <div data-tour="stat-engagement">
                  <InsightsCard
                    title="Engagement Rate"
                    value={`${analyticsData.avgEngagementRate}%`}
                    icon={<EngagementIcon />}
                    tooltip={METRIC_TOOLTIPS.engagement}
                  />
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div data-tour="trend-chart" className="lg:col-span-2 p-6 rounded-2xl" style={{ background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
                  <h3 className="text-base mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>AI Traffic Trend</h3>
                  <AIReferralChart type="trend" data={analyticsData.trend} />
                </div>
                <div data-tour="sources-chart" className="p-6 rounded-2xl" style={{ background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
                  <h3 className="text-base mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>Traffic by AI Platform</h3>
                  <AIReferralChart type="sources" data={analyticsData.bySource} />
                </div>
              </div>

              {/* Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div data-tour="sources-table" className="p-6 rounded-2xl" style={{ background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
                  <h3 className="text-base mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>Top AI Sources</h3>
                  <ReferralTable type="sources" data={analyticsData.bySource} />
                </div>
                <div data-tour="landing-pages" className="p-6 rounded-2xl" style={{ background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
                  <h3 className="text-base mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>Top Landing Pages</h3>
                  <ReferralTable type="pages" data={analyticsData.byLandingPage} />
                </div>
              </div>

              {/* No Data Message */}
              {analyticsData.totalSessions === 0 && (
                <div className="text-center p-12 rounded-2xl mt-6" style={{ background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
                  <div className="text-5xl mb-4">📊</div>
                  <h3 className="text-xl mb-3" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>No AI Traffic Yet</h3>
                  <p className="max-w-md mx-auto mb-4" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>
                    We haven&apos;t detected any visitors from AI platforms in this time period. This is normal if you&apos;re just getting started with GEO!
                  </p>
                  <p className="inline-block px-4 py-3 rounded-xl text-sm" style={{ fontFamily: 'Inter', fontWeight: 500, background: 'rgba(250, 168, 25, 0.1)', color: '#4a4642' }}>
                    <strong>Tip:</strong> Use Clemelopy&apos;s tools to optimize your content for AI discoverability, then check back in a few weeks.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </>
      )}
    </>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function AnalyticsPage() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('loading');
  const [showTour, setShowTour] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('clemelopy_analytics_tour_completed') === 'true';
    setTourCompleted(completed);
  }, []);

  const tourSteps = getAnalyticsTourSteps(connectionStatus);

  const handleTourComplete = () => {
    setShowTour(false);
    setTourCompleted(true);
    localStorage.setItem('clemelopy_analytics_tour_completed', 'true');
  };

  return (
    <Layout activeNav="tools">
      <main>
        {/* Page Header */}
        <header className="rounded-2xl px-8 py-12 mb-8" style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.05) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1 text-center">
              <h1 className="text-3xl lg:text-4xl mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}>
                <span style={{ color: '#1a1a1a' }}>AI Traffic </span>
                <span style={{ background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Analytics
                </span>
              </h1>
              <p className="text-base max-w-2xl mx-auto" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>
                Track visitors coming from ChatGPT, Perplexity, Claude, and other AI platforms.
              </p>
            </div>
            <TourHelpButton onClick={() => setShowTour(true)} hasCompleted={tourCompleted} />
          </div>
        </header>

        {/* Main Content */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.25)', 
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)', 
          border: '1px solid rgba(255, 255, 255, 0.4)', 
          borderRadius: '32px', 
          padding: '32px', 
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' 
        }}>
          <Suspense fallback={<LoadingSpinner />}>
            <AnalyticsContent connectionStatus={connectionStatus} setConnectionStatus={setConnectionStatus} />
          </Suspense>
        </div>
      </main>

      {/* Tour */}
      <PageTour
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        onComplete={handleTourComplete}
        onSkip={() => { setShowTour(false); localStorage.setItem('clemelopy_analytics_tour_dismissed', 'true'); }}
        steps={tourSteps}
        tourName="analytics"
      />
    </Layout>
  );
}

// ============================================
// ICON COMPONENTS
// ============================================

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: '#00A99D', borderTopColor: 'transparent' }} />
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A99D" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SessionsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ConversionsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function EngagementIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}