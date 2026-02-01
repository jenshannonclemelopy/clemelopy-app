'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import PageContainer from '../../components/PageContainer';
import PageTour from '../../components/PageTour';
import { shareOfModelTourSteps } from '../../components/shareOfModelTourSteps';
import { supabase } from '../../lib/supabase';

// ============================================
// TYPES
// ============================================

interface Competitor {
  id: string;
  name: string;
  domain: string | null;
  is_own_brand: boolean;
  created_at: string;
}

interface Query {
  id: string;
  query_text: string;
  query_type: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

interface TestResult {
  id: string;
  query_text: string;
  platform: string;
  response_text: string;
  created_at: string;
  mentions: MentionData[];
}

interface MentionData {
  competitor_id: string;
  competitor_name: string;
  is_own_brand: boolean;
  position: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  is_recommendation: boolean;
  has_citation: boolean;
  context_snippet?: string;
}

interface ShareMetrics {
  competitor_id: string;
  competitor_name: string;
  is_own_brand: boolean;
  total_mentions: number;
  share_percentage: number;
  avg_position: number;
  sentiment_breakdown: { positive: number; neutral: number; negative: number };
  citation_rate: number;
  recommendation_rate: number;
  platform_breakdown: Record<string, number>;
}

interface UserSubscription {
  plan: string;
  status: string;
}

interface SOMUsage {
  allowed: boolean;
  usage: number;
  limit: number;
  remaining: number;
  reset_date: string | null;
  error?: string;
}

const WORKER_URL = process.env.NEXT_PUBLIC_SOM_APP_WORKER_URL || 'https://som-app.jen-86f.workers.dev';

const PLATFORMS = [
  { id: 'chatgpt', name: 'ChatGPT', icon: '🤖', color: '#10a37f' },
  { id: 'perplexity', name: 'Perplexity', icon: '🔍', color: '#1a73e8' },
  { id: 'claude', name: 'Claude', icon: '🧠', color: '#cc785c' },
  { id: 'gemini', name: 'Gemini', icon: '✨', color: '#4285f4' },
  { id: 'google_ai', name: 'Google AI', icon: '🌐', color: '#ea4335' },
];

const QUERY_TYPES = [
  { id: 'category', label: 'Category', icon: '📂', example: 'What is [topic]?' },
  { id: 'solution', label: 'Solution', icon: '🛠️', example: 'Best tools for [problem]' },
  { id: 'comparison', label: 'Comparison', icon: '⚖️', example: '[Brand A] vs [Brand B]' },
  { id: 'use_case', label: 'Use Case', icon: '🎯', example: 'How to [achieve goal]' },
  { id: 'recommendation', label: 'Recommendation', icon: '💡', example: 'What do you recommend...' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function ShareOfModelPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [somUsage, setSomUsage] = useState<SOMUsage | null>(null);
  
  // Data
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [queries, setQueries] = useState<Query[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [shareMetrics, setShareMetrics] = useState<ShareMetrics[]>([]);
  
  // UI
  const [activeTab, setActiveTab] = useState<'dashboard' | 'manual' | 'automated' | 'competitors' | 'queries' | 'history' | 'research'>('dashboard');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [showTour, setShowTour] = useState(false);

  const isGrowth = (subscription?.plan === 'growth' || subscription?.plan === 'unlimited') && subscription?.status === 'active';

  // Load confetti script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
    document.body.appendChild(script);

    script.onload = () => {
      (window as any).clemelopyCornerConfetti = function () {
        console.log("🎉 Clemelopy plume confetti firing!");

        const clemelopyColors = [
          '#FAA819','#E99502','#FFB547',
          '#00A99D','#009788','#84DCC6',
          '#FDE5C5','#FFE8A3'
        ];

        let colorIndex = 0;
        function nextColor() {
          colorIndex = (colorIndex + 1) % clemelopyColors.length;
          return clemelopyColors[colorIndex];
        }

        function rand(min: number, max: number) { 
          return Math.random() * (max - min) + min; 
        }

        const duration = 2400;
        const end = Date.now() + duration;
        const confetti = (window as any).confetti;

        (function frame(){
          confetti({
            particleCount: 2,
            angle: 90 + rand(-6,6),
            spread: 28,
            startVelocity: 95,
            gravity: 0.78,
            ticks: 420,
            origin: { x: rand(0.00,0.03), y: 1 },
            scalar: 1.05,
            shapes: ['square'],
            colors: [nextColor()],
            drift: rand(-0.4, 0.4)
          });

          confetti({
            particleCount: 2,
            angle: 90 + rand(-6,6),
            spread: 28,
            startVelocity: 95,
            gravity: 0.78,
            ticks: 420,
            origin: { x: rand(0.97,1.00), y: 1 },
            scalar: 1.05,
            shapes: ['square'],
            colors: [nextColor()],
            drift: rand(-0.4, 0.4)
          });

          if (Date.now() < end) requestAnimationFrame(frame);
        })();
      };
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (competitors.length > 0 && testResults.length > 0) {
      calculateMetrics();
    }
  }, [competitors, testResults, dateRange]);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Get subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      
      setSubscription(subData);

      // If Growth or Unlimited, check SOM usage
      if (subData?.plan === 'growth' || subData?.plan === 'unlimited') {
        try {
          const usageRes = await fetch(
            `${WORKER_URL}/usage?user_id=${user.id}&email=${encodeURIComponent(user.email || '')}`,
            { method: 'GET' }
          );
          const usageData = await usageRes.json();
          setSomUsage(usageData);
        } catch (err) {
          console.error('Failed to check usage:', err);
        }
      }

      // Load competitors
      const { data: compData } = await supabase
        .from('som_competitors')
        .select('*')
        .eq('user_id', user.id)
        .order('is_own_brand', { ascending: false });
      
      setCompetitors(compData || []);

      // Load queries
      const { data: queryData } = await supabase
        .from('som_queries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      setQueries(queryData || []);

      // Load test results with mentions
      const { data: resultsData } = await supabase
        .from('som_query_results')
        .select(`
          *,
          mentions:som_mentions(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);
      
      setTestResults(resultsData || []);

    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  function calculateMetrics() {
    // Filter by date range
    const now = new Date();
    const cutoff = new Date();
    if (dateRange === '7d') cutoff.setDate(now.getDate() - 7);
    else if (dateRange === '30d') cutoff.setDate(now.getDate() - 30);
    else if (dateRange === '90d') cutoff.setDate(now.getDate() - 90);
    else cutoff.setFullYear(2020);

    const filteredResults = testResults.filter(r => new Date(r.created_at) >= cutoff);
    
    // Gather all mentions
    const allMentions: MentionData[] = [];
    filteredResults.forEach(result => {
      if (result.mentions) {
        result.mentions.forEach((m: any) => {
          const comp = competitors.find(c => c.id === m.competitor_id);
          if (comp) {
            allMentions.push({
              ...m,
              competitor_name: comp.name,
              is_own_brand: comp.is_own_brand,
              platform: result.platform,
            });
          }
        });
      }
    });

    // Calculate metrics per competitor
    const metrics: ShareMetrics[] = competitors.map(comp => {
      const compMentions = allMentions.filter(m => m.competitor_id === comp.id);
      const totalMentions = allMentions.length || 1;
      
      // Platform breakdown
      const platformBreakdown: Record<string, number> = {};
      PLATFORMS.forEach(p => {
        platformBreakdown[p.id] = compMentions.filter((m: any) => m.platform === p.id).length;
      });

      // Sentiment breakdown
      const sentimentBreakdown = {
        positive: compMentions.filter(m => m.sentiment === 'positive').length,
        neutral: compMentions.filter(m => m.sentiment === 'neutral').length,
        negative: compMentions.filter(m => m.sentiment === 'negative').length,
      };

      return {
        competitor_id: comp.id,
        competitor_name: comp.name,
        is_own_brand: comp.is_own_brand,
        total_mentions: compMentions.length,
        share_percentage: Math.round((compMentions.length / totalMentions) * 100 * 10) / 10,
        avg_position: compMentions.length > 0
          ? Math.round((compMentions.reduce((sum, m) => sum + (m.position || 0), 0) / compMentions.length) * 10) / 10
          : 0,
        sentiment_breakdown: sentimentBreakdown,
        citation_rate: compMentions.length > 0
          ? Math.round((compMentions.filter(m => m.has_citation).length / compMentions.length) * 100)
          : 0,
        recommendation_rate: compMentions.length > 0
          ? Math.round((compMentions.filter(m => m.is_recommendation).length / compMentions.length) * 100)
          : 0,
        platform_breakdown: platformBreakdown,
      };
    }).sort((a, b) => b.share_percentage - a.share_percentage);

    setShareMetrics(metrics);
  }

  const handleTourClick = () => setShowTour(true);

  // Tab config
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'manual', label: 'Manual Test', icon: '✍️' },
    { id: 'automated', label: 'Automated Test', icon: '🤖', requiresGrowth: true },
    { id: 'competitors', label: 'Competitors', icon: '🏢' },
    { id: 'queries', label: 'Queries', icon: '💬' },
    { id: 'history', label: 'History', icon: '📜' },
    { id: 'research', label: 'Research', icon: '🔬' },
  ];

  if (loading) {
    return (
      <Layout activeNav="tools">
        <main className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-[#4a4642]" style={{ fontFamily: 'Inter' }}>
            Loading Share of Model...
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout activeNav="tools">
      <main>
        <PageHeader
          titleStart="Share of"
          titleEnd="Model"
          subtitle="Track your brand visibility across AI search platforms like ChatGPT, Perplexity, Claude, and Gemini."
          centered={true}
          showTour={true}
          onTourClick={handleTourClick}
        />

        <PageContainer>
          {/* Tab Navigation */}
          <nav 
            className="flex flex-wrap gap-2 mb-6 pb-6"
            style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isLocked = tab.requiresGrowth && !isGrowth;
              
              return (
                <button
                  key={tab.id}
                  data-tour={`som-tab-${tab.id}`}
                  onClick={() => isLocked ? setShowUpgradeModal(true) : setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 text-sm ${
                    isActive ? 'shadow-sm' : 'hover:bg-white/50'
                  }`}
                  style={{
                    fontFamily: 'Montserrat Alternates',
                    background: isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
                    border: isActive ? '1px solid rgba(0, 169, 157, 0.3)' : '1px solid transparent',
                    color: isActive ? '#0D7871' : isLocked ? '#9ca3af' : '#4a4642',
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {isLocked && (
                    <span 
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(250, 168, 25, 0.15), rgba(0, 169, 157, 0.15))',
                        color: '#b37400',
                        fontFamily: 'Inter',
                        fontWeight: 600,
                      }}
                    >
                      Growth
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'dashboard' && (
              <DashboardTab 
                shareMetrics={shareMetrics}
                testResults={testResults}
                competitors={competitors}
                queries={queries}
                dateRange={dateRange}
                setDateRange={setDateRange}
                isGrowth={isGrowth}
                onTabChange={setActiveTab}
                onUpgradeClick={() => setShowUpgradeModal(true)}
              />
            )}

            {activeTab === 'manual' && (
              <ManualTestTab 
                competitors={competitors}
                queries={queries}
                userId={user?.id}
                onTestComplete={loadData}
                onTabChange={setActiveTab}
              />
            )}

            {activeTab === 'automated' && (
              <AutomatedTestTab
                competitors={competitors}
                queries={queries}
                userId={user?.id}
                userEmail={user?.email}
                somUsage={somUsage}
                isGrowth={isGrowth}
                onTestComplete={loadData}
                onUpgradeClick={() => setShowUpgradeModal(true)}
              />
            )}

            {activeTab === 'competitors' && (
              <CompetitorsTab
                competitors={competitors}
                userId={user?.id}
                onUpdate={loadData}
              />
            )}

            {activeTab === 'queries' && (
              <QueriesTab
                queries={queries}
                userId={user?.id}
                onUpdate={loadData}
              />
            )}

            {activeTab === 'history' && (
              <HistoryTab
                testResults={testResults}
                competitors={competitors}
              />
            )}

            {activeTab === 'research' && (
              <ResearchTab
                userId={user?.id}
                userEmail={user?.email || ''}
                ownBrand={competitors.find(c => c.is_own_brand)}
                isGrowth={isGrowth}
              />
            )}
          </div>
        </PageContainer>

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
        )}

        {/* Page Tour */}
        <PageTour
          steps={shareOfModelTourSteps}
          isOpen={showTour}
          onClose={() => setShowTour(false)}
          onComplete={() => setShowTour(false)}
          tourName="share-of-model"
        />
      </main>
    </Layout>
  );
}

// ============================================
// SHARED STYLES
// ============================================

const cardStyle = {
  background: 'rgba(255, 255, 255, 0.7)',
  border: '1px solid rgba(255, 255, 255, 0.9)',
  borderRadius: '16px',
  padding: '20px',
};

const inputStyle = {
  fontFamily: 'Inter',
  fontSize: '14px',
  background: 'rgba(255, 255, 255, 0.9)',
  border: '1px solid rgba(0, 0, 0, 0.08)',
  borderRadius: '12px',
  padding: '12px 16px',
  outline: 'none',
  width: '100%',
};

// ============================================
// INFO TOOLTIP COMPONENT
// ============================================

function InfoTooltip({ content, title }: { content: string; title?: string }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsVisible(!isVisible)}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="flex items-center justify-center w-5 h-5 rounded-full transition-all duration-200"
        style={{
          background: 'rgba(0, 169, 157, 0.1)',
          border: '1px solid rgba(0, 169, 157, 0.3)',
          color: '#00A99D',
        }}
        aria-label={`Info about ${title || 'this metric'}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>

      {isVisible && (
        <div
          className="absolute z-50 bottom-full right-0 mb-2"
          style={{
            width: '240px',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0, 169, 157, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          }}
        >
          {title && (
            <div 
              className="font-semibold mb-1 text-sm"
              style={{ fontFamily: 'Montserrat Alternates', color: '#0D7871' }}
            >
              {title}
            </div>
          )}
          <div 
            className="text-xs leading-relaxed"
            style={{ fontFamily: 'Inter', color: '#4a4642' }}
          >
            {content}
          </div>
          <div
            className="absolute -bottom-1.5 right-4 w-3 h-3 rotate-45"
            style={{
              background: 'rgba(255, 255, 255, 0.98)',
              borderRight: '1px solid rgba(0, 169, 157, 0.2)',
              borderBottom: '1px solid rgba(0, 169, 157, 0.2)',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// DASHBOARD TAB
// ============================================

function DashboardTab({ 
  shareMetrics, 
  testResults,
  competitors,
  queries,
  dateRange,
  setDateRange,
  isGrowth,
  onTabChange,
  onUpgradeClick,
}: { 
  shareMetrics: ShareMetrics[];
  testResults: TestResult[];
  competitors: Competitor[];
  queries: Query[];
  dateRange: string;
  setDateRange: (range: any) => void;
  isGrowth: boolean;
  onTabChange: (tab: any) => void;
  onUpgradeClick: () => void;
}) {
  const [selectedPlatformDetail, setSelectedPlatformDetail] = useState<string | null>(null);
  const [selectedCompetitorDetail, setSelectedCompetitorDetail] = useState<string | null>(null);
  
  const ownBrandMetrics = shareMetrics.find(m => m.is_own_brand);
  const competitorMetrics = shareMetrics.filter(m => !m.is_own_brand);
  const totalTests = testResults.length;

  // Calculate overall sentiment for own brand
  const ownSentimentScore = ownBrandMetrics 
    ? ((ownBrandMetrics.sentiment_breakdown.positive * 1) + 
       (ownBrandMetrics.sentiment_breakdown.neutral * 0) + 
       (ownBrandMetrics.sentiment_breakdown.negative * -1)) / 
      (Math.max(ownBrandMetrics.total_mentions, 1))
    : 0;

  const hasData = shareMetrics.length > 0 && testResults.length > 0;

  return (
    <div>
      {/* Date Range Filter */}
      <div className="flex items-center justify-between mb-6">
        <h2 
          className="text-lg font-bold"
          style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}
        >
          Performance Overview
        </h2>
        <div className="flex gap-1">
          {[
            { id: '7d', label: '7 days' },
            { id: '30d', label: '30 days' },
            { id: '90d', label: '90 days' },
            { id: 'all', label: 'All time' },
          ].map(range => (
            <button
              key={range.id}
              onClick={() => setDateRange(range.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                fontFamily: 'Inter',
                background: dateRange === range.id ? 'rgba(0, 169, 157, 0.15)' : 'rgba(255, 255, 255, 0.6)',
                color: dateRange === range.id ? '#0D7871' : '#6b6560',
                border: dateRange === range.id ? '1px solid rgba(0, 169, 157, 0.2)' : '1px solid transparent',
              }}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        /* Empty State */
        <div style={cardStyle} className="text-center py-12">
          <div className="text-5xl mb-4">📊</div>
          <h3 
            className="text-xl font-bold mb-2"
            style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}
          >
            Start Tracking Your AI Visibility
          </h3>
          <p className="mb-6 max-w-md mx-auto" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
            Add your brand and competitors, then run tests to see how you compare across AI platforms.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {competitors.length === 0 ? (
              <button
                onClick={() => onTabChange('competitors')}
                className="px-5 py-2.5 rounded-xl text-white font-medium text-sm transition-all hover:shadow-lg"
                style={{ 
                  fontFamily: 'Montserrat Alternates',
                  background: 'linear-gradient(135deg, #00A99D, #0D7871)',
                }}
              >
                🏢 Add Your Brand
              </button>
            ) : (
              <>
                <button
                  onClick={() => onTabChange('manual')}
                  className="px-5 py-2.5 rounded-xl text-white font-medium text-sm transition-all hover:shadow-lg"
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    background: 'linear-gradient(135deg, #FAA819, #E99502)',
                  }}
                >
                  ✍️ Run Manual Test
                </button>
                <button
                  onClick={() => isGrowth ? onTabChange('automated') : onUpgradeClick()}
                  className="px-5 py-2.5 rounded-xl text-white font-medium text-sm transition-all hover:shadow-lg"
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    background: 'linear-gradient(135deg, #00A99D, #0D7871)',
                  }}
                >
                  🤖 Run Automated Test
                </button>
              </>
            )}
          </div>

          {/* Setup checklist */}
          <div 
            className="mt-8 p-4 rounded-xl text-left max-w-md mx-auto"
            style={{ background: 'rgba(250, 168, 25, 0.08)' }}
          >
            <h4 className="font-semibold mb-3 text-sm" style={{ fontFamily: 'Montserrat Alternates', color: '#b37400' }}>
              Getting Started Checklist
            </h4>
            <ul className="space-y-2 text-sm" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
              <li className="flex items-center gap-2">
                <span style={{ color: competitors.some(c => c.is_own_brand) ? '#00A99D' : '#d1d5db' }}>
                  {competitors.some(c => c.is_own_brand) ? '✓' : '○'}
                </span>
                Add your brand
              </li>
              <li className="flex items-center gap-2">
                <span style={{ color: competitors.filter(c => !c.is_own_brand).length >= 2 ? '#00A99D' : '#d1d5db' }}>
                  {competitors.filter(c => !c.is_own_brand).length >= 2 ? '✓' : '○'}
                </span>
                Add 2-3 competitors
              </li>
              <li className="flex items-center gap-2">
                <span style={{ color: queries.length >= 5 ? '#00A99D' : '#d1d5db' }}>
                  {queries.length >= 5 ? '✓' : '○'}
                </span>
                Create 5+ test queries
              </li>
              <li className="flex items-center gap-2">
                <span style={{ color: testResults.length > 0 ? '#00A99D' : '#d1d5db' }}>
                  {testResults.length > 0 ? '✓' : '○'}
                </span>
                Run your first test
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div data-tour="som-metrics-cards" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Share of Voice */}
            <div style={cardStyle}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                  Your Share of Voice
                </span>
                <div className="flex items-center gap-2">
                  <InfoTooltip 
                    title="Share of Voice"
                    content="The percentage of AI mentions your brand receives compared to all tracked competitors. Higher is better — aim for 20%+ to be a market leader in AI visibility."
                  />
                  <span className="text-lg">📈</span>
                </div>
              </div>
              <div 
                className="text-3xl font-bold"
                style={{ 
                  fontFamily: 'Montserrat Alternates', 
                  color: (ownBrandMetrics?.share_percentage || 0) >= 20 ? '#00A99D' : '#E99502'
                }}
              >
                {ownBrandMetrics?.share_percentage || 0}%
              </div>
              <div className="text-xs mt-1" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                {ownBrandMetrics?.total_mentions || 0} mentions total
              </div>
            </div>

            {/* Average Position */}
            <div style={cardStyle}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                  Avg. Position
                </span>
                <div className="flex items-center gap-2">
                  <InfoTooltip 
                    title="Average Position"
                    content="Where your brand typically appears in AI responses. Position #1-2 means you're mentioned first — users are most likely to notice and trust early mentions."
                  />
                  <span className="text-lg">📍</span>
                </div>
              </div>
              <div 
                className="text-3xl font-bold"
                style={{ 
                  fontFamily: 'Montserrat Alternates', 
                  color: (ownBrandMetrics?.avg_position || 0) <= 2 ? '#00A99D' : '#E99502'
                }}
              >
                #{ownBrandMetrics?.avg_position || '-'}
              </div>
              <div className="text-xs mt-1" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                {(ownBrandMetrics?.avg_position || 0) <= 2 ? 'Great!' : 'Room to improve'}
              </div>
            </div>

            {/* Sentiment Score */}
            <div style={cardStyle}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                  Sentiment
                </span>
                <div className="flex items-center gap-2">
                  <InfoTooltip 
                    title="Sentiment"
                    content="How AI platforms describe your brand. Positive mentions (recommendations, praise) help build trust. Negative mentions may indicate reputation issues to address."
                  />
                  <span className="text-lg">{ownSentimentScore > 0.3 ? '😊' : ownSentimentScore < -0.3 ? '😟' : '😐'}</span>
                </div>
              </div>
              <div className="flex gap-1 mt-2">
                <div 
                  className="h-2 rounded-full"
                  style={{ 
                    width: `${(ownBrandMetrics?.sentiment_breakdown.positive || 0) / Math.max(ownBrandMetrics?.total_mentions || 1, 1) * 100}%`,
                    background: '#00A99D',
                    minWidth: '4px',
                  }}
                />
                <div 
                  className="h-2 rounded-full"
                  style={{ 
                    width: `${(ownBrandMetrics?.sentiment_breakdown.neutral || 0) / Math.max(ownBrandMetrics?.total_mentions || 1, 1) * 100}%`,
                    background: '#94a3b8',
                    minWidth: '4px',
                  }}
                />
                <div 
                  className="h-2 rounded-full"
                  style={{ 
                    width: `${(ownBrandMetrics?.sentiment_breakdown.negative || 0) / Math.max(ownBrandMetrics?.total_mentions || 1, 1) * 100}%`,
                    background: '#ef4444',
                    minWidth: '4px',
                  }}
                />
              </div>
              <div className="flex justify-between text-xs mt-2" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                <span>👍 {ownBrandMetrics?.sentiment_breakdown.positive || 0}</span>
                <span>➖ {ownBrandMetrics?.sentiment_breakdown.neutral || 0}</span>
                <span>👎 {ownBrandMetrics?.sentiment_breakdown.negative || 0}</span>
              </div>
            </div>

            {/* Citation Rate */}
            <div style={cardStyle}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                  Citation Rate
                </span>
                <div className="flex items-center gap-2">
                  <InfoTooltip 
                    title="Citation Rate"
                    content="How often AI platforms include a link to your website when mentioning your brand. Citations drive direct traffic and signal that AI trusts your content as authoritative."
                  />
                  <span className="text-lg">🔗</span>
                </div>
              </div>
              <div 
                className="text-3xl font-bold"
                style={{ 
                  fontFamily: 'Montserrat Alternates', 
                  color: (ownBrandMetrics?.citation_rate || 0) >= 30 ? '#00A99D' : '#E99502'
                }}
              >
                {ownBrandMetrics?.citation_rate || 0}%
              </div>
              <div className="text-xs mt-1" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                AI links to your site
              </div>
            </div>
          </div>

          {/* Share of Voice Comparison */}
          <div data-tour="som-share-of-voice" style={cardStyle} className="mb-6">
            <h3 
              className="font-bold mb-1"
              style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}
            >
              Share of Voice Comparison
            </h3>
            <p className="text-xs mb-4" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
              Click a brand to see where they were mentioned
            </p>
            <div className="space-y-3">
              {shareMetrics.map((metrics, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCompetitorDetail(metrics.competitor_id)}
                  className="w-full flex items-center gap-4 p-2 -m-2 rounded-lg transition-all hover:bg-black/5 cursor-pointer text-left"
                >
                  <div className="w-32 shrink-0">
                    <span 
                      className="text-sm font-medium truncate block"
                      style={{ 
                        fontFamily: 'Inter', 
                        color: metrics.is_own_brand ? '#0D7871' : '#4a4642' 
                      }}
                    >
                      {metrics.competitor_name}
                      {metrics.is_own_brand && ' ⭐'}
                    </span>
                  </div>
                  <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{
                        width: `${Math.max(metrics.share_percentage, 2)}%`,
                        background: metrics.is_own_brand
                          ? 'linear-gradient(90deg, #00A99D, #0D7871)'
                          : 'linear-gradient(90deg, #e5e7eb, #d1d5db)',
                      }}
                    >
                      {metrics.share_percentage >= 10 && (
                        <span className="text-xs font-semibold text-white">
                          {metrics.share_percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-sm font-semibold" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
                      {metrics.share_percentage}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Competitor Detail Modal */}
          {selectedCompetitorDetail && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => setSelectedCompetitorDetail(null)}
            >
              <div 
                className="w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-2xl p-6"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {(() => {
                  const selectedMetrics = shareMetrics.find(m => m.competitor_id === selectedCompetitorDetail);
                  const competitor = competitors.find(c => c.id === selectedCompetitorDetail);
                  const competitorResults = testResults.filter(r => 
                    r.mentions?.some((m: any) => m.competitor_id === selectedCompetitorDetail)
                  );
                  
                  return (
                    <>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
                            {competitor?.name || selectedMetrics?.competitor_name}
                            {selectedMetrics?.is_own_brand && <span className="text-sm">⭐ Your Brand</span>}
                          </h3>
                          <p className="text-sm" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                            Mentioned in {competitorResults.length} AI responses ({selectedMetrics?.share_percentage || 0}% share of voice)
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedCompetitorDetail(null)}
                          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 transition-all"
                          style={{ color: '#6b6560', fontSize: '24px' }}
                        >
                          ×
                        </button>
                      </div>

                      {/* Stats */}
                      {selectedMetrics && (
                        <div className="grid grid-cols-4 gap-3 mb-6">
                          <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(0, 169, 157, 0.1)' }}>
                            <div className="text-lg font-bold" style={{ color: '#0D7871' }}>{selectedMetrics.total_mentions}</div>
                            <div className="text-xs" style={{ color: '#6b6560' }}>Total Mentions</div>
                          </div>
                          <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(0,0,0,0.05)' }}>
                            <div className="text-lg font-bold" style={{ color: '#4a4642' }}>{selectedMetrics.avg_position?.toFixed(1) || 'N/A'}</div>
                            <div className="text-xs" style={{ color: '#6b6560' }}>Avg Position</div>
                          </div>
                          <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                            <div className="text-lg font-bold" style={{ color: '#16a34a' }}>{selectedMetrics.sentiment_breakdown?.positive || 0}</div>
                            <div className="text-xs" style={{ color: '#6b6560' }}>Positive</div>
                          </div>
                          <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(250, 168, 25, 0.1)' }}>
                            <div className="text-lg font-bold" style={{ color: '#b37400' }}>{Math.round(selectedMetrics.recommendation_rate) || 0}%</div>
                            <div className="text-xs" style={{ color: '#6b6560' }}>Recommended</div>
                          </div>
                        </div>
                      )}

                      {/* Results where this competitor was mentioned */}
                      <h4 className="font-medium mb-3" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
                        Mentions ({competitorResults.length})
                      </h4>
                      <div className="space-y-3">
                        {competitorResults.slice(0, 15).map((result, idx) => {
                          const mention = result.mentions?.find((m: any) => m.competitor_id === selectedCompetitorDetail);
                          const platform = PLATFORMS.find(p => p.id === result.platform);
                          
                          return (
                            <div 
                              key={idx}
                              className="p-4 rounded-xl"
                              style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span>{platform?.icon}</span>
                                  <span className="text-xs font-medium" style={{ color: '#6b6560' }}>{platform?.name}</span>
                                  <span className="text-xs" style={{ color: '#9ca3af' }}>
                                    {new Date(result.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                                {mention && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.06)' }}>
                                      #{mention.position}
                                    </span>
                                    {mention.sentiment === 'positive' && <span>👍</span>}
                                    {mention.is_recommendation && <span>⭐</span>}
                                  </div>
                                )}
                              </div>
                              <p className="text-sm mb-2" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
                                "{result.query_text}"
                              </p>
                              <details className="group">
                                <summary className="text-xs cursor-pointer" style={{ color: '#6b6560' }}>
                                  ▶ View response
                                </summary>
                                <div className="mt-2 p-3 rounded-lg text-xs max-h-40 overflow-y-auto" style={{ background: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap' }}>
                                  {result.response_text || 'No response recorded'}
                                </div>
                              </details>
                            </div>
                          );
                        })}
                      </div>

                      {competitorResults.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-sm" style={{ color: '#6b6560' }}>No mentions found for this competitor.</p>
                        </div>
                      )}

                      {competitorResults.length > 15 && (
                        <p className="text-center text-xs mt-4" style={{ color: '#9ca3af' }}>
                          Showing 15 of {competitorResults.length} mentions
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Platform Breakdown */}
          <div data-tour="som-platform-breakdown" style={cardStyle} className="mb-6">
            <h3 
              className="font-bold mb-1"
              style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}
            >
              Your Visibility by Platform
            </h3>
            <p className="text-xs mb-4" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
              Click a platform to see detailed history
            </p>
            {ownBrandMetrics ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {PLATFORMS.map(platform => {
                  const mentions = ownBrandMetrics.platform_breakdown[platform.id] || 0;
                  const totalPlatformMentions = shareMetrics.reduce(
                    (sum, m) => sum + (m.platform_breakdown[platform.id] || 0), 0
                  );
                  const platformShare = totalPlatformMentions > 0 
                    ? Math.round((mentions / totalPlatformMentions) * 100) 
                    : 0;
                  const platformResultCount = testResults.filter(r => r.platform === platform.id).length;
                  
                  return (
                    <button 
                      key={platform.id}
                      onClick={() => setSelectedPlatformDetail(platform.id)}
                      className="p-3 rounded-xl text-center transition-all hover:shadow-md hover:scale-105 cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.6)', border: 'none' }}
                    >
                      <div className="text-2xl mb-1">{platform.icon}</div>
                      <div 
                        className="text-lg font-bold"
                        style={{ fontFamily: 'Montserrat Alternates', color: platform.color }}
                      >
                        {platformShare}%
                      </div>
                      <div className="text-xs" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                        {platform.name}
                      </div>
                      <div className="text-xs mt-1" style={{ fontFamily: 'Inter', color: '#9ca3af' }}>
                        {platformResultCount} result{platformResultCount !== 1 ? 's' : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                Add your brand to see platform breakdown
              </p>
            )}
          </div>

          {/* Platform Detail Modal for Dashboard */}
          {selectedPlatformDetail && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => setSelectedPlatformDetail(null)}
            >
              <div 
                className="w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-2xl p-6"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {(() => {
                  const platform = PLATFORMS.find(p => p.id === selectedPlatformDetail);
                  const platformResults = testResults.filter(r => r.platform === selectedPlatformDetail);
                  const ownBrand = competitors.find(c => c.is_own_brand);
                  const platformMentions = platformResults.filter(r => 
                    r.mentions?.some((m: any) => m.competitor_id === ownBrand?.id || m.is_own_brand)
                  ).length;
                  const percentage = platformResults.length > 0 ? Math.round((platformMentions / platformResults.length) * 100) : 0;
                  
                  return (
                    <>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{platform?.icon}</span>
                          <div>
                            <h3 className="text-xl font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
                              {platform?.name} History
                            </h3>
                            <p className="text-sm" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                              {ownBrand?.name} appeared in {percentage}% of responses ({platformMentions}/{platformResults.length})
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedPlatformDetail(null)}
                          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 transition-all"
                          style={{ color: '#6b6560', fontSize: '24px' }}
                        >
                          ×
                        </button>
                      </div>

                      {/* Results List */}
                      <div className="space-y-4">
                        {platformResults.slice(0, 20).map((result, idx) => {
                          const ownBrandMention = result.mentions?.find((m: any) => 
                            m.competitor_id === ownBrand?.id || m.is_own_brand
                          );
                          const mentionCount = result.mentions?.length || 0;
                          
                          return (
                            <div 
                              key={idx}
                              className="p-4 rounded-xl"
                              style={{ 
                                background: ownBrandMention ? 'rgba(0, 169, 157, 0.05)' : 'rgba(0,0,0,0.03)',
                                border: ownBrandMention ? '1px solid rgba(0, 169, 157, 0.2)' : '1px solid rgba(0,0,0,0.05)',
                              }}
                            >
                              {/* Query and date */}
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-medium text-sm" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
                                    "{result.query_text}"
                                  </h4>
                                  <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                                    {new Date(result.created_at).toLocaleDateString('en-US', { 
                                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                                    })}
                                  </p>
                                </div>
                                {ownBrandMention && (
                                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(0, 169, 157, 0.15)', color: '#0D7871' }}>
                                    ✓ Mentioned #{ownBrandMention.position}
                                  </span>
                                )}
                              </div>

                              {/* Mentions */}
                              {result.mentions && result.mentions.length > 0 && (
                                <div className="mb-3">
                                  <div className="text-xs font-medium mb-2" style={{ color: '#6b6560' }}>
                                    Brands mentioned ({mentionCount}):
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {result.mentions.map((m: any, mIdx: number) => {
                                      const comp = competitors.find(c => c.id === m.competitor_id);
                                      const isOwn = comp?.is_own_brand || m.is_own_brand;
                                      return (
                                        <span 
                                          key={mIdx}
                                          className="text-xs px-2 py-1 rounded-lg"
                                          style={{ 
                                            background: isOwn ? 'rgba(0, 169, 157, 0.15)' : 'rgba(0,0,0,0.05)',
                                            color: isOwn ? '#0D7871' : '#4a4642',
                                          }}
                                        >
                                          #{m.position} {comp?.name || m.competitor_name || 'Unknown'}
                                          {m.sentiment === 'positive' && ' 👍'}
                                          {m.sentiment === 'negative' && ' 👎'}
                                          {m.is_recommendation && ' ⭐'}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Response */}
                              <details className="group">
                                <summary 
                                  className="text-xs cursor-pointer select-none flex items-center gap-1"
                                  style={{ fontFamily: 'Inter', color: '#6b6560' }}
                                >
                                  <span className="group-open:rotate-90 transition-transform">▶</span>
                                  View full response
                                </summary>
                                <div 
                                  className="mt-2 p-3 rounded-lg text-xs max-h-48 overflow-y-auto"
                                  style={{ 
                                    background: 'rgba(255,255,255,0.8)',
                                    color: '#4a4642',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: '1.6',
                                  }}
                                >
                                  {result.response_text || 'No response recorded'}
                                </div>
                              </details>
                            </div>
                          );
                        })}
                      </div>

                      {platformResults.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-sm" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                            No test results for {platform?.name} yet.
                          </p>
                        </div>
                      )}

                      {platformResults.length > 20 && (
                        <p className="text-center text-xs mt-4" style={{ color: '#9ca3af' }}>
                          Showing 20 of {platformResults.length} results. View History tab for all results.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-4">
            <div style={cardStyle}>
              <h4 className="font-semibold mb-2" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
                🏢 Competitors ({competitors.length})
              </h4>
              <p className="text-xs mb-3" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                {competitors.filter(c => c.is_own_brand).length > 0 ? 'Your brand + ' : ''}
                {competitors.filter(c => !c.is_own_brand).length} competitors tracked
              </p>
              <button
                onClick={() => onTabChange('competitors')}
                className="w-full px-3 py-2 rounded-lg text-xs font-medium transition-all hover:shadow-sm"
                style={{
                  fontFamily: 'Montserrat Alternates',
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(0, 169, 157, 0.2)',
                  color: '#0D7871',
                }}
              >
                Manage
              </button>
            </div>

            <div style={cardStyle}>
              <h4 className="font-semibold mb-2" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
                💬 Queries ({queries.filter(q => q.is_active).length})
              </h4>
              <p className="text-xs mb-3" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                {queries.filter(q => q.is_active).length} active test queries
              </p>
              <button
                onClick={() => onTabChange('queries')}
                className="w-full px-3 py-2 rounded-lg text-xs font-medium transition-all hover:shadow-sm"
                style={{
                  fontFamily: 'Montserrat Alternates',
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(250, 168, 25, 0.2)',
                  color: '#b37400',
                }}
              >
                Manage
              </button>
            </div>

            <div style={cardStyle}>
              <h4 className="font-semibold mb-2" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
                📜 Test History ({testResults.length})
              </h4>
              <p className="text-xs mb-3" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                {testResults.length} total test results
              </p>
              <button
                onClick={() => onTabChange('history')}
                className="w-full px-3 py-2 rounded-lg text-xs font-medium transition-all hover:shadow-sm"
                style={{
                  fontFamily: 'Montserrat Alternates',
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  color: '#4a4642',
                }}
              >
                View All
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// MANUAL TEST TAB
// ============================================

function ManualTestTab({ 
  competitors, 
  queries, 
  userId,
  onTestComplete,
  onTabChange,
}: { 
  competitors: Competitor[];
  queries: Query[];
  userId: string;
  onTestComplete: () => void;
  onTabChange: (tab: any) => void;
}) {
  const [platform, setPlatform] = useState<string>('chatgpt');
  const [queryText, setQueryText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [selectedMentions, setSelectedMentions] = useState<Record<string, {
    mentioned: boolean;
    position: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    isRecommendation: boolean;
    hasCitation: boolean;
  }>>({});
  const [saving, setSaving] = useState(false);

  // Initialize mentions when competitors change
  useEffect(() => {
    const initial: Record<string, any> = {};
    competitors.forEach(c => {
      initial[c.id] = {
        mentioned: false,
        position: 1,
        sentiment: 'neutral',
        isRecommendation: false,
        hasCitation: false,
      };
    });
    setSelectedMentions(initial);
  }, [competitors]);

  async function handleSaveResult() {
    if (!queryText.trim() || !responseText.trim()) {
      alert('Please enter both a query and a response.');
      return;
    }

    setSaving(true);
    try {
      // Create test session
      const { data: session, error: sessionError } = await supabase
        .from('som_test_sessions')
        .insert({
          user_id: userId,
          name: `Manual Test - ${new Date().toLocaleDateString()}`,
          platform,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create query result
      const { data: result, error: resultError } = await supabase
        .from('som_query_results')
        .insert({
          user_id: userId,
          session_id: session.id,
          platform,
          query_text: queryText,
          response_text: responseText,
        })
        .select()
        .single();

      if (resultError) throw resultError;

      // Save mentions
      const mentionsToSave = Object.entries(selectedMentions)
        .filter(([_, data]) => data.mentioned)
        .map(([competitorId, data]) => ({
          result_id: result.id,
          competitor_id: competitorId,
          position: data.position,
          sentiment: data.sentiment,
          is_recommendation: data.isRecommendation,
          has_citation: data.hasCitation,
        }));

      if (mentionsToSave.length > 0) {
        await supabase.from('som_mentions').insert(mentionsToSave);
      }

      alert(`Saved! Recorded ${mentionsToSave.length} brand mention(s).`);
      setQueryText('');
      setResponseText('');
      // Reset mentions
      const reset: Record<string, any> = {};
      competitors.forEach(c => {
        reset[c.id] = {
          mentioned: false,
          position: 1,
          sentiment: 'neutral',
          isRecommendation: false,
          hasCitation: false,
        };
      });
      setSelectedMentions(reset);
      onTestComplete();

    } catch (err) {
      console.error('Error saving result:', err);
      alert('Failed to save result. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (competitors.length === 0) {
    return (
      <div style={cardStyle} className="text-center py-12">
        <div className="text-4xl mb-3">🏢</div>
        <h3 className="font-bold mb-2" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
          Add Competitors First
        </h3>
        <p className="text-sm mb-4" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
          You need to add your brand and competitors before running tests.
        </p>
        <button
          onClick={() => onTabChange('competitors')}
          className="px-5 py-2.5 rounded-xl text-white font-medium text-sm"
          style={{ 
            fontFamily: 'Montserrat Alternates',
            background: 'linear-gradient(135deg, #00A99D, #0D7871)',
          }}
        >
          Add Competitors
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
            ✍️ Manual Test
          </h2>
          <p className="text-sm" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
            Copy a query and response from any AI platform, then mark which brands were mentioned.
          </p>
        </div>
      </div>

      <div style={cardStyle}>
        {/* Platform Selection */}
        <div className="mb-5">
          <label className="block mb-2 text-sm font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
            Platform
          </label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  fontFamily: 'Montserrat Alternates',
                  background: platform === p.id ? 'rgba(0, 169, 157, 0.15)' : 'rgba(255, 255, 255, 0.8)',
                  border: platform === p.id ? '1px solid rgba(0, 169, 157, 0.3)' : '1px solid rgba(0,0,0,0.08)',
                  color: platform === p.id ? '#0D7871' : '#4a4642',
                }}
              >
                {p.icon} {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Query Input */}
        <div className="mb-5">
          <label className="block mb-2 text-sm font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
            Query
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="What query did you test?"
              style={inputStyle}
              className="flex-1"
            />
            {queries.length > 0 && (
              <select
                onChange={(e) => setQueryText(e.target.value)}
                style={{ ...inputStyle, width: 'auto', minWidth: '150px' }}
              >
                <option value="">Use saved...</option>
                {queries.filter(q => q.is_active).map(q => (
                  <option key={q.id} value={q.query_text}>
                    {q.query_text.substring(0, 40)}...
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Response Input */}
        <div className="mb-5">
          <label className="block mb-2 text-sm font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
            AI Response
          </label>
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Paste the AI response here..."
            rows={6}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Brand Mentions Section */}
        <div className="mb-5">
          <label className="block mb-2 text-sm font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
            Which brands were mentioned?
          </label>
          <div className="space-y-3">
            {competitors.map((comp, idx) => {
              const mention = selectedMentions[comp.id];
              if (!mention) return null;
              
              return (
                <div 
                  key={comp.id}
                  className="p-4 rounded-xl transition-all"
                  style={{
                    background: mention.mentioned 
                      ? comp.is_own_brand ? 'rgba(0, 169, 157, 0.08)' : 'rgba(250, 168, 25, 0.08)'
                      : 'rgba(0,0,0,0.02)',
                    border: mention.mentioned 
                      ? comp.is_own_brand ? '1px solid rgba(0, 169, 157, 0.2)' : '1px solid rgba(250, 168, 25, 0.2)'
                      : '1px solid rgba(0,0,0,0.05)',
                  }}
                >
                  {/* Checkbox + Name */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mention.mentioned}
                      onChange={(e) => setSelectedMentions(prev => ({
                        ...prev,
                        [comp.id]: { ...prev[comp.id], mentioned: e.target.checked }
                      }))}
                      className="w-5 h-5 accent-[#00A99D]"
                    />
                    <span className="font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
                      {comp.name}
                      {comp.is_own_brand && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0, 169, 157, 0.15)', color: '#0D7871' }}>
                          Your Brand
                        </span>
                      )}
                    </span>
                  </label>

                  {/* Details (only if mentioned) */}
                  {mention.mentioned && (
                    <div className="mt-3 ml-8 grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Position */}
                      <div>
                        <label className="block text-xs mb-1" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                          Position
                        </label>
                        <select
                          value={mention.position}
                          onChange={(e) => setSelectedMentions(prev => ({
                            ...prev,
                            [comp.id]: { ...prev[comp.id], position: parseInt(e.target.value) }
                          }))}
                          className="w-full px-3 py-2 rounded-lg text-sm"
                          style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)' }}
                        >
                          {[1,2,3,4,5,6,7,8,9,10].map(n => (
                            <option key={n} value={n}>#{n}</option>
                          ))}
                        </select>
                      </div>

                      {/* Sentiment */}
                      <div>
                        <label className="block text-xs mb-1" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                          Sentiment
                        </label>
                        <select
                          value={mention.sentiment}
                          onChange={(e) => setSelectedMentions(prev => ({
                            ...prev,
                            [comp.id]: { ...prev[comp.id], sentiment: e.target.value as any }
                          }))}
                          className="w-full px-3 py-2 rounded-lg text-sm"
                          style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)' }}
                        >
                          <option value="positive">👍 Positive</option>
                          <option value="neutral">➖ Neutral</option>
                          <option value="negative">👎 Negative</option>
                        </select>
                      </div>

                      {/* Recommendation */}
                      <label className="flex items-center gap-2 cursor-pointer self-end pb-2">
                        <input
                          type="checkbox"
                          checked={mention.isRecommendation}
                          onChange={(e) => setSelectedMentions(prev => ({
                            ...prev,
                            [comp.id]: { ...prev[comp.id], isRecommendation: e.target.checked }
                          }))}
                          className="w-4 h-4 accent-[#00A99D]"
                        />
                        <span className="text-xs" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
                          Recommended
                        </span>
                      </label>

                      {/* Citation */}
                      <label className="flex items-center gap-2 cursor-pointer self-end pb-2">
                        <input
                          type="checkbox"
                          checked={mention.hasCitation}
                          onChange={(e) => setSelectedMentions(prev => ({
                            ...prev,
                            [comp.id]: { ...prev[comp.id], hasCitation: e.target.checked }
                          }))}
                          className="w-4 h-4 accent-[#00A99D]"
                        />
                        <span className="text-xs" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
                          Has link/citation
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveResult}
          disabled={saving || !queryText.trim() || !responseText.trim()}
          className="w-full px-6 py-3 rounded-xl text-white font-medium transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            fontFamily: 'Montserrat Alternates',
            background: 'linear-gradient(135deg, #FAA819, #E99502)',
          }}
        >
          {saving ? 'Saving...' : '💾 Save Test Result'}
        </button>
      </div>
    </div>
  );
}

// ============================================
// AUTOMATED TEST TAB (Placeholder - same structure)
// ============================================

function AutomatedTestTab({ 
  competitors, 
  queries, 
  userId,
  userEmail,
  somUsage,
  isGrowth,
  onTestComplete,
  onUpgradeClick,
}: { 
  competitors: Competitor[];
  queries: Query[];
  userId: string;
  userEmail: string;
  somUsage: SOMUsage | null;
  isGrowth: boolean;
  onTestComplete: () => void;
  onUpgradeClick: () => void;
}) {
  const [selectedQueries, setSelectedQueries] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['chatgpt', 'perplexity', 'claude', 'gemini']);
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, query: '', platform: '' });
  const [testResults, setTestResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [testComplete, setTestComplete] = useState(false);
  const [contentIdeas, setContentIdeas] = useState<any>(null);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [discoveredBrands, setDiscoveredBrands] = useState<any[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [addingBrands, setAddingBrands] = useState(false);
  const [selectedPlatformDetail, setSelectedPlatformDetail] = useState<string | null>(null);
  const [contentIdeasUsage, setContentIdeasUsage] = useState(0);

  const canRunTest = somUsage?.remaining && somUsage.remaining > 0;
  const activeQueries = queries.filter(q => q.is_active);
  
  // Check if user is unlimited (your account)
  const isUnlimited = userEmail === 'support@clemelopy.com' || userEmail === 'jen@clemelopy.com';
  const contentIdeasLimit = 10;
  const canGenerateIdeas = isGrowth && (isUnlimited || contentIdeasUsage < contentIdeasLimit);
  
  // Get own brand name
  const ownBrand = competitors.find(c => c.is_own_brand);
  
  // Function to add selected brands as competitors
  async function addSelectedBrands() {
    if (selectedBrands.length === 0) return;
    
    setAddingBrands(true);
    try {
      for (const brandName of selectedBrands) {
        await supabase.from('som_competitors').insert({
          user_id: userId,
          name: brandName,
          is_own_brand: false,
        });
      }
      // Remove added brands from discovered list
      setDiscoveredBrands(prev => prev.filter(b => !selectedBrands.includes(b.name)));
      setSelectedBrands([]);
      onTestComplete(); // Refresh competitors list
    } catch (err) {
      console.error('Failed to add brands:', err);
    } finally {
      setAddingBrands(false);
    }
  }
  
  // Function to add all discovered brands
  async function addAllBrands() {
    if (discoveredBrands.length === 0) return;
    
    setAddingBrands(true);
    try {
      for (const brand of discoveredBrands) {
        await supabase.from('som_competitors').insert({
          user_id: userId,
          name: brand.name,
          is_own_brand: false,
        });
      }
      setDiscoveredBrands([]);
      setSelectedBrands([]);
      onTestComplete(); // Refresh competitors list
    } catch (err) {
      console.error('Failed to add brands:', err);
    } finally {
      setAddingBrands(false);
    }
  }

  async function generateContentIdeas() {
    if (!ownBrand || testResults.length === 0 || !canGenerateIdeas) return;
    
    setGeneratingIdeas(true);
    try {
      const response = await fetch(`${WORKER_URL}/content-ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: ownBrand.name,
          results: testResults,
          competitors: competitors.filter(c => !c.is_own_brand).map(c => c.name),
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setContentIdeas(data.ideas);
        setContentIdeasUsage(prev => prev + 1);
      }
    } catch (err) {
      console.error('Failed to generate content ideas:', err);
    } finally {
      setGeneratingIdeas(false);
    }
  }

  if (!isGrowth) {
    return (
      <div style={cardStyle} className="text-center py-12">
        <div className="text-5xl mb-4">🚀</div>
        <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
          Unlock Automated Testing
        </h3>
        <p className="mb-6 max-w-md mx-auto text-sm" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
          Upgrade to Growth to automatically test your queries across ChatGPT, Perplexity, Claude, and Gemini.
        </p>
        <button
          onClick={onUpgradeClick}
          className="px-6 py-3 rounded-xl text-white font-medium transition-all hover:shadow-lg"
          style={{ 
            fontFamily: 'Montserrat Alternates',
            background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
          }}
        >
          Upgrade to Growth — $79/mo
        </button>
      </div>
    );
  }

  async function handleRunTest() {
    if (!canRunTest || selectedQueries.length === 0 || competitors.length === 0) return;

    setTesting(true);
    setTestComplete(false);
    setTestResults([]);
    setShowResults(false);
    setContentIdeas(null);
    setDiscoveredBrands([]);
    setSelectedBrands([]);
    const totalTests = selectedQueries.length * selectedPlatforms.length;
    setProgress({ current: 0, total: totalTests, query: '', platform: '' });

    const collectedResults: any[] = [];
    let receivedComplete = false;

    try {
      const queriesToTest = queries.filter(q => selectedQueries.includes(q.id));

      const response = await fetch(`${WORKER_URL}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: queriesToTest.map(q => ({ id: q.id, query_text: q.query_text })),
          competitors: competitors.map(c => ({ id: c.id, name: c.name, domain: c.domain, is_own_brand: c.is_own_brand })),
          platforms: selectedPlatforms,
          user_id: userId,
          email: userEmail,
          stream: true,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Test failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n').filter(l => l.startsWith('data:'));

          for (const line of lines) {
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              console.log('📨 Stream event:', data.type, data);
              if (data.type === 'progress') {
                setProgress({
                  current: data.current,
                  total: data.total,
                  query: data.query || '',
                  platform: data.platform || '',
                });
              } else if (data.type === 'result') {
                console.log('📊 Got result:', data.query_text, data.platform);
                collectedResults.push(data);
              } else if (data.type === 'complete') {
                console.log('✅ Complete event received');
                receivedComplete = true;
                // Capture discovered brands from the complete event
                if (data.discovered_brands && data.discovered_brands.length > 0) {
                  console.log('🔍 Discovered brands:', data.discovered_brands);
                  setDiscoveredBrands(data.discovered_brands);
                }
                onTestComplete();
              }
            } catch (e) {
              console.error('Error parsing stream data:', e, line);
            }
          }
        }
      }
      
      // After stream ends, show results if we have any
      if (collectedResults.length > 0) {
        console.log('✅ Test complete, showing results:', collectedResults.length);
        setTestResults(collectedResults);
        setTestComplete(true);
        setShowResults(true);
        // Fire confetti!
        if ((window as any).clemelopyCornerConfetti) {
          (window as any).clemelopyCornerConfetti();
        }
        if (!receivedComplete) {
          onTestComplete();
        }
      } else {
        console.log('⚠️ No results collected from stream');
      }
    } catch (err: any) {
      console.error('Test error:', err);
      alert(err.message || 'Test failed');
      // Still show any results we collected before the error
      if (collectedResults.length > 0) {
        setTestResults(collectedResults);
        setTestComplete(true);
        setShowResults(true);
      }
    } finally {
      setTesting(false);
    }
  }

  // Show progress bar while testing
  if (testing) {
    const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
    
    return (
      <div style={cardStyle} className="text-center py-12">
        <div className="text-5xl mb-4 animate-pulse">🤖</div>
        <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
          Running Automated Test
        </h3>
        <p className="mb-6 text-sm" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
          Testing across {selectedPlatforms.length} AI platforms...
        </p>
        
        {/* Progress Bar */}
        <div className="max-w-md mx-auto mb-4">
          <div className="flex justify-between text-xs mb-2" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
            <span>Progress</span>
            <span>{progress.current} / {progress.total}</span>
          </div>
          <div 
            className="h-3 rounded-full overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.1)' }}
          >
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${percentage}%`,
                background: 'linear-gradient(90deg, #FAA819, #00A99D)',
              }}
            />
          </div>
        </div>

        {/* Current status */}
        {progress.query && (
          <div className="text-sm" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
            <p className="mb-1">
              <span className="font-medium">{progress.platform}</span>
            </p>
            <p className="text-xs truncate max-w-sm mx-auto" style={{ color: '#6b6560' }}>
              "{progress.query.substring(0, 50)}{progress.query.length > 50 ? '...' : ''}"
            </p>
          </div>
        )}
        
        <p className="mt-6 text-xs" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
          Please don't close this page while testing is in progress.
        </p>
      </div>
    );
  }

  // Show results after test completes
  if (showResults && testResults.length > 0) {
    // Group results by query
    const resultsByQuery: Record<string, any[]> = {};
    testResults.forEach(r => {
      const key = r.query_text;
      if (!resultsByQuery[key]) resultsByQuery[key] = [];
      resultsByQuery[key].push(r);
    });

    // Calculate summary stats
    const totalMentions = testResults.reduce((sum, r) => sum + (r.mentions?.length || 0), 0);
    const ownBrandMentions = testResults.filter(r => r.mentions?.some((m: any) => m.is_own_brand)).length;
    const allMentions = testResults.flatMap(r => r.mentions || []);
    const ownBrandData = allMentions.filter((m: any) => m.is_own_brand);
    const competitorMentions = allMentions.filter((m: any) => !m.is_own_brand);
    
    // Get unique competitors mentioned
    const uniqueCompetitors = [...new Set(competitorMentions.map((m: any) => m.competitor_name))];
    
    // Calculate own brand stats
    const avgPosition = ownBrandData.length > 0 
      ? (ownBrandData.reduce((sum: number, m: any) => sum + (m.position || 0), 0) / ownBrandData.length).toFixed(1)
      : 'N/A';
    const positiveCount = ownBrandData.filter((m: any) => m.sentiment === 'positive').length;
    const recommendationCount = ownBrandData.filter((m: any) => m.is_recommendation).length;

    // Generate quick insights
    const insights: string[] = [];
    
    if (ownBrandMentions === 0) {
      insights.push("⚠️ Your brand wasn't mentioned in any responses. Consider improving your content's AI visibility.");
    } else {
      const mentionRate = Math.round((ownBrandMentions / testResults.length) * 100);
      insights.push(`✅ You were mentioned in ${mentionRate}% of responses (${ownBrandMentions}/${testResults.length}).`);
      
      if (parseFloat(avgPosition as string) <= 2) {
        insights.push(`🏆 Great positioning! Average position #${avgPosition} means you're mentioned early.`);
      } else if (parseFloat(avgPosition as string) <= 4) {
        insights.push(`📍 Average position #${avgPosition}. Aim for positions 1-2 for better visibility.`);
      } else {
        insights.push(`📍 Average position #${avgPosition}. Work on getting mentioned earlier in responses.`);
      }
      
      if (positiveCount > 0) {
        insights.push(`👍 ${positiveCount} positive sentiment mention${positiveCount !== 1 ? 's' : ''}.`);
      }
      
      if (recommendationCount > 0) {
        insights.push(`⭐ Recommended ${recommendationCount} time${recommendationCount !== 1 ? 's' : ''} by AI platforms.`);
      }
    }
    
    if (uniqueCompetitors.length > 0) {
      const topCompetitors = uniqueCompetitors.slice(0, 3).join(', ');
      insights.push(`🏢 Top competitors mentioned: ${topCompetitors}${uniqueCompetitors.length > 3 ? ` (+${uniqueCompetitors.length - 3} more)` : ''}.`);
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
              ✅ Test Complete
            </h2>
            <p className="text-sm" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
              {testResults.length} response{testResults.length !== 1 ? 's' : ''} across {Object.keys(resultsByQuery).length} quer{Object.keys(resultsByQuery).length !== 1 ? 'ies' : 'y'}
            </p>
          </div>
          <button
            onClick={() => { setShowResults(false); setTestResults([]); setTestComplete(false); setContentIdeas(null); setDiscoveredBrands([]); setSelectedBrands([]); }}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ 
              fontFamily: 'Montserrat Alternates',
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(0,0,0,0.08)',
              color: '#4a4642',
            }}
          >
            ← Run New Test
          </button>
        </div>

        {/* Quick Insights Summary */}
        <div 
          className="mb-6 p-5 rounded-2xl"
          style={{ 
            background: 'linear-gradient(135deg, rgba(0, 169, 157, 0.08) 0%, rgba(250, 168, 25, 0.08) 100%)',
            border: '1px solid rgba(0, 169, 157, 0.15)',
          }}
        >
          <h3 className="font-bold mb-3 flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
            <span>💡</span> Quick Insights
          </h3>
          <div className="space-y-2">
            {insights.map((insight, idx) => (
              <p key={idx} className="text-sm" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
                {insight}
              </p>
            ))}
          </div>
        </div>

        {/* Discovered Brands Section */}
        {discoveredBrands.length > 0 && (
          <div 
            data-tour="som-discovered-brands"
            className="mb-6 p-5 rounded-2xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(250, 168, 25, 0.1) 0%, rgba(250, 168, 25, 0.05) 100%)',
              border: '1px solid rgba(250, 168, 25, 0.2)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
                <span>🔍</span> New Brands Discovered ({discoveredBrands.length})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={addSelectedBrands}
                  disabled={selectedBrands.length === 0 || addingBrands}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    background: selectedBrands.length > 0 ? 'rgba(0, 169, 157, 0.15)' : 'rgba(0,0,0,0.05)',
                    color: selectedBrands.length > 0 ? '#0D7871' : '#6b6560',
                    border: '1px solid rgba(0, 169, 157, 0.2)',
                  }}
                >
                  {addingBrands ? 'Adding...' : `Add Selected (${selectedBrands.length})`}
                </button>
                <button
                  onClick={addAllBrands}
                  disabled={addingBrands}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    background: 'linear-gradient(135deg, #FAA819, #E99502)',
                    color: 'white',
                  }}
                >
                  {addingBrands ? 'Adding...' : 'Add All'}
                </button>
              </div>
            </div>
            
            <p className="text-xs mb-3" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
              These brands were mentioned by AI but aren't in your competitors list yet. Select the ones you want to track.
            </p>
            
            <div className="flex flex-wrap gap-2">
              {discoveredBrands.map((brand, idx) => {
                const isSelected = selectedBrands.includes(brand.name);
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedBrands(prev => 
                        isSelected 
                          ? prev.filter(b => b !== brand.name)
                          : [...prev, brand.name]
                      );
                    }}
                    className="px-3 py-2 rounded-xl text-sm transition-all flex items-center gap-2"
                    style={{ 
                      fontFamily: 'Inter',
                      background: isSelected ? 'rgba(0, 169, 157, 0.15)' : 'rgba(255,255,255,0.8)',
                      border: isSelected ? '2px solid rgba(0, 169, 157, 0.4)' : '1px solid rgba(0,0,0,0.08)',
                      color: isSelected ? '#0D7871' : '#4a4642',
                    }}
                  >
                    <span className="w-4 h-4 rounded border flex items-center justify-center text-xs"
                      style={{ 
                        borderColor: isSelected ? '#0D7871' : 'rgba(0,0,0,0.2)',
                        background: isSelected ? '#0D7871' : 'transparent',
                        color: 'white',
                      }}
                    >
                      {isSelected && '✓'}
                    </span>
                    <span className="font-medium">{brand.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.06)', color: '#6b6560' }}>
                      {brand.mention_count}× mentioned
                    </span>
                    {brand.sentiment === 'positive' && <span>👍</span>}
                    {brand.is_recommendation && <span>⭐</span>}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <button
                onClick={() => setSelectedBrands(discoveredBrands.map(b => b.name))}
                className="text-xs px-2 py-1 rounded transition-all hover:bg-black/5"
                style={{ fontFamily: 'Inter', color: '#6b6560' }}
              >
                Select All
              </button>
              <span style={{ color: '#ccc' }}>|</span>
              <button
                onClick={() => setSelectedBrands([])}
                className="text-xs px-2 py-1 rounded transition-all hover:bg-black/5"
                style={{ fontFamily: 'Inter', color: '#6b6560' }}
              >
                Deselect All
              </button>
              <span style={{ color: '#ccc' }}>|</span>
              <button
                onClick={() => setDiscoveredBrands([])}
                className="text-xs px-2 py-1 rounded transition-all hover:bg-black/5"
                style={{ fontFamily: 'Inter', color: '#6b6560' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(0, 169, 157, 0.1)' }}>
            <div className="text-2xl font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#0D7871' }}>
              {testResults.length}
            </div>
            <div className="text-xs" style={{ fontFamily: 'Inter', color: '#4a4642' }}>Responses</div>
          </div>
          <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(250, 168, 25, 0.1)' }}>
            <div className="text-2xl font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#b37400' }}>
              {totalMentions}
            </div>
            <div className="text-xs" style={{ fontFamily: 'Inter', color: '#4a4642' }}>Total Mentions</div>
          </div>
          <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(0, 169, 157, 0.1)' }}>
            <div className="text-2xl font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#0D7871' }}>
              {ownBrandMentions}
            </div>
            <div className="text-xs" style={{ fontFamily: 'Inter', color: '#4a4642' }}>You Mentioned</div>
          </div>
          <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(0,0,0,0.05)' }}>
            <div className="text-2xl font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#4a4642' }}>
              {avgPosition}
            </div>
            <div className="text-xs" style={{ fontFamily: 'Inter', color: '#4a4642' }}>Avg Position</div>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.9)' }}>
          <h4 className="font-medium mb-1 text-sm" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
            Your Visibility by Platform
          </h4>
          <p className="text-xs mb-3" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
            Click a platform to see detailed results
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {selectedPlatforms.map(platformId => {
              const platform = PLATFORMS.find(p => p.id === platformId);
              const platformResults = testResults.filter(r => r.platform === platformId);
              const platformMentions = platformResults.filter(r => r.mentions?.some((m: any) => m.is_own_brand)).length;
              const percentage = platformResults.length > 0 ? Math.round((platformMentions / platformResults.length) * 100) : 0;
              
              return (
                <button
                  key={platformId}
                  onClick={() => setSelectedPlatformDetail(platformId)}
                  className="text-center p-3 rounded-xl transition-all hover:shadow-md hover:scale-105 cursor-pointer"
                  style={{ background: 'rgba(0,0,0,0.03)', border: 'none' }}
                >
                  <div className="text-2xl mb-1">{platform?.icon}</div>
                  <div className="text-lg font-bold" style={{ fontFamily: 'Montserrat Alternates', color: percentage > 0 ? '#0D7871' : '#6b6560' }}>
                    {percentage}%
                  </div>
                  <div className="text-xs" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                    {platform?.name}
                  </div>
                  <div className="text-xs mt-1" style={{ fontFamily: 'Inter', color: '#9ca3af' }}>
                    {platformResults.length} result{platformResults.length !== 1 ? 's' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Platform Detail Modal */}
        {selectedPlatformDetail && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSelectedPlatformDetail(null)}
          >
            <div 
              className="w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-2xl p-6"
              style={{ 
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const platform = PLATFORMS.find(p => p.id === selectedPlatformDetail);
                const platformResults = testResults.filter(r => r.platform === selectedPlatformDetail);
                const platformMentions = platformResults.filter(r => r.mentions?.some((m: any) => m.is_own_brand)).length;
                const percentage = platformResults.length > 0 ? Math.round((platformMentions / platformResults.length) * 100) : 0;
                
                return (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{platform?.icon}</span>
                        <div>
                          <h3 className="text-xl font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
                            {platform?.name} Results
                          </h3>
                          <p className="text-sm" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                            You appeared in {percentage}% of responses ({platformMentions}/{platformResults.length})
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedPlatformDetail(null)}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 transition-all"
                        style={{ color: '#6b6560', fontSize: '24px' }}
                      >
                        ×
                      </button>
                    </div>

                    {/* Results List */}
                    <div className="space-y-4">
                      {platformResults.map((result, idx) => {
                        const ownBrandMention = result.mentions?.find((m: any) => m.is_own_brand);
                        const mentionCount = result.mentions?.length || 0;
                        
                        return (
                          <div 
                            key={idx}
                            className="p-4 rounded-xl"
                            style={{ 
                              background: ownBrandMention ? 'rgba(0, 169, 157, 0.05)' : 'rgba(0,0,0,0.03)',
                              border: ownBrandMention ? '1px solid rgba(0, 169, 157, 0.2)' : '1px solid rgba(0,0,0,0.05)',
                            }}
                          >
                            {/* Query */}
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-medium text-sm" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
                                "{result.query_text}"
                              </h4>
                              {ownBrandMention && (
                                <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(0, 169, 157, 0.15)', color: '#0D7871' }}>
                                  ✓ You mentioned #{ownBrandMention.position}
                                </span>
                              )}
                            </div>

                            {/* Mentions */}
                            {result.mentions && result.mentions.length > 0 && (
                              <div className="mb-3">
                                <div className="text-xs font-medium mb-2" style={{ color: '#6b6560' }}>
                                  Brands mentioned ({mentionCount}):
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {result.mentions.map((m: any, mIdx: number) => (
                                    <span 
                                      key={mIdx}
                                      className="text-xs px-2 py-1 rounded-lg"
                                      style={{ 
                                        background: m.is_own_brand ? 'rgba(0, 169, 157, 0.15)' : 'rgba(0,0,0,0.05)',
                                        color: m.is_own_brand ? '#0D7871' : '#4a4642',
                                      }}
                                    >
                                      #{m.position} {m.competitor_name}
                                      {m.sentiment === 'positive' && ' 👍'}
                                      {m.sentiment === 'negative' && ' 👎'}
                                      {m.is_recommendation && ' ⭐'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Response */}
                            <details className="group">
                              <summary 
                                className="text-xs cursor-pointer select-none flex items-center gap-1"
                                style={{ fontFamily: 'Inter', color: '#6b6560' }}
                              >
                                <span className="group-open:rotate-90 transition-transform">▶</span>
                                View full response
                              </summary>
                              <div 
                                className="mt-2 p-3 rounded-lg text-xs max-h-48 overflow-y-auto"
                                style={{ 
                                  background: 'rgba(255,255,255,0.8)',
                                  color: '#4a4642',
                                  whiteSpace: 'pre-wrap',
                                  lineHeight: '1.6',
                                }}
                              >
                                {result.response_text || 'No response recorded'}
                              </div>
                            </details>
                          </div>
                        );
                      })}
                    </div>

                    {platformResults.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-sm" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                          No results for this platform in the current test.
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Content Ideas Section */}
        <div 
          data-tour="som-content-ideas"
          className="mb-6 p-5 rounded-2xl"
          style={{ 
            background: 'linear-gradient(135deg, rgba(250, 168, 25, 0.08) 0%, rgba(0, 169, 157, 0.08) 100%)',
            border: '1px solid rgba(250, 168, 25, 0.15)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
                <span>✨</span> Content Recommendations
              </h3>
              {!isUnlimited && isGrowth && (
                <p className="text-xs mt-1" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                  {contentIdeasLimit - contentIdeasUsage} generations left this month
                </p>
              )}
            </div>
            {!contentIdeas && !generatingIdeas && (
              <button
                onClick={generateContentIdeas}
                disabled={!ownBrand || !canGenerateIdeas}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:shadow-md disabled:opacity-50"
                style={{ 
                  fontFamily: 'Montserrat Alternates',
                  background: canGenerateIdeas ? 'linear-gradient(135deg, #FAA819, #E99502)' : '#9ca3af',
                  color: 'white',
                }}
              >
                {!canGenerateIdeas && !isGrowth ? '🔒 Growth Only' : 
                 !canGenerateIdeas ? 'Limit Reached' : 'Generate Ideas'}
              </button>
            )}
          </div>
          
          {generatingIdeas && (
            <div className="text-center py-8">
              <div className="text-3xl mb-3 animate-pulse">🤖</div>
              <p className="text-sm" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
                Analyzing results and generating content ideas...
              </p>
            </div>
          )}
          
          {!contentIdeas && !generatingIdeas && (
            <p className="text-sm" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
              Click "Generate Ideas" to get AI-powered content recommendations based on your test results.
            </p>
          )}
          
          {contentIdeas && (
            <div className="space-y-4">
              {/* Summary */}
              {contentIdeas.summary && (
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.7)' }}>
                  <p className="text-sm" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
                    {contentIdeas.summary}
                  </p>
                </div>
              )}
              
              {/* Quick Wins */}
              {contentIdeas.quick_wins && contentIdeas.quick_wins.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
                    ⚡ Quick Wins
                  </h4>
                  <ul className="space-y-2">
                    {contentIdeas.quick_wins.map((win: string, idx: number) => (
                      <li 
                        key={idx} 
                        className="text-sm flex items-start gap-2 p-2 rounded-lg"
                        style={{ fontFamily: 'Inter', color: '#4a4642', background: 'rgba(255,255,255,0.5)' }}
                      >
                        <span className="text-green-600">✓</span>
                        {win}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Article Ideas */}
              {contentIdeas.article_ideas && contentIdeas.article_ideas.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
                    📝 Content Ideas
                  </h4>
                  <div className="space-y-2">
                    {contentIdeas.article_ideas.map((article: any, idx: number) => (
                      <div 
                        key={idx} 
                        className="p-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.7)' }}
                      >
                        <h5 className="font-medium text-sm mb-1" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
                          {article.title}
                        </h5>
                        <p className="text-xs mb-1" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                          {article.description}
                        </p>
                        {article.target_query && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0, 169, 157, 0.1)', color: '#0D7871' }}>
                            For: "{article.target_query.substring(0, 30)}..."
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Content Gaps */}
              {contentIdeas.content_gaps && contentIdeas.content_gaps.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
                    🎯 Content Gaps to Fill
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {contentIdeas.content_gaps.map((gap: string, idx: number) => (
                      <span 
                        key={idx}
                        className="text-xs px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(250, 168, 25, 0.15)', color: '#b37400' }}
                      >
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Authority Tips */}
              {contentIdeas.authority_tips && contentIdeas.authority_tips.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
                    🏆 Authority Building Tips
                  </h4>
                  <ul className="space-y-1">
                    {contentIdeas.authority_tips.map((tip: string, idx: number) => (
                      <li 
                        key={idx} 
                        className="text-sm flex items-start gap-2"
                        style={{ fontFamily: 'Inter', color: '#4a4642' }}
                      >
                        <span style={{ color: '#00A99D' }}>→</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Regenerate button */}
              <button
                onClick={() => { setContentIdeas(null); generateContentIdeas(); }}
                className="text-xs px-3 py-1.5 rounded-lg transition-all hover:shadow-sm"
                style={{ 
                  fontFamily: 'Inter',
                  background: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  color: '#6b6560',
                }}
              >
                🔄 Regenerate Ideas
              </button>
            </div>
          )}
        </div>

        {/* Results by Query */}
        <div style={cardStyle}>
          <h4 className="font-medium mb-4 text-sm" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
            📋 Detailed Results
          </h4>
          <div className="space-y-4">
            {Object.entries(resultsByQuery).map(([queryText, results], qIdx) => (
              <div key={qIdx} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.05)' }}>
                <h4 className="font-medium mb-3" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
                  "{queryText}"
                </h4>
                
                <div className="space-y-3">
                  {results.map((result: any, idx: number) => {
                    const platform = PLATFORMS.find(p => p.id === result.platform);
                    const isExpanded = expandedResult === `${qIdx}-${idx}`;
                    const mentionCount = result.mentions?.length || 0;
                    const ownBrandMention = result.mentions?.find((m: any) => m.is_own_brand);

                    return (
                      <div 
                        key={idx}
                        className="p-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.05)' }}
                      >
                      {/* Platform header */}
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedResult(isExpanded ? null : `${qIdx}-${idx}`)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{platform?.icon}</span>
                          <span className="font-medium text-sm" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
                            {platform?.name}
                          </span>
                          {ownBrandMention && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0, 169, 157, 0.15)', color: '#0D7871' }}>
                              ✓ Mentioned
                            </span>
                          )}
                          <span className="text-xs" style={{ color: '#6b6560' }}>
                            {mentionCount} brand{mentionCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <span style={{ color: '#6b6560' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                          {/* Mentions */}
                          {result.mentions && result.mentions.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-medium mb-2" style={{ color: '#6b6560' }}>Brands Detected:</div>
                              <div className="flex flex-wrap gap-2">
                                {result.mentions.map((m: any, mIdx: number) => (
                                  <span 
                                    key={mIdx}
                                    className="text-xs px-2 py-1 rounded-lg"
                                    style={{ 
                                      background: m.is_own_brand ? 'rgba(0, 169, 157, 0.1)' : 'rgba(0,0,0,0.05)',
                                      color: m.is_own_brand ? '#0D7871' : '#4a4642',
                                    }}
                                  >
                                    #{m.position} {m.competitor_name}
                                    {m.sentiment === 'positive' && ' 👍'}
                                    {m.sentiment === 'negative' && ' 👎'}
                                    {m.is_recommendation && ' ⭐'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Response preview */}
                          <div>
                            <div className="text-xs font-medium mb-2" style={{ color: '#6b6560' }}>Response:</div>
                            <div 
                              className="text-xs p-3 rounded-lg max-h-48 overflow-y-auto"
                              style={{ 
                                background: 'rgba(255,255,255,0.8)',
                                color: '#4a4642',
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.5',
                              }}
                            >
                              {result.response_text?.substring(0, 1000)}
                              {result.response_text?.length > 1000 && '...'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
            🤖 Automated Test
          </h2>
          <p className="text-sm" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
            Automatically query AI platforms and detect brand mentions.
          </p>
        </div>
        {somUsage && (
          <div data-tour="som-usage-counter" className="text-right">
            <span className="text-sm font-medium" style={{ fontFamily: 'Inter', color: canRunTest ? '#0D7871' : '#b37400' }}>
              {somUsage.remaining} test{somUsage.remaining !== 1 ? 's' : ''} remaining
            </span>
            {somUsage.reset_date && (
              <p className="text-xs" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                Resets {new Date(somUsage.reset_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        {/* Platforms */}
        <div className="mb-5">
          <label className="block mb-2 text-sm font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
            Platforms
          </label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.slice(0, 4).map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPlatforms(prev => 
                  prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                )}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  fontFamily: 'Montserrat Alternates',
                  background: selectedPlatforms.includes(p.id) ? 'rgba(0, 169, 157, 0.15)' : 'rgba(255, 255, 255, 0.8)',
                  border: selectedPlatforms.includes(p.id) ? '1px solid rgba(0, 169, 157, 0.3)' : '1px solid rgba(0,0,0,0.08)',
                  color: selectedPlatforms.includes(p.id) ? '#0D7871' : '#4a4642',
                }}
              >
                {selectedPlatforms.includes(p.id) ? '✓ ' : ''}{p.icon} {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Queries */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
              Queries ({selectedQueries.length} selected)
            </label>
            {activeQueries.length > 0 && (
              <button
                onClick={() => setSelectedQueries(
                  selectedQueries.length === activeQueries.length ? [] : activeQueries.map(q => q.id)
                )}
                className="text-xs text-[#00A99D]"
              >
                {selectedQueries.length === activeQueries.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          
          {activeQueries.length === 0 ? (
            <p className="text-sm py-4" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
              No active queries. Add some in the Queries tab.
            </p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)' }}>
              {activeQueries.map(q => (
                <label key={q.id} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/50">
                  <input
                    type="checkbox"
                    checked={selectedQueries.includes(q.id)}
                    onChange={(e) => setSelectedQueries(prev => 
                      e.target.checked ? [...prev, q.id] : prev.filter(id => id !== q.id)
                    )}
                    className="w-4 h-4 accent-[#00A99D]"
                  />
                  <span className="text-sm" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
                    {q.query_text}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Progress */}
        {testing && (
          <div className="mb-5 p-4 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
                {progress.platform ? `Testing on ${progress.platform}...` : 'Starting...'}
              </span>
              <span className="text-sm" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, #00A99D, #0D7871)',
                }}
              />
            </div>
          </div>
        )}

        {/* Run Button */}
        <button
          onClick={handleRunTest}
          disabled={testing || !canRunTest || selectedQueries.length === 0 || selectedPlatforms.length === 0}
          className="w-full px-6 py-3 rounded-xl text-white font-medium transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            fontFamily: 'Montserrat Alternates',
            background: 'linear-gradient(135deg, #00A99D, #0D7871)',
          }}
        >
          {testing ? '🔄 Running...' : '🚀 Run Automated Test'}
        </button>
      </div>
    </div>
  );
}

// ============================================
// COMPETITORS TAB
// ============================================

function CompetitorsTab({ competitors, userId, onUpdate }: { competitors: Competitor[]; userId: string; onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [isOwnBrand, setIsOwnBrand] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<string[]>([]);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);

  function resetForm() {
    setName(''); setDomain(''); setIsOwnBrand(false); setEditingId(null); setShowForm(false);
  }

  function handleEdit(comp: Competitor) {
    setName(comp.name); setDomain(comp.domain || ''); setIsOwnBrand(comp.is_own_brand); setEditingId(comp.id); setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim()) return alert('Please enter a name.');
    setSaving(true);
    try {
      if (editingId) {
        await supabase.from('som_competitors').update({ name: name.trim(), domain: domain.trim() || null, is_own_brand: isOwnBrand }).eq('id', editingId);
      } else {
        await supabase.from('som_competitors').insert({ user_id: userId, name: name.trim(), domain: domain.trim() || null, is_own_brand: isOwnBrand });
      }
      resetForm(); onUpdate();
    } catch (err) { alert('Failed to save.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this competitor? This will also delete all associated mentions.')) return;
    // First delete mentions associated with this competitor
    await supabase.from('som_mentions').delete().eq('competitor_id', id);
    // Then delete the competitor
    await supabase.from('som_competitors').delete().eq('id', id);
    onUpdate();
  }

  async function handleBulkDelete() {
    if (selectedForDelete.length === 0) return;
    if (!confirm(`Delete ${selectedForDelete.length} competitor${selectedForDelete.length > 1 ? 's' : ''}? This will also delete all associated mentions.`)) return;
    
    try {
      // Delete mentions for all selected competitors
      for (const id of selectedForDelete) {
        await supabase.from('som_mentions').delete().eq('competitor_id', id);
      }
      // Delete the competitors
      for (const id of selectedForDelete) {
        await supabase.from('som_competitors').delete().eq('id', id);
      }
      setSelectedForDelete([]);
      setBulkDeleteMode(false);
      onUpdate();
    } catch (err) {
      alert('Failed to delete some competitors.');
    }
  }

  function toggleSelectAll() {
    if (selectedForDelete.length === competitors.filter(c => !c.is_own_brand).length) {
      setSelectedForDelete([]);
    } else {
      setSelectedForDelete(competitors.filter(c => !c.is_own_brand).map(c => c.id));
    }
  }

  // Separate own brand from competitors
  const ownBrandCompetitor = competitors.find(c => c.is_own_brand);
  const otherCompetitors = competitors.filter(c => !c.is_own_brand);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>🏢 Competitors</h2>
          <p className="text-sm" style={{ fontFamily: 'Inter', color: '#6b6560' }}>Add your brand and competitors to track.</p>
        </div>
        <div className="flex gap-2">
          {!bulkDeleteMode && otherCompetitors.length > 0 && (
            <button 
              onClick={() => setBulkDeleteMode(true)} 
              className="px-4 py-2 rounded-xl font-medium text-sm"
              style={{ fontFamily: 'Montserrat Alternates', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.08)', color: '#6b6560' }}
            >
              🗑️ Bulk Delete
            </button>
          )}
          {bulkDeleteMode && (
            <>
              <button 
                onClick={handleBulkDelete} 
                disabled={selectedForDelete.length === 0}
                className="px-4 py-2 rounded-xl font-medium text-sm disabled:opacity-50"
                style={{ fontFamily: 'Montserrat Alternates', background: '#dc2626', color: 'white' }}
              >
                Delete ({selectedForDelete.length})
              </button>
              <button 
                onClick={() => { setBulkDeleteMode(false); setSelectedForDelete([]); }} 
                className="px-4 py-2 rounded-xl font-medium text-sm"
                style={{ fontFamily: 'Montserrat Alternates', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.08)', color: '#4a4642' }}
              >
                Cancel
              </button>
            </>
          )}
          {!showForm && !bulkDeleteMode && (
            <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl text-white font-medium text-sm" style={{ fontFamily: 'Montserrat Alternates', background: 'linear-gradient(135deg, #00A99D, #0D7871)' }}>
              + Add
            </button>
          )}
        </div>
      </div>

      <div style={cardStyle}>
        {/* Form */}
        {showForm && (
          <div className="mb-6 p-5 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.06)', border: '1px solid rgba(0, 169, 157, 0.15)' }}>
            <h3 className="font-bold mb-4" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>{editingId ? 'Edit' : 'Add'} Competitor</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-1 text-sm font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Clemelopy" style={inputStyle} />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>Domain (optional)</label>
                <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g., clemelopy.com" style={inputStyle} />
              </div>
            </div>
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={isOwnBrand} onChange={(e) => setIsOwnBrand(e.target.checked)} className="w-4 h-4 accent-[#00A99D]" />
              <span className="text-sm" style={{ fontFamily: 'Inter', color: '#4a4642' }}>This is my brand</span>
            </label>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-xl text-white font-medium text-sm" style={{ fontFamily: 'Montserrat Alternates', background: 'linear-gradient(135deg, #00A99D, #0D7871)' }}>
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
              </button>
              <button onClick={resetForm} className="px-5 py-2 rounded-xl font-medium text-sm" style={{ fontFamily: 'Montserrat Alternates', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.08)', color: '#4a4642' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Bulk delete select all */}
        {bulkDeleteMode && otherCompetitors.length > 0 && (
          <div className="mb-4 p-3 rounded-xl flex items-center justify-between" style={{ background: 'rgba(220, 38, 38, 0.06)', border: '1px solid rgba(220, 38, 38, 0.15)' }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={selectedForDelete.length === otherCompetitors.length && otherCompetitors.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 accent-[#dc2626]" 
              />
              <span className="text-sm font-medium" style={{ fontFamily: 'Inter', color: '#dc2626' }}>
                Select All ({otherCompetitors.length})
              </span>
            </label>
            <span className="text-xs" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
              Your brand cannot be bulk deleted
            </span>
          </div>
        )}

        {/* Your Brand (always at top, not deletable in bulk) */}
        {ownBrandCompetitor && (
          <div className="mb-4">
            <div className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ fontFamily: 'Inter', color: '#6b6560' }}>Your Brand</div>
            <div className="p-4 rounded-xl flex items-center justify-between" style={{ background: 'rgba(0, 169, 157, 0.06)', border: '1px solid rgba(0, 169, 157, 0.15)' }}>
              <div className="flex items-center gap-3">
                <span className="text-lg">⭐</span>
                <span className="font-semibold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>{ownBrandCompetitor.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0, 169, 157, 0.15)', color: '#0D7871', fontFamily: 'Inter', fontWeight: 600 }}>Your Brand</span>
                {ownBrandCompetitor.domain && <span className="text-xs" style={{ fontFamily: 'Inter', color: '#6b6560' }}>{ownBrandCompetitor.domain}</span>}
              </div>
              <button onClick={() => handleEdit(ownBrandCompetitor)} className="px-3 py-1 rounded-lg text-xs" style={{ fontFamily: 'Inter', background: 'rgba(255,255,255,0.6)', color: '#4a4642' }}>Edit</button>
            </div>
          </div>
        )}

        {/* Other Competitors */}
        {otherCompetitors.length > 0 && (
          <div>
            <div className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
              Competitors ({otherCompetitors.length})
            </div>
            <div className="space-y-2">
              {otherCompetitors.map(comp => (
                <div key={comp.id} className="p-4 rounded-xl flex items-center justify-between" style={{ background: selectedForDelete.includes(comp.id) ? 'rgba(220, 38, 38, 0.06)' : 'rgba(255,255,255,0.6)', border: selectedForDelete.includes(comp.id) ? '1px solid rgba(220, 38, 38, 0.2)' : '1px solid rgba(255,255,255,0.8)' }}>
                  <div className="flex items-center gap-3">
                    {bulkDeleteMode && (
                      <input 
                        type="checkbox" 
                        checked={selectedForDelete.includes(comp.id)}
                        onChange={() => {
                          setSelectedForDelete(prev => 
                            prev.includes(comp.id) 
                              ? prev.filter(id => id !== comp.id)
                              : [...prev, comp.id]
                          );
                        }}
                        className="w-4 h-4 accent-[#dc2626]" 
                      />
                    )}
                    <span className="font-semibold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>{comp.name}</span>
                    {comp.domain && <span className="text-xs" style={{ fontFamily: 'Inter', color: '#6b6560' }}>{comp.domain}</span>}
                  </div>
                  {!bulkDeleteMode && (
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(comp)} className="px-3 py-1 rounded-lg text-xs" style={{ fontFamily: 'Inter', background: 'rgba(255,255,255,0.6)', color: '#4a4642' }}>Edit</button>
                      <button onClick={() => handleDelete(comp.id)} className="px-3 py-1 rounded-lg text-xs" style={{ fontFamily: 'Inter', background: 'rgba(255,255,255,0.6)', color: '#dc2626' }}>Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {competitors.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🏢</div>
            <p className="text-sm" style={{ fontFamily: 'Inter', color: '#4a4642' }}>No competitors added yet.</p>
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(250, 168, 25, 0.06)', border: '1px solid rgba(250, 168, 25, 0.15)' }}>
          <h4 className="font-semibold mb-2 text-sm" style={{ fontFamily: 'Montserrat Alternates', color: '#b37400' }}>💡 Tips</h4>
          <ul className="space-y-1 text-xs" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
            <li>• Add your brand first and mark it as "my brand"</li>
            <li>• Include 2-5 direct competitors for meaningful comparison</li>
            <li>• Adding domains helps detect citations and links</li>
            <li>• Use "Bulk Delete" to quickly remove irrelevant brands discovered by AI</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================================
// QUERIES TAB
// ============================================

function QueriesTab({ queries, userId, onUpdate }: { queries: Query[]; userId: string; onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [queryText, setQueryText] = useState('');
  const [queryType, setQueryType] = useState('category');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setQueryText(''); setQueryType('category'); setCategory(''); setEditingId(null); setShowForm(false);
  }

  function handleEdit(q: Query) {
    setQueryText(q.query_text); setQueryType(q.query_type); setCategory(q.category || ''); setEditingId(q.id); setShowForm(true);
  }

  async function handleSave() {
    if (!queryText.trim()) return alert('Please enter a query.');
    setSaving(true);
    try {
      if (editingId) {
        await supabase.from('som_queries').update({ query_text: queryText.trim(), query_type: queryType, category: category.trim() || null }).eq('id', editingId);
      } else {
        await supabase.from('som_queries').insert({ user_id: userId, query_text: queryText.trim(), query_type: queryType, category: category.trim() || null, is_active: true });
      }
      resetForm(); onUpdate();
    } catch (err) { alert('Failed to save.'); }
    finally { setSaving(false); }
  }

  async function handleToggle(q: Query) {
    await supabase.from('som_queries').update({ is_active: !q.is_active }).eq('id', q.id);
    onUpdate();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this query?')) return;
    await supabase.from('som_queries').delete().eq('id', id);
    onUpdate();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>💬 Queries</h2>
          <p className="text-sm" style={{ fontFamily: 'Inter', color: '#6b6560' }}>Build a library of queries to test regularly.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl text-white font-medium text-sm" style={{ fontFamily: 'Montserrat Alternates', background: 'linear-gradient(135deg, #FAA819, #E99502)' }}>
            + Add
          </button>
        )}
      </div>

      <div style={cardStyle}>
        {/* Form */}
        {showForm && (
          <div className="mb-6 p-5 rounded-xl" style={{ background: 'rgba(250, 168, 25, 0.06)', border: '1px solid rgba(250, 168, 25, 0.15)' }}>
            <h3 className="font-bold mb-4" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>{editingId ? 'Edit' : 'Add'} Query</h3>
            <div className="mb-4">
              <label className="block mb-1 text-sm font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>Query *</label>
              <input type="text" value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="e.g., What are the best GEO tools?" style={inputStyle} />
            </div>
            <div className="mb-4">
              <label className="block mb-1 text-sm font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>Type</label>
              <div className="flex flex-wrap gap-2">
                {QUERY_TYPES.map(t => (
                  <button key={t.id} onClick={() => setQueryType(t.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ fontFamily: 'Montserrat Alternates', background: queryType === t.id ? 'rgba(250, 168, 25, 0.15)' : 'rgba(255,255,255,0.8)', border: queryType === t.id ? '1px solid rgba(250, 168, 25, 0.3)' : '1px solid rgba(0,0,0,0.08)', color: queryType === t.id ? '#b37400' : '#4a4642' }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block mb-1 text-sm font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>Category (optional)</label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., GEO Tools" style={inputStyle} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-xl text-white font-medium text-sm" style={{ fontFamily: 'Montserrat Alternates', background: 'linear-gradient(135deg, #FAA819, #E99502)' }}>
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
              </button>
              <button onClick={resetForm} className="px-5 py-2 rounded-xl font-medium text-sm" style={{ fontFamily: 'Montserrat Alternates', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.08)', color: '#4a4642' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* List */}
        {queries.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm" style={{ fontFamily: 'Inter', color: '#4a4642' }}>No queries saved yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {queries.map(q => {
              const typeInfo = QUERY_TYPES.find(t => t.id === q.query_type);
              return (
                <div key={q.id} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)', opacity: q.is_active ? 1 : 0.6 }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm mb-2" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>{q.query_text}</p>
                      <div className="flex flex-wrap gap-1">
                        {typeInfo && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(250, 168, 25, 0.15)', color: '#b37400', fontFamily: 'Inter' }}>{typeInfo.icon} {typeInfo.label}</span>}
                        {q.category && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0, 169, 157, 0.15)', color: '#0D7871', fontFamily: 'Inter' }}>{q.category}</span>}
                        {!q.is_active && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.08)', color: '#6b6560', fontFamily: 'Inter' }}>Inactive</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleToggle(q)} className="px-2 py-1 rounded-lg text-xs" style={{ fontFamily: 'Inter', background: 'rgba(255,255,255,0.6)', color: q.is_active ? '#6b6560' : '#00A99D' }}>{q.is_active ? 'Disable' : 'Enable'}</button>
                      <button onClick={() => handleEdit(q)} className="px-2 py-1 rounded-lg text-xs" style={{ fontFamily: 'Inter', background: 'rgba(255,255,255,0.6)', color: '#4a4642' }}>Edit</button>
                      <button onClick={() => handleDelete(q.id)} className="px-2 py-1 rounded-lg text-xs" style={{ fontFamily: 'Inter', background: 'rgba(255,255,255,0.6)', color: '#dc2626' }}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Ideas */}
        <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.06)', border: '1px solid rgba(0, 169, 157, 0.15)' }}>
          <h4 className="font-semibold mb-2 text-sm" style={{ fontFamily: 'Montserrat Alternates', color: '#0D7871' }}>💡 Query Ideas</h4>
          <div className="grid md:grid-cols-2 gap-2 text-xs" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
            <div><strong>Category:</strong> "What is generative engine optimization?"</div>
            <div><strong>Solution:</strong> "Best tools for GEO in 2026"</div>
            <div><strong>Comparison:</strong> "[Your brand] vs [competitor]"</div>
            <div><strong>Use Case:</strong> "How to optimize content for AI search"</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HISTORY TAB
// ============================================

function HistoryTab({ testResults, competitors }: { testResults: TestResult[]; competitors: Competitor[] }) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterQuery, setFilterQuery] = useState<string>('');

  // Group results by session_id (actual test runs)
  const groupedResults = testResults.reduce((acc, result) => {
    // Use session_id if available, otherwise fall back to timestamp-based grouping
    const sessionId = (result as any).session_id || `session-${new Date(result.created_at).toISOString().split('T')[0]}-${result.query_text}`;
    
    if (!acc[sessionId]) {
      acc[sessionId] = {
        session_id: sessionId,
        timestamp: result.created_at,
        results: [],
        queries: new Set<string>(),
        totalMentions: 0,
        ownBrandMentioned: false,
        platforms: new Set<string>(),
      };
    }
    
    acc[sessionId].results.push(result);
    acc[sessionId].queries.add(result.query_text);
    acc[sessionId].totalMentions += result.mentions?.length || 0;
    acc[sessionId].platforms.add(result.platform);
    
    // Track earliest timestamp for the session
    if (new Date(result.created_at) < new Date(acc[sessionId].timestamp)) {
      acc[sessionId].timestamp = result.created_at;
    }
    
    if (result.mentions?.some(m => m.is_own_brand)) {
      acc[sessionId].ownBrandMentioned = true;
    }
    
    return acc;
  }, {} as Record<string, any>);

  // Convert to array and sort by timestamp (newest first)
  let sessions = Object.values(groupedResults).sort((a: any, b: any) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Apply filters
  if (filterPlatform !== 'all') {
    sessions = sessions.filter((s: any) => s.platforms.has(filterPlatform));
  }
  if (filterQuery) {
    sessions = sessions.filter((s: any) => 
      Array.from(s.queries).some((q: any) => q.toLowerCase().includes(filterQuery.toLowerCase()))
    );
  }

  // Format timestamp nicely
  const formatSessionTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${timeStr}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${timeStr}`;
    } else {
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${timeStr}`;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
          📜 Test History
        </h2>
        <span className="text-sm" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
          {sessions.length} test session{sessions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm"
          style={{ 
            fontFamily: 'Inter',
            background: 'rgba(255,255,255,0.8)',
            border: '1px solid rgba(0,0,0,0.08)',
            color: '#4a4642',
          }}
        >
          <option value="all">All Platforms</option>
          {PLATFORMS.map(p => (
            <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
          ))}
        </select>
        
        <input
          type="text"
          placeholder="Search queries..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm flex-1 min-w-[200px]"
          style={{ 
            fontFamily: 'Inter',
            background: 'rgba(255,255,255,0.8)',
            border: '1px solid rgba(0,0,0,0.08)',
            color: '#4a4642',
          }}
        />
      </div>

      {sessions.length === 0 ? (
        <div style={cardStyle} className="text-center py-12">
          <div className="text-4xl mb-3">📜</div>
          <p className="text-sm" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
            {testResults.length === 0 ? 'No tests recorded yet.' : 'No results match your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session: any, sIdx: number) => {
            const isExpanded = expandedSession === session.session_id;
            const platformsArray = Array.from(session.platforms) as string[];
            const queriesArray = Array.from(session.queries) as string[];
            
            // Group results by query within the session
            const resultsByQuery: Record<string, TestResult[]> = {};
            session.results.forEach((r: TestResult) => {
              if (!resultsByQuery[r.query_text]) resultsByQuery[r.query_text] = [];
              resultsByQuery[r.query_text].push(r);
            });
            
            return (
              <div 
                key={sIdx} 
                style={cardStyle}
                className="overflow-hidden"
              >
                {/* Session Header - Always visible */}
                <div 
                  className="flex items-start justify-between gap-4 cursor-pointer"
                  onClick={() => setExpandedSession(isExpanded ? null : session.session_id)}
                >
                  <div className="flex-1">
                    {/* Session time and badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-medium" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
                        🧪 {formatSessionTime(session.timestamp)}
                      </span>
                      
                      {session.ownBrandMentioned && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0, 169, 157, 0.15)', color: '#0D7871' }}>
                          ✓ You mentioned
                        </span>
                      )}
                    </div>
                    
                    {/* Stats row */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Platform icons */}
                      <div className="flex -space-x-1">
                        {platformsArray.map((pId: string) => {
                          const platform = PLATFORMS.find(p => p.id === pId);
                          return (
                            <span 
                              key={pId} 
                              className="w-7 h-7 rounded-full flex items-center justify-center text-base"
                              style={{ background: 'rgba(255,255,255,0.9)', border: '2px solid rgba(255,255,255,1)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                              title={platform?.name}
                            >
                              {platform?.icon}
                            </span>
                          );
                        })}
                      </div>
                      
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.05)', color: '#6b6560' }}>
                        {queriesArray.length} quer{queriesArray.length !== 1 ? 'ies' : 'y'}
                      </span>
                      
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.05)', color: '#6b6560' }}>
                        {session.results.length} response{session.results.length !== 1 ? 's' : ''}
                      </span>
                      
                      <span className="text-xs px-2 py-1 rounded-full" style={{ 
                        background: session.totalMentions > 0 ? 'rgba(250, 168, 25, 0.1)' : 'rgba(0,0,0,0.05)', 
                        color: session.totalMentions > 0 ? '#b37400' : '#6b6560' 
                      }}>
                        {session.totalMentions} brand{session.totalMentions !== 1 ? 's' : ''} detected
                      </span>
                    </div>
                    
                    {/* Query preview */}
                    {!isExpanded && (
                      <div className="mt-2 text-xs" style={{ color: '#6b6560' }}>
                        {queriesArray.slice(0, 2).map((q: string, i: number) => (
                          <span key={i}>
                            {i > 0 && ' • '}
                            "{q.length > 40 ? q.substring(0, 40) + '...' : q}"
                          </span>
                        ))}
                        {queriesArray.length > 2 && ` +${queriesArray.length - 2} more`}
                      </div>
                    )}
                  </div>
                  <div className="text-lg" style={{ color: '#6b6560' }}>
                    {isExpanded ? '▲' : '▼'}
                  </div>
                </div>

                {/* Expanded Content - Grouped by Query */}
                {isExpanded && (
                  <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    {Object.entries(resultsByQuery).map(([queryText, results], qIdx) => (
                      <div key={qIdx} className="p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)' }}>
                        <h4 className="font-medium mb-3 text-sm" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
                          "{queryText}"
                        </h4>
                        
                        <div className="space-y-2">
                          {results.map((result: TestResult, rIdx: number) => {
                            const platform = PLATFORMS.find(p => p.id === result.platform);
                            const resultKey = `${session.session_id}-${qIdx}-${rIdx}`;
                            const isResultExpanded = expandedResult === resultKey;
                            const mentionCount = result.mentions?.length || 0;
                            const ownBrandMention = result.mentions?.find(m => m.is_own_brand);

                            return (
                              <div 
                                key={rIdx}
                                className="p-3 rounded-xl"
                                style={{ background: 'rgba(255,255,255,0.7)' }}
                              >
                                {/* Platform header */}
                                <div 
                                  className="flex items-center justify-between cursor-pointer"
                                  onClick={(e) => { e.stopPropagation(); setExpandedResult(isResultExpanded ? null : resultKey); }}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-xl">{platform?.icon}</span>
                                    <span className="font-medium text-sm" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
                                      {platform?.name}
                                    </span>
                                    {ownBrandMention && (
                                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0, 169, 157, 0.15)', color: '#0D7871' }}>
                                        ✓ Mentioned
                                      </span>
                                    )}
                                    <span className="text-xs" style={{ color: '#6b6560' }}>
                                      {mentionCount} brand{mentionCount !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  <span className="text-sm" style={{ color: '#6b6560' }}>{isResultExpanded ? '−' : '+'}</span>
                                </div>

                                {/* Mentions preview (always show if has mentions and not expanded) */}
                                {result.mentions && result.mentions.length > 0 && !isResultExpanded && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {result.mentions.slice(0, 6).map((m: any, mIdx: number) => {
                                      const comp = competitors.find(c => c.id === m.competitor_id);
                                      return (
                                        <span 
                                          key={mIdx}
                                          className="text-xs px-2 py-0.5 rounded-full"
                                          style={{ 
                                            background: comp?.is_own_brand ? 'rgba(0, 169, 157, 0.1)' : 'rgba(0,0,0,0.05)',
                                            color: comp?.is_own_brand ? '#0D7871' : '#4a4642',
                                          }}
                                        >
                                          #{m.position} {comp?.name || m.competitor_name || 'Unknown'}
                                        </span>
                                      );
                                    })}
                                    {result.mentions.length > 6 && (
                                      <span className="text-xs" style={{ color: '#6b6560' }}>
                                        +{result.mentions.length - 6} more
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Full expanded details */}
                                {isResultExpanded && (
                                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                                    {/* All mentions */}
                                    {result.mentions && result.mentions.length > 0 && (
                                      <div className="mb-3">
                                        <div className="text-xs font-medium mb-2" style={{ color: '#6b6560' }}>Brands Detected:</div>
                                        <div className="flex flex-wrap gap-2">
                                          {result.mentions.map((m: any, mIdx: number) => {
                                            const comp = competitors.find(c => c.id === m.competitor_id);
                                            return (
                                              <span 
                                                key={mIdx}
                                                className="text-xs px-2 py-1 rounded-lg"
                                                style={{ 
                                                  background: comp?.is_own_brand ? 'rgba(0, 169, 157, 0.1)' : 'rgba(0,0,0,0.05)',
                                                  color: comp?.is_own_brand ? '#0D7871' : '#4a4642',
                                                }}
                                              >
                                                #{m.position} {comp?.name || m.competitor_name || 'Unknown'}
                                                {m.sentiment === 'positive' && ' 👍'}
                                                {m.sentiment === 'negative' && ' 👎'}
                                                {m.is_recommendation && ' ⭐'}
                                                {m.has_citation && ' 🔗'}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Response */}
                                    <div>
                                      <div className="text-xs font-medium mb-2" style={{ color: '#6b6560' }}>Response:</div>
                                      <div 
                                        className="text-xs p-3 rounded-lg max-h-64 overflow-y-auto"
                                        style={{ 
                                          background: 'rgba(255,255,255,0.9)',
                                          color: '#4a4642',
                                          whiteSpace: 'pre-wrap',
                                          lineHeight: '1.6',
                                        }}
                                      >
                                        {result.response_text || 'No response recorded'}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// UPGRADE MODAL
// ============================================

function UpgradeModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-8 relative" style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%)', border: '1px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5" style={{ color: '#6b6560' }}>✕</button>

        <div className="text-center">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>Upgrade to Growth</h2>
          <p className="mb-6 text-sm" style={{ fontFamily: 'Inter', color: '#4a4642' }}>Unlock automated testing and more tools.</p>

          <div className="text-left mb-6 p-4 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.06)' }}>
            <ul className="space-y-2 text-sm" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
              <li className="flex items-center gap-2"><span style={{ color: '#00A99D' }}>✓</span>15 Linking Strategy Maps/month</li>
              <li className="flex items-center gap-2"><span style={{ color: '#00A99D' }}>✓</span>1 Automated Share of Model Test/month</li>
              <li className="flex items-center gap-2"><span style={{ color: '#00A99D' }}>✓</span>Orchard Audit</li>
              <li className="flex items-center gap-2"><span style={{ color: '#00A99D' }}>✓</span>Page Analyzer</li>
            </ul>
          </div>

          <div className="mb-6">
            <span className="text-3xl font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>$79</span>
            <span style={{ fontFamily: 'Inter', color: '#6b6560' }}>/month</span>
            <p className="text-xs mt-1" style={{ fontFamily: 'Inter', color: '#6b6560' }}>or $849/year (save 10%)</p>
          </div>

          <button onClick={() => router.push('/settings/billing')} className="w-full px-6 py-3 rounded-xl text-white font-medium transition-all hover:shadow-lg" style={{ fontFamily: 'Montserrat Alternates', background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)' }}>
            Upgrade Now
          </button>

          <p className="mt-4 text-xs" style={{ fontFamily: 'Inter', color: '#6b6560' }}>🍊 Lock in founding member pricing during beta</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// RESEARCH TAB - Ask AI about your business
// ============================================

interface ResearchNote {
  id: string;
  user_id: string;
  question: string;
  response: string;
  platform: string;
  created_at: string;
  tags?: string[];
}

function ResearchTab({ 
  userId, 
  ownBrand,
  isGrowth,
  userEmail,
}: { 
  userId: string;
  ownBrand?: Competitor;
  isGrowth: boolean;
  userEmail: string;
}) {
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('chatgpt');
  const [asking, setAsking] = useState(false);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [monthlyUsage, setMonthlyUsage] = useState(0);

  // Check if user is unlimited (your account)
  const isUnlimited = userEmail === 'support@clemelopy.com' || userEmail === 'jen@clemelopy.com';
  const monthlyLimit = 10;
  const canAsk = isGrowth && (isUnlimited || monthlyUsage < monthlyLimit);

  useEffect(() => {
    loadNotes();
  }, [userId]);

  async function loadNotes() {
    try {
      const { data, error } = await supabase
        .from('som_research_notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading research notes:', error);
        // Table might not exist yet, that's okay
      } else {
        setNotes(data || []);
        // Count this month's usage
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        const monthlyNotes = (data || []).filter(n => new Date(n.created_at) >= thisMonth);
        setMonthlyUsage(monthlyNotes.length);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function askQuestion() {
    if (!question.trim() || !canAsk) return;

    setAsking(true);
    try {
      // Build a context-aware prompt
      const brandContext = ownBrand 
        ? `I'm researching for my business "${ownBrand.name}". ` 
        : '';
      
      const fullQuestion = brandContext + question;

      const response = await fetch(`${WORKER_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: fullQuestion,
          platform: selectedPlatform,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Save to database
      const { data: savedNote, error } = await supabase
        .from('som_research_notes')
        .insert({
          user_id: userId,
          question: question,
          response: data.response,
          platform: selectedPlatform,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving note:', error);
        // Still show the response even if save fails
        setNotes(prev => [{
          id: 'temp-' + Date.now(),
          user_id: userId,
          question: question,
          response: data.response,
          platform: selectedPlatform,
          created_at: new Date().toISOString(),
        }, ...prev]);
      } else if (savedNote) {
        setNotes(prev => [savedNote, ...prev]);
      }

      setQuestion('');
      setMonthlyUsage(prev => prev + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to get response');
    } finally {
      setAsking(false);
    }
  }

  async function deleteNote(noteId: string) {
    try {
      await supabase
        .from('som_research_notes')
        .delete()
        .eq('id', noteId);

      setNotes(prev => prev.filter(n => n.id !== noteId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  }

  const suggestedQuestions = [
    `What do AI platforms say about ${ownBrand?.name || 'my business'}?`,
    'What are the top tools in my industry according to AI?',
    'How can I improve my visibility in AI search results?',
    'What content topics should I focus on for GEO?',
    'Who are my main competitors according to AI?',
  ];

  // Show upgrade prompt if not on Growth plan
  if (!isGrowth) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
              🔬 Research Notes
            </h2>
            <p className="text-sm" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
              Ask AI platforms about your business and save insights for later
            </p>
          </div>
        </div>
        <div style={cardStyle} className="text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
            Research Notes is a Growth Feature
          </h3>
          <p className="text-sm mb-4" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
            Upgrade to Growth to ask AI platforms questions about your business and save insights.
          </p>
          <p className="text-xs mb-6" style={{ fontFamily: 'Inter', color: '#9ca3af' }}>
            Includes 10 research queries per month
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
            🔬 Research Notes
          </h2>
          <p className="text-sm" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
            Ask AI platforms about your business and save insights for later
          </p>
        </div>
        {!isUnlimited && (
          <div className="text-right">
            <span className="text-sm font-medium" style={{ fontFamily: 'Inter', color: canAsk ? '#0D7871' : '#b37400' }}>
              {monthlyLimit - monthlyUsage} research queries left
            </span>
            <p className="text-xs" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
              Resets monthly
            </p>
          </div>
        )}
      </div>

      {/* Ask Question */}
      <div style={cardStyle} className="mb-6">
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
            Ask a Question
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={ownBrand 
              ? `Ask about ${ownBrand.name}, your industry, competitors, or content strategies...` 
              : "Ask about your industry, competitors, or content strategies..."}
            className="w-full p-3 rounded-xl text-sm resize-none"
            rows={3}
            style={{ 
              fontFamily: 'Inter',
              background: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(0,0,0,0.08)',
              color: '#1a1a1a',
            }}
          />
        </div>

        {/* Platform selector */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-xs font-medium" style={{ color: '#6b6560' }}>Ask:</span>
          {PLATFORMS.slice(0, 4).map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlatform(p.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                fontFamily: 'Inter',
                background: selectedPlatform === p.id ? 'rgba(0, 169, 157, 0.15)' : 'rgba(255,255,255,0.8)',
                border: selectedPlatform === p.id ? '1px solid rgba(0, 169, 157, 0.3)' : '1px solid rgba(0,0,0,0.08)',
                color: selectedPlatform === p.id ? '#0D7871' : '#4a4642',
              }}
            >
              {p.icon} {p.name}
            </button>
          ))}
        </div>

        {/* Suggested questions */}
        <div className="mb-4">
          <span className="text-xs font-medium block mb-2" style={{ color: '#6b6560' }}>Suggested:</span>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.slice(0, 3).map((q, idx) => (
              <button
                key={idx}
                onClick={() => setQuestion(q)}
                className="text-xs px-3 py-1.5 rounded-lg transition-all hover:shadow-sm"
                style={{ 
                  fontFamily: 'Inter',
                  background: 'rgba(250, 168, 25, 0.1)',
                  color: '#b37400',
                  border: '1px solid rgba(250, 168, 25, 0.2)',
                }}
              >
                {q.length > 40 ? q.substring(0, 40) + '...' : q}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={askQuestion}
          disabled={!question.trim() || asking || !canAsk}
          className="w-full px-4 py-3 rounded-xl text-white font-medium transition-all hover:shadow-lg disabled:opacity-50"
          style={{ 
            fontFamily: 'Montserrat Alternates',
            background: canAsk ? 'linear-gradient(135deg, #00A99D, #0D7871)' : '#9ca3af',
          }}
        >
          {asking ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> Asking {PLATFORMS.find(p => p.id === selectedPlatform)?.name}...
            </span>
          ) : !canAsk ? (
            <span>Monthly limit reached (10/10)</span>
          ) : (
            <span>🔍 Ask {PLATFORMS.find(p => p.id === selectedPlatform)?.name}</span>
          )}
        </button>
      </div>

      {/* Saved Notes */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>
          📝 Saved Insights ({notes.length})
        </h3>
      </div>

      {loading ? (
        <div style={cardStyle} className="text-center py-8">
          <p className="text-sm" style={{ fontFamily: 'Inter', color: '#6b6560' }}>Loading notes...</p>
        </div>
      ) : notes.length === 0 ? (
        <div style={cardStyle} className="text-center py-12">
          <div className="text-4xl mb-3">🔬</div>
          <p className="text-sm mb-2" style={{ fontFamily: 'Inter', color: '#4a4642' }}>
            No research notes yet
          </p>
          <p className="text-xs" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
            Ask AI platforms questions about your business to build your knowledge base
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => {
            const platform = PLATFORMS.find(p => p.id === note.platform);
            const isExpanded = expandedNote === note.id;
            
            return (
              <div 
                key={note.id}
                style={cardStyle}
              >
                {/* Header */}
                <div 
                  className="flex items-start justify-between gap-4 cursor-pointer"
                  onClick={() => setExpandedNote(isExpanded ? null : note.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{platform?.icon}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.05)', color: '#6b6560' }}>
                        {platform?.name}
                      </span>
                      <span className="text-xs" style={{ color: '#9ca3af' }}>
                        {new Date(note.created_at).toLocaleDateString('en-US', { 
                          month: 'short', day: 'numeric', year: 'numeric' 
                        })}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
                      "{note.question}"
                    </h4>
                    {!isExpanded && (
                      <p className="text-xs mt-2 line-clamp-2" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                        {note.response.substring(0, 150)}...
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {deleteConfirm === note.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200"
                        >
                          Delete
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                          className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(note.id); }}
                        className="text-xs px-2 py-1 rounded hover:bg-black/5 transition-all"
                        style={{ color: '#9ca3af' }}
                      >
                        🗑️
                      </button>
                    )}
                    <span style={{ color: '#6b6560' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded response */}
                {isExpanded && (
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <div 
                      className="p-4 rounded-xl text-sm"
                      style={{ 
                        fontFamily: 'Inter',
                        background: 'rgba(0,0,0,0.02)',
                        color: '#4a4642',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.7',
                      }}
                    >
                      {note.response}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}