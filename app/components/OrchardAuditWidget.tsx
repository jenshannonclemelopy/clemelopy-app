'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

interface RecentAudit {
  id: string;
  url: string;
  domain: string;
  overall_score: number;
  overall_grade: string;
  created_at: string;
}

interface AuditSummary {
  total_audits: number;
  avg_score: number | null;
  best_score: number | null;
  recent_audits: RecentAudit[] | null;
}

export default function OrchardAuditWidget() {
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch audit summary using RPC function
        const { data, error } = await supabase.rpc('get_audit_summary', { p_user_id: user.id });
        
        if (!error && data) {
          setSummary(data);
        } else {
          // Fallback: fetch directly if RPC doesn't exist yet
          const { data: audits } = await supabase
            .from('orchard_audits')
            .select('id, url, domain, overall_score, overall_grade, created_at')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(5);

          if (audits && audits.length > 0) {
            const scores = audits.map(a => a.overall_score);
            setSummary({
              total_audits: audits.length,
              avg_score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
              best_score: Math.max(...scores),
              recent_audits: audits
            });
          } else {
            setSummary({
              total_audits: 0,
              avg_score: null,
              best_score: null,
              recent_audits: null
            });
          }
        }
      } catch (err) {
        console.error('Error fetching audit summary:', err);
        setSummary({
          total_audits: 0,
          avg_score: null,
          best_score: null,
          recent_audits: null
        });
      }
      
      setLoading(false);
    };

    fetchSummary();
  }, []);

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

  if (loading) {
    return (
      <div 
        className="rounded-2xl p-6"
        style={{
          background: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.4)'
        }}
      >
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-2xl p-6 hover:shadow-lg transition-shadow"
      style={{
        background: 'rgba(255, 255, 255, 0.5)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.4)'
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#2e2a27] flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates' }}>
          <span>🍊</span> Orchard Audit
        </h3>
        <Link 
          href="/tools/orchard-audit"
          className="text-sm text-[#00A99D] hover:underline"
          style={{ fontFamily: 'Inter' }}
        >
          View all →
        </Link>
      </div>

      {!summary || summary.total_audits === 0 ? (
        /* Empty State */
        <div className="text-center py-6">
          <div className="text-4xl mb-3">🌱</div>
          <p className="text-[#2e2a27]/60 text-sm mb-4" style={{ fontFamily: 'Inter' }}>
            See how AI-ready your website is
          </p>
          <Link
            href="/tools/orchard-audit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #00A99D, #0D7871)',
              fontFamily: 'Inter'
            }}
          >
            Run Your First Audit
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="flex justify-between mb-4 pb-4 border-b border-white/20">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#2e2a27]" style={{ fontFamily: 'Montserrat Alternates' }}>
                {summary.total_audits}
              </div>
              <div className="text-xs text-[#2e2a27]/60" style={{ fontFamily: 'Inter' }}>Audits</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates' }}>
                {summary.avg_score || 0}
              </div>
              <div className="text-xs text-[#2e2a27]/60" style={{ fontFamily: 'Inter' }}>Avg Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#FAA819]" style={{ fontFamily: 'Montserrat Alternates' }}>
                {summary.best_score || 0}
              </div>
              <div className="text-xs text-[#2e2a27]/60" style={{ fontFamily: 'Inter' }}>Best Score</div>
            </div>
          </div>

          {/* Recent Audits */}
          {summary.recent_audits && summary.recent_audits.length > 0 && (
            <div className="space-y-2">
              {summary.recent_audits.slice(0, 3).map((audit) => (
                <Link
                  key={audit.id}
                  href={`/tools/orchard-audit?id=${audit.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: getGradeColor(audit.overall_grade) }}
                  >
                    {audit.overall_grade}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#2e2a27] truncate" style={{ fontFamily: 'Inter' }}>
                      {audit.domain}
                    </div>
                    <div className="text-xs text-[#2e2a27]/50" style={{ fontFamily: 'Inter' }}>
                      Score: {audit.overall_score}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-[#2e2a27]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}

          {/* New Audit Button */}
          <Link
            href="/tools/orchard-audit"
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[#00A99D] text-sm font-medium border border-[#00A99D]/30 hover:bg-[#00A99D]/10 transition-colors"
            style={{ fontFamily: 'Inter' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Audit
          </Link>
        </>
      )}
    </div>
  );
}
