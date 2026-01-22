'use client';

/**
 * Analytics Dashboard Page
 * 
 * Main page for viewing AI referral traffic analytics.
 * Uses Clemelopy's glassmorphic design system with PageHeader and PageContainer.
 */

import { useState, useEffect, Suspense } from 'react';
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
import PageHeader from '../../components/PageHeader';
import PageContainer from '../../components/PageContainer';

type ConnectionStatus = 'loading' | 'disconnected' | 'select_property' | 'connected';
type DateRange = '7days' | '30days' | '90days';

// Inner component that uses useSearchParams
function AnalyticsContent() {
  const searchParams = useSearchParams();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('loading');
  const [analyticsData, setAnalyticsData] = useState<AIReferralData | null>(null);
  const [propertyName, setPropertyName] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  // Handle OAuth callback params
  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      if (searchParams.get('select_property') === 'true') {
        setConnectionStatus('select_property');
      } else {
        checkConnectionStatus();
      }
    }
    
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(getErrorMessage(errorParam));
    }
  }, [searchParams]);

  // Fetch data when connected and date range changes
  useEffect(() => {
    if (connectionStatus === 'connected') {
      fetchAnalyticsData();
    }
  }, [connectionStatus, dateRange]);

  async function checkConnectionStatus() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setConnectionStatus('disconnected');
        return;
      }

      const response = await fetch('/api/analytics/properties', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.status === 404) {
        setConnectionStatus('disconnected');
        return;
      }

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
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
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
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
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
      {/* Header Actions - Date Range & Refresh */}
      {connectionStatus === 'connected' && (
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span 
              className="text-sm px-3 py-1.5 rounded-lg"
              style={{ 
                fontFamily: 'Inter', 
                fontWeight: 500, 
                background: 'rgba(0, 169, 157, 0.1)',
                color: '#005a54',
              }}
            >
              Connected to: <strong>{propertyName}</strong>
            </span>
            <button 
              onClick={handleDisconnect}
              className="text-sm underline"
              style={{ fontFamily: 'Inter', color: '#DC2626' }}
            >
              Disconnect
            </button>
          </div>
          <div className="flex items-center gap-3">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <button
              onClick={() => fetchAnalyticsData()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm disabled:opacity-50"
              style={{
                fontFamily: 'Montserrat Alternates',
                fontWeight: 500,
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
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
        <div 
          className="p-4 rounded-xl mb-6"
          style={{
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
          }}
        >
          <p style={{ fontFamily: 'Inter', fontWeight: 500, color: '#DC2626' }}>
            {error}
          </p>
        </div>
      )}

      {/* Loading State */}
      {connectionStatus === 'loading' && (
        <div className="flex items-center justify-center py-20">
          <div 
            className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: '#00A99D', borderTopColor: 'transparent' }}
          />
        </div>
      )}

      {/* Disconnected State - Show Connect Button */}
      {connectionStatus === 'disconnected' && (
        <div 
          className="text-center p-12 rounded-2xl"
          style={{
            background: 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
          }}
        >
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{
              background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
            }}
          >
            <AnalyticsIcon />
          </div>
          <h3 
            className="text-2xl mb-3"
            style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}
          >
            Connect Google Analytics
          </h3>
          <p 
            className="mb-6 max-w-md mx-auto"
            style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
          >
            Link your GA4 property to see how much traffic AI platforms like ChatGPT, 
            Perplexity, and Claude are sending to your website.
          </p>
          <ConnectGA4Button />
          <div className="mt-6 flex items-center justify-center gap-6 text-sm" style={{ color: '#4a4642' }}>
            <div className="flex items-center gap-2">
              <CheckIcon />
              <span style={{ fontFamily: 'Inter', fontWeight: 500 }}>Read-only access</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon />
              <span style={{ fontFamily: 'Inter', fontWeight: 500 }}>No data stored</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon />
              <span style={{ fontFamily: 'Inter', fontWeight: 500 }}>Disconnect anytime</span>
            </div>
          </div>
        </div>
      )}

      {/* Property Selection State */}
      {connectionStatus === 'select_property' && (
        <PropertySelector onSelect={handlePropertySelected} />
      )}

      {/* Connected State - Show Analytics */}
      {connectionStatus === 'connected' && (
        <>
          {isLoading && !analyticsData ? (
            <div className="flex items-center justify-center py-20">
              <div 
                className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
                style={{ borderColor: '#00A99D', borderTopColor: 'transparent' }}
              />
            </div>
          ) : analyticsData ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <InsightsCard
                  title="AI Sessions"
                  value={analyticsData.totalSessions.toLocaleString()}
                  change={analyticsData.previousPeriodComparison.sessionsChange}
                  icon={<SessionsIcon />}
                />
                <InsightsCard
                  title="AI Users"
                  value={analyticsData.totalUsers.toLocaleString()}
                  change={analyticsData.previousPeriodComparison.usersChange}
                  icon={<UsersIcon />}
                />
                <InsightsCard
                  title="Conversions"
                  value={analyticsData.totalConversions.toLocaleString()}
                  change={analyticsData.previousPeriodComparison.conversionsChange}
                  icon={<ConversionsIcon />}
                />
                <InsightsCard
                  title="Engagement Rate"
                  value={`${analyticsData.avgEngagementRate}%`}
                  icon={<EngagementIcon />}
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Trend Chart - Takes 2 columns */}
                <div 
                  className="lg:col-span-2 p-6 rounded-2xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                  }}
                >
                  <h3 
                    className="text-base mb-4"
                    style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}
                  >
                    AI Traffic Trend
                  </h3>
                  <AIReferralChart type="trend" data={analyticsData.trend} />
                </div>
                
                {/* Sources Chart */}
                <div 
                  className="p-6 rounded-2xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                  }}
                >
                  <h3 
                    className="text-base mb-4"
                    style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}
                  >
                    Traffic by AI Platform
                  </h3>
                  <AIReferralChart type="sources" data={analyticsData.bySource} />
                </div>
              </div>

              {/* Tables Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div 
                  className="p-6 rounded-2xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                  }}
                >
                  <h3 
                    className="text-base mb-4"
                    style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}
                  >
                    Top AI Sources
                  </h3>
                  <ReferralTable type="sources" data={analyticsData.bySource} />
                </div>
                <div 
                  className="p-6 rounded-2xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                  }}
                >
                  <h3 
                    className="text-base mb-4"
                    style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}
                  >
                    Top Landing Pages
                  </h3>
                  <ReferralTable type="pages" data={analyticsData.byLandingPage} />
                </div>
              </div>

              {/* No Data Message */}
              {analyticsData.totalSessions === 0 && (
                <div 
                  className="text-center p-12 rounded-2xl mt-6"
                  style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                  }}
                >
                  <div className="text-5xl mb-4">📊</div>
                  <h3 
                    className="text-xl mb-3"
                    style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}
                  >
                    No AI Traffic Yet
                  </h3>
                  <p 
                    className="max-w-md mx-auto mb-4"
                    style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
                  >
                    We haven't detected any visitors from AI platforms in this time period. 
                    This is normal if you're just getting started with GEO!
                  </p>
                  <p 
                    className="inline-block px-4 py-3 rounded-xl text-sm"
                    style={{ 
                      fontFamily: 'Inter', 
                      fontWeight: 500, 
                      background: 'rgba(250, 168, 25, 0.1)',
                      color: '#4a4642',
                    }}
                  >
                    <strong>Tip:</strong> Use Clemelopy's tools to optimize your content 
                    for AI discoverability, then check back in a few weeks.
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

// Loading fallback for Suspense
function AnalyticsLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div 
        className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: '#00A99D', borderTopColor: 'transparent' }}
      />
    </div>
  );
}

// Main page component with Suspense boundary
export default function AnalyticsPage() {
  return (
    <Layout activeNav="tools">
      <main>
        {/* Page Header */}
        <PageHeader
          titleStart="AI Traffic"
          titleEnd="Analytics"
          subtitle="Track visitors coming from ChatGPT, Perplexity, Claude, and other AI platforms."
          centered={true}
          showTour={true}
          onTourClick={() => console.log('Tour clicked')}
        />

        {/* Main Content Container */}
        <PageContainer>
          <Suspense fallback={<AnalyticsLoadingFallback />}>
            <AnalyticsContent />
          </Suspense>
        </PageContainer>
      </main>
    </Layout>
  );
}

// ============================================
// Icon Components
// ============================================

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