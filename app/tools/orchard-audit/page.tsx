'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import PageContainer from '../../components/PageContainer';
import PageTour from '../../components/PageTour';
import { orchardAuditTourSteps } from '../../components/orchardAuditTourSteps';
import OrchardAuditResults from '../../components/OrchardAuditResults';
import { supabase } from '../../lib/supabase';

interface AuditUsage {
  single_audits_used: number;
  single_audits_limit: number;
  full_site_audits_used: number;
  full_site_audits_limit: number;
}

interface AuditHistory {
  id: string;
  url: string;
  domain: string;
  overall_score: number;
  overall_grade: string;
  created_at: string;
  audit_type: string;
}

export default function OrchardAuditPage() {
  const [url, setUrl] = useState('');
  const [auditType, setAuditType] = useState<'single' | 'full_site'>('single');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAudit, setCurrentAudit] = useState<any>(null);
  const [usage, setUsage] = useState<AuditUsage | null>(null);
  const [history, setHistory] = useState<AuditHistory[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showTour, setShowTour] = useState(false);

  const handleTourClick = () => {
    setShowTour(true);
  };

  useEffect(() => {
    fetchUsage();
    fetchHistory();
  }, []);

  const fetchUsage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('orchard_audit_usage')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setUsage(data);
    } else {
      const { data: newUsage } = await supabase
        .from('orchard_audit_usage')
        .insert({ user_id: user.id })
        .select()
        .single();
      if (newUsage) setUsage(newUsage);
    }
  };

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('orchard_audits')
      .select('id, url, domain, overall_score, overall_grade, created_at, audit_type')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setHistory(data);
  };

  const validateUrl = (urlString: string): boolean => {
    try {
      const parsed = new URL(urlString);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleFullSiteClick = () => {
    if (usage?.full_site_audits_limit === 0) {
      setShowUpgradeModal(true);
    } else {
      setAuditType('full_site');
    }
  };

  const runAudit = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    if (!validateUrl(normalizedUrl)) {
      setError('Please enter a valid URL');
      return;
    }

    if (usage) {
      if (auditType === 'single' && usage.single_audits_used >= usage.single_audits_limit) {
        setError('You\'ve reached your monthly limit for single page audits. Upgrade for more.');
        return;
      }
      if (auditType === 'full_site' && usage.full_site_audits_used >= usage.full_site_audits_limit) {
        setError('Full site audits require a paid plan. Upgrade to access this feature.');
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setCurrentAudit(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create audit record
      const { data: auditRecord, error: createError } = await supabase
        .from('orchard_audits')
        .insert({
          user_id: user.id,
          url: normalizedUrl,
          domain: new URL(normalizedUrl).hostname,
          audit_type: auditType,
          status: 'processing'
        })
        .select()
        .single();

      if (createError) throw createError;

      // Call the worker
      const workerUrl = process.env.NEXT_PUBLIC_ORCHARD_AUDIT_WORKER_URL || 'https://orchard-audits.jen-86f.workers.dev';
      
      const response = await fetch(`${workerUrl}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Audit failed');
      }

      // Update audit record with results
      const { error: updateError } = await supabase
        .from('orchard_audits')
        .update({
          page_title: result.page_title,
          overall_score: result.overall_score,
          overall_grade: result.overall_grade,
          clarity_score: result.category_scores.clarity.score,
          authority_score: result.category_scores.authority.score,
          structure_score: result.category_scores.structure.score,
          ai_readability_score: result.category_scores.ai_readability.score,
          media_score: result.category_scores.media.score,
          accessibility_score: result.category_scores.accessibility.score,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', auditRecord.id);

      if (updateError) throw updateError;

      // Insert issues
      const issuesToInsert = result.all_issues.map((issue: any) => ({
        audit_id: auditRecord.id,
        category: issue.category,
        check_name: issue.check_name,
        status: issue.status,
        points_possible: issue.points_possible,
        points_earned: issue.points_earned,
        title: issue.title,
        description: issue.description,
        recommendation: issue.recommendation,
        technical_details: issue.technical_details,
        element_html: issue.element_html,
        impact: issue.impact,
        difficulty: issue.difficulty
      }));

      await supabase.from('orchard_audit_issues').insert(issuesToInsert);

      // Update usage
      await supabase.rpc('increment_audit_usage', { 
        p_user_id: user.id, 
        p_audit_type: auditType 
      });

      // Set current audit with full results
      setCurrentAudit({
        ...auditRecord,
        ...result,
        id: auditRecord.id
      });

      // Refresh usage and history
      fetchUsage();
      fetchHistory();

    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      console.error('Audit error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAudit = async (auditId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: audit, error: auditError } = await supabase
        .from('orchard_audits')
        .select('*')
        .eq('id', auditId)
        .single();

      if (auditError) throw auditError;

      const { data: issues, error: issuesError } = await supabase
        .from('orchard_audit_issues')
        .select('*')
        .eq('audit_id', auditId)
        .order('impact', { ascending: true });

      if (issuesError) throw issuesError;

      const fullResult = {
        ...audit,
        category_scores: {
          clarity: { score: audit.clarity_score, max: 20, percentage: Math.round((audit.clarity_score / 20) * 100) },
          authority: { score: audit.authority_score, max: 15, percentage: Math.round((audit.authority_score / 15) * 100) },
          structure: { score: audit.structure_score, max: 20, percentage: Math.round((audit.structure_score / 20) * 100) },
          ai_readability: { score: audit.ai_readability_score, max: 15, percentage: Math.round((audit.ai_readability_score / 15) * 100) },
          media: { score: audit.media_score, max: 15, percentage: Math.round((audit.media_score / 15) * 100) },
          accessibility: { score: audit.accessibility_score, max: 15, percentage: Math.round((audit.accessibility_score / 15) * 100) }
        },
        all_issues: issues,
        fix_these_first: issues?.filter((i: any) => i.status === 'fail' || i.status === 'warning').slice(0, 5) || [],
        summary: {
          total_checks: issues?.length || 0,
          passed: issues?.filter((i: any) => i.status === 'pass').length || 0,
          warnings: issues?.filter((i: any) => i.status === 'warning').length || 0,
          failed: issues?.filter((i: any) => i.status === 'fail').length || 0,
          info: issues?.filter((i: any) => i.status === 'info').length || 0
        }
      };

      setCurrentAudit(fullResult);

    } catch (err: any) {
      setError(err.message || 'Failed to load audit');
    } finally {
      setIsLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return '#00A99D';
      case 'B': return '#4CAF50';
      case 'C': return '#FAA819';
      case 'D': return '#FF9800';
      case 'F': return '#F44336';
      default: return '#666';
    }
  };

  const getGradeLabel = (grade: string) => {
    switch (grade) {
      case 'A': return 'Orchard Thriving';
      case 'B': return 'Healthy Growth';
      case 'C': return 'Needs Tending';
      case 'D': return 'Root Problems';
      case 'F': return 'Needs Replanting';
      default: return '';
    }
  };

  return (
    <Layout activeNav="tools">
      <main>
        {/* Page Header */}
        <PageHeader
          titleStart="Orchard"
          titleEnd="Audit"
          subtitle="See your website the way AI sees it. Get a GEO readiness score with actionable recommendations."
          centered={true}
          showTour={true}
          onTourClick={handleTourClick}
        />

        {/* Usage Stats Bar */}
        {usage && (
          <div data-tour="audit-usage-stats" className="flex justify-center gap-4 mb-6">
            <div 
              className="px-4 py-2 rounded-xl text-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                fontFamily: 'Inter',
                fontWeight: 500,
              }}
            >
              <span style={{ color: '#4a4642' }}>Single Page Audits: </span>
              <span style={{ color: '#00A99D', fontWeight: 600 }}>
                {usage.single_audits_limit - usage.single_audits_used} remaining
              </span>
              <span style={{ color: '#6b6560' }}> / {usage.single_audits_limit} this month</span>
            </div>
            {usage.full_site_audits_limit > 0 && (
              <div 
                className="px-4 py-2 rounded-xl text-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  fontFamily: 'Inter',
                  fontWeight: 500,
                }}
              >
                <span style={{ color: '#4a4642' }}>Full Site Audits: </span>
                <span style={{ color: '#00A99D', fontWeight: 600 }}>
                  {usage.full_site_audits_limit - usage.full_site_audits_used} remaining
                </span>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <PageContainer>
          {/* URL Input - shown when no current audit */}
          {!currentAudit && !isLoading && (
            <div>
              
              {/* Inner Container for URL Input and Audit Type */}
              <div 
                className="p-6 rounded-2xl mb-6"
                style={{
                  background: 'rgba(255, 255, 255, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.6)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                }}
              >
                {/* Audit Type Selection - Now at the top */}
                <div data-tour="audit-type-selector" className="flex gap-3 justify-center mb-6">
                  {/* Single Page Button */}
                  <button
                    onClick={() => setAuditType('single')}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl transition-all"
                    style={{ 
                      background: auditType === 'single' 
                        ? 'linear-gradient(135deg, #00A99D, #0D7871)' 
                        : 'rgba(255, 255, 255, 0.7)',
                      border: auditType === 'single' 
                        ? 'none' 
                        : '1px solid rgba(0, 169, 157, 0.3)',
                      boxShadow: auditType === 'single' 
                        ? '0 4px 15px rgba(0, 169, 157, 0.3)' 
                        : '0 2px 8px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <svg 
                      className="w-5 h-5" 
                      fill="none" 
                      stroke={auditType === 'single' ? 'white' : '#00A99D'} 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span style={{ 
                      fontFamily: 'Montserrat Alternates', 
                      fontWeight: 600, 
                      color: auditType === 'single' ? 'white' : '#005a54',
                      fontSize: '14px'
                    }}>
                      Single Page
                    </span>
                  </button>

                  {/* Full Site Button */}
                  <button
                    onClick={handleFullSiteClick}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl transition-all"
                    style={{ 
                      background: auditType === 'full_site' && usage?.full_site_audits_limit !== 0
                        ? 'linear-gradient(135deg, #00A99D, #0D7871)' 
                        : 'rgba(255, 255, 255, 0.7)',
                      border: auditType === 'full_site' && usage?.full_site_audits_limit !== 0
                        ? 'none' 
                        : '1px solid rgba(0, 169, 157, 0.3)',
                      boxShadow: auditType === 'full_site' && usage?.full_site_audits_limit !== 0
                        ? '0 4px 15px rgba(0, 169, 157, 0.3)' 
                        : '0 2px 8px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <svg 
                      className="w-5 h-5" 
                      fill="none" 
                      stroke={auditType === 'full_site' && usage?.full_site_audits_limit !== 0 ? 'white' : '#00A99D'} 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span style={{ 
                      fontFamily: 'Montserrat Alternates', 
                      fontWeight: 600, 
                      color: auditType === 'full_site' && usage?.full_site_audits_limit !== 0 ? 'white' : '#005a54',
                      fontSize: '14px'
                    }}>
                      Full Site
                    </span>
                    {usage?.full_site_audits_limit === 0 && (
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full text-white ml-1"
                        style={{ background: 'linear-gradient(135deg, #FAA819, #E99502)' }}
                      >
                        Growth
                      </span>
                    )}
                  </button>
                </div>

                {/* URL Input Section */}
                <div data-tour="audit-url-input">
                  <label 
                    className="block text-sm mb-2" 
                    style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}
                  >
                    {auditType === 'single' ? 'Page URL to audit' : 'Website URL to audit'}
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        setError(null);
                      }}
                      placeholder={auditType === 'single' ? 'https://yourwebsite.com/page' : 'https://yourwebsite.com'}
                      className="flex-1 px-4 py-3 rounded-xl text-[#1a1a1a] placeholder-[#9a9590] focus:outline-none focus:ring-2 focus:ring-[#00A99D] transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        border: '1px solid rgba(0, 169, 157, 0.2)',
                        fontFamily: 'Inter',
                        fontWeight: 500,
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && runAudit()}
                    />
                    <button
                      data-tour="audit-run-button"
                      onClick={runAudit}
                      disabled={isLoading}
                      className="px-6 py-3 rounded-xl text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: 'linear-gradient(135deg, #00A99D, #0D7871)',
                        boxShadow: '0 4px 15px rgba(0, 169, 157, 0.3)',
                        fontFamily: 'Montserrat Alternates',
                        fontWeight: 600,
                      }}
                    >
                      {isLoading ? 'Analyzing...' : 'Run Audit'}
                    </button>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div 
                      className="mt-3 p-3 rounded-xl flex items-center gap-2"
                      style={{
                        background: 'rgba(244, 67, 54, 0.1)',
                        border: '1px solid rgba(244, 67, 54, 0.3)',
                      }}
                    >
                      <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span style={{ fontFamily: 'Inter', fontWeight: 500, color: '#c62828', fontSize: '14px' }}>
                        {error}
                      </span>
                    </div>
                  )}

                  {/* Helper Text */}
                  <p 
                    className="mt-3 text-sm text-center"
                    style={{ fontFamily: 'Inter', fontWeight: 500, color: '#6b6560' }}
                  >
                    {auditType === 'single' 
                      ? 'Analyze a single page for GEO readiness, accessibility, and AI discoverability.' 
                      : 'Crawl and analyze up to 50 pages on your website for a comprehensive audit.'}
                  </p>
                </div>
              </div>

              {/* What We Analyze Section */}
              <div 
                data-tour="audit-categories"
                className="p-6 rounded-2xl mb-6"
                style={{
                  background: 'rgba(255, 255, 255, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.6)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                }}
              >
                <h3 
                  className="text-lg mb-4 text-center" 
                  style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}
                >
                  What We Analyze
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { icon: '✨', label: 'Clarity', desc: 'Headings & structure' },
                    { icon: '🏆', label: 'Authority', desc: 'Schema & identity' },
                    { icon: '🔗', label: 'Structure', desc: 'Links & navigation' },
                    { icon: '🤖', label: 'AI Readability', desc: 'Quotable content' },
                    { icon: '🖼️', label: 'Media', desc: 'Images & alt text' },
                    { icon: '♿', label: 'Accessibility', desc: 'WCAG compliance' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="p-3 rounded-xl text-center"
                      style={{
                        background: 'rgba(255, 255, 255, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                      }}
                    >
                      <div className="text-2xl mb-1">{item.icon}</div>
                      <div style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a', fontSize: '14px' }}>
                        {item.label}
                      </div>
                      <div style={{ fontFamily: 'Inter', fontWeight: 500, color: '#6b6560', fontSize: '12px' }}>
                        {item.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Audits Section */}
              {history.length > 0 && (
                <div 
                  data-tour="audit-history"
                  className="p-6 rounded-2xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <h3 
                    className="text-lg mb-4" 
                    style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}
                  >
                    Recent Audits
                  </h3>
                  <div className="space-y-2">
                    {history.slice(0, 5).map((audit) => (
                      <div
                        key={audit.id}
                        onClick={() => loadAudit(audit.id)}
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:shadow-md"
                        style={{
                          background: 'rgba(255, 255, 255, 0.6)',
                          border: '1px solid rgba(255, 255, 255, 0.5)',
                        }}
                      >
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                          style={{ 
                            background: getGradeColor(audit.overall_grade),
                            fontFamily: 'Montserrat Alternates',
                            fontWeight: 700,
                          }}
                        >
                          {audit.overall_grade}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div 
                            className="truncate"
                            style={{ fontFamily: 'Inter', fontWeight: 600, color: '#1a1a1a', fontSize: '14px' }}
                          >
                            {audit.domain}
                          </div>
                          <div style={{ fontFamily: 'Inter', fontWeight: 500, color: '#6b6560', fontSize: '12px' }}>
                            {new Date(audit.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700, color: getGradeColor(audit.overall_grade), fontSize: '18px' }}>
                          {audit.overall_score}
                        </div>
                        <svg className="w-5 h-5 shrink-0" style={{ color: '#6b6560' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div 
              className="text-center py-16 rounded-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div 
                className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4"
                style={{ borderColor: 'rgba(0, 169, 157, 0.2)', borderTopColor: '#00A99D' }}
              />
              <p style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>
                Analyzing your page...
              </p>
              <p style={{ fontFamily: 'Inter', fontWeight: 500, color: '#6b6560', fontSize: '14px', marginTop: '8px' }}>
                This usually takes 15-30 seconds
              </p>
            </div>
          )}

          {/* Results - wrapped in readable container */}
          {currentAudit && !isLoading && (
            <div 
              className="rounded-2xl p-6"
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
              }}
            >
              <OrchardAuditResults 
                audit={currentAudit} 
                onNewAudit={() => {
                  setCurrentAudit(null);
                  setUrl('');
                }}
              />
            </div>
          )}
        </PageContainer>
      </main>

      {/* Growth Plan Upgrade Modal */}
      {showUpgradeModal && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[200] animate-fade-in"
            onClick={() => setShowUpgradeModal(false)}
            aria-hidden="true"
          />

          {/* Modal */}
          <div 
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
            onClick={() => setShowUpgradeModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-modal-title"
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 outline-none animate-modal-slide-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icon */}
              <div className="w-12 h-12 bg-[#00A99D]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="text-[#00A99D]">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h2 
                id="upgrade-modal-title"
                className="text-xl text-center text-[#1a1a1a] mb-2"
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
              >
                Unlock Full Site Audits
              </h2>

              {/* Subtitle */}
              <p 
                className="text-center text-[#5c5652] mb-6"
                style={{ fontFamily: 'Inter', fontWeight: 500 }}
              >
                Upgrade to the Growth Plan to analyze your entire website at once.
              </p>

              {/* Features */}
              <div 
                className="rounded-xl p-4 mb-6"
                style={{
                  background: 'rgba(0, 169, 157, 0.08)',
                  border: '1px solid rgba(0, 169, 157, 0.2)',
                }}
              >
                <div className="space-y-3">
                  {[
                    'Crawls up to 50 pages per site audit',
                    '1 full site audit per month',
                    '10 single page audits per month',
                    '15 Linking Strategy Maps',
                    'Priority support',
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-[#00A99D]">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span style={{ fontFamily: 'Inter', fontWeight: 500, color: '#1a1a1a', fontSize: '14px' }}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-lg line-through" style={{ fontFamily: 'Montserrat Alternates', color: '#6b6560' }}>
                    $149
                  </span>
                  <span style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700, color: '#1a1a1a', fontSize: '32px' }}>
                    $79
                  </span>
                  <span style={{ fontFamily: 'Inter', fontWeight: 500, color: '#6b6560', fontSize: '16px' }}>
                    /month
                  </span>
                  <span 
                    className="ml-2 px-2 py-0.5 rounded-full text-xs text-white"
                    style={{ background: 'linear-gradient(135deg, #FAA819, #E99502)', fontFamily: 'Inter', fontWeight: 600 }}
                  >
                    Beta
                  </span>
                </div>
                <p style={{ fontFamily: 'Inter', fontWeight: 500, color: '#6b6560', fontSize: '13px', marginTop: '4px' }}>
                  Cancel anytime. No contracts.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl border-2 border-[#dedede] text-[#1a1a1a] font-medium hover:bg-[#fffaf3] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2"
                  style={{ fontFamily: 'Montserrat Alternates' }}
                >
                  Maybe later
                </button>
                <button
                  onClick={() => {
                    window.location.href = '/pricing?plan=growth';
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#00A99D] to-[#0D7871] text-white font-medium transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2"
                  style={{ fontFamily: 'Montserrat Alternates' }}
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Page Tour */}
      <PageTour
        steps={orchardAuditTourSteps}
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        onComplete={() => setShowTour(false)}
        tourName="orchard-audit"
      />
    </Layout>
  );
}