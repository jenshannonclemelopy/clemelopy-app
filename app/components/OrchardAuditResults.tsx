'use client';

import React, { useState } from 'react';

interface CategoryScore {
  score: number;
  max: number;
  percentage: number;
}

interface Issue {
  id?: string;
  category: string;
  check_name: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  points_possible: number;
  points_earned: number;
  title: string;
  description?: string;
  recommendation?: string;
  technical_details?: any;
  element_html?: string;
  impact: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
}

interface AuditResult {
  id: string;
  url: string;
  domain: string;
  page_title?: string;
  overall_score: number;
  overall_grade: string;
  category_scores: {
    clarity: CategoryScore;
    authority: CategoryScore;
    structure: CategoryScore;
    ai_readability: CategoryScore;
    media: CategoryScore;
    accessibility: CategoryScore;
  };
  fix_these_first: Issue[];
  all_issues: Issue[];
  summary: {
    total_checks: number;
    passed: number;
    warnings: number;
    failed: number;
    info: number;
  };
}

interface Props {
  audit: AuditResult;
  onNewAudit: () => void;
}

const CATEGORY_INFO = {
  clarity: { icon: '🎯', label: 'Clarity', color: '#00A99D' },
  authority: { icon: '🏆', label: 'Authority', color: '#FAA819' },
  structure: { icon: '🔗', label: 'Structure', color: '#E99502' },
  ai_readability: { icon: '🤖', label: 'AI Readability', color: '#0D7871' },
  media: { icon: '🖼️', label: 'Media', color: '#FF6B6B' },
  accessibility: { icon: '♿', label: 'Accessibility', color: '#9B59B6' }
};

export default function OrchardAuditResults({ audit, onNewAudit }: Props) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showAllIssues, setShowAllIssues] = useState(false);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✓';
      case 'fail': return '✗';
      case 'warning': return '!';
      case 'info': return 'i';
      default: return '?';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return '#00A99D';
      case 'fail': return '#F44336';
      case 'warning': return '#FAA819';
      case 'info': return '#2196F3';
      default: return '#666';
    }
  };

  const getImpactBadge = (impact: string) => {
    const colors = {
      high: { bg: '#F4433620', text: '#F44336' },
      medium: { bg: '#FAA81920', text: '#FAA819' },
      low: { bg: '#00A99D20', text: '#00A99D' }
    };
    const color = colors[impact as keyof typeof colors] || colors.medium;
    return (
      <span 
        className="text-xs px-2 py-0.5 rounded-full font-medium"
        style={{ background: color.bg, color: color.text }}
      >
        {impact} impact
      </span>
    );
  };

  const getDifficultyBadge = (difficulty: string) => {
    const colors = {
      easy: { bg: '#00A99D20', text: '#00A99D' },
      medium: { bg: '#FAA81920', text: '#FAA819' },
      hard: { bg: '#F4433620', text: '#F44336' }
    };
    const color = colors[difficulty as keyof typeof colors] || colors.medium;
    return (
      <span 
        className="text-xs px-2 py-0.5 rounded-full font-medium"
        style={{ background: color.bg, color: color.text }}
      >
        {difficulty} fix
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header with Score */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={onNewAudit}
            className="text-sm text-[#00A99D] hover:underline flex items-center gap-1"
            style={{ fontFamily: 'Inter' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            New Audit
          </button>
        </div>

        {/* Big Score Circle */}
        <div className="relative inline-block mb-4">
          <svg className="w-40 h-40" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#e0e0e0"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={getGradeColor(audit.overall_grade)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(audit.overall_score / 100) * 339.292} 339.292`}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span 
              className="text-5xl font-bold"
              style={{ color: getGradeColor(audit.overall_grade), fontFamily: 'Montserrat Alternates' }}
            >
              {audit.overall_score}
            </span>
            <span className="text-sm text-[#2e2a27]/60" style={{ fontFamily: 'Inter' }}>out of 100</span>
          </div>
        </div>

        <div 
          className="text-3xl font-bold mb-1"
          style={{ color: getGradeColor(audit.overall_grade), fontFamily: 'Montserrat Alternates' }}
        >
          Grade: {audit.overall_grade}
        </div>
        <div className="text-lg text-[#2e2a27]/70" style={{ fontFamily: 'Inter' }}>
          {getGradeLabel(audit.overall_grade)}
        </div>

        <div className="mt-4 text-sm text-[#2e2a27]/60" style={{ fontFamily: 'Inter' }}>
          <span className="font-medium">{audit.domain}</span>
          {audit.page_title && <span> — {audit.page_title}</span>}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="flex justify-center gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates' }}>
            {audit.summary.passed}
          </div>
          <div className="text-xs text-[#2e2a27]/60" style={{ fontFamily: 'Inter' }}>Passed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-[#FAA819]" style={{ fontFamily: 'Montserrat Alternates' }}>
            {audit.summary.warnings}
          </div>
          <div className="text-xs text-[#2e2a27]/60" style={{ fontFamily: 'Inter' }}>Warnings</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-[#F44336]" style={{ fontFamily: 'Montserrat Alternates' }}>
            {audit.summary.failed}
          </div>
          <div className="text-xs text-[#2e2a27]/60" style={{ fontFamily: 'Inter' }}>Failed</div>
        </div>
      </div>

      {/* Category Scores */}
      <div>
        <h3 className="text-lg font-semibold text-[#2e2a27] mb-4" style={{ fontFamily: 'Montserrat Alternates' }}>
          Category Breakdown
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(audit.category_scores).map(([key, score]) => {
            const info = CATEGORY_INFO[key as keyof typeof CATEGORY_INFO];
            const categoryIssues = audit.all_issues.filter(i => i.category === key);
            const isExpanded = expandedCategory === key;

            return (
              <div key={key}>
                <div
                  onClick={() => setExpandedCategory(isExpanded ? null : key)}
                  className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                  style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    border: `2px solid ${isExpanded ? info.color : 'transparent'}`
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{info.icon}</span>
                      <span className="font-medium text-[#2e2a27] text-sm" style={{ fontFamily: 'Montserrat Alternates' }}>
                        {info.label}
                      </span>
                    </div>
                    <span className="text-lg font-bold" style={{ color: info.color, fontFamily: 'Montserrat Alternates' }}>
                      {score.percentage}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ width: `${score.percentage}%`, background: info.color }}
                    />
                  </div>
                  <div className="text-xs text-[#2e2a27]/50 mt-1" style={{ fontFamily: 'Inter' }}>
                    {score.score}/{score.max} points
                  </div>
                </div>

                {/* Expanded Issues */}
                {isExpanded && categoryIssues.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {categoryIssues.map((issue, idx) => (
                      <div 
                        key={idx}
                        className="p-3 rounded-lg text-sm"
                        style={{
                          background: `${getStatusColor(issue.status)}10`,
                          borderLeft: `3px solid ${getStatusColor(issue.status)}`
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <span 
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: getStatusColor(issue.status) }}
                          >
                            {getStatusIcon(issue.status)}
                          </span>
                          <div className="flex-1">
                            <div className="font-medium text-[#2e2a27]" style={{ fontFamily: 'Inter' }}>
                              {issue.title}
                            </div>
                            {issue.description && (
                              <div className="text-[#2e2a27]/70 text-xs mt-1" style={{ fontFamily: 'Inter' }}>
                                {issue.description}
                              </div>
                            )}
                            {issue.recommendation && (
                              <div className="text-[#00A99D] text-xs mt-2 p-2 rounded bg-[#00A99D]/10" style={{ fontFamily: 'Inter' }}>
                                💡 {issue.recommendation}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fix These First */}
      {audit.fix_these_first.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-[#2e2a27] mb-4 flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates' }}>
            <span className="text-xl">🔧</span> Fix These First
          </h3>
          <div className="space-y-3">
            {audit.fix_these_first.map((issue, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.4)'
                }}
              >
                <div className="flex items-start gap-3">
                  <span 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: getStatusColor(issue.status) }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-[#2e2a27]" style={{ fontFamily: 'Montserrat Alternates' }}>
                        {issue.title}
                      </span>
                      {getImpactBadge(issue.impact)}
                      {getDifficultyBadge(issue.difficulty)}
                    </div>
                    {issue.description && (
                      <p className="text-sm text-[#2e2a27]/70 mb-2" style={{ fontFamily: 'Inter' }}>
                        {issue.description}
                      </p>
                    )}
                    {issue.recommendation && (
                      <div className="text-sm text-[#00A99D] p-3 rounded-lg bg-[#00A99D]/10" style={{ fontFamily: 'Inter' }}>
                        <strong>How to fix:</strong> {issue.recommendation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Issues Toggle */}
      <div className="text-center">
        <button
          onClick={() => setShowAllIssues(!showAllIssues)}
          className="text-sm text-[#00A99D] hover:underline"
          style={{ fontFamily: 'Inter' }}
        >
          {showAllIssues ? 'Hide' : 'Show'} all {audit.all_issues.length} checks
        </button>
      </div>

      {/* All Issues List */}
      {showAllIssues && (
        <div className="space-y-2">
          {audit.all_issues.map((issue, idx) => (
            <div 
              key={idx}
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{
                background: `${getStatusColor(issue.status)}08`,
                borderLeft: `3px solid ${getStatusColor(issue.status)}`
              }}
            >
              <span 
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: getStatusColor(issue.status) }}
              >
                {getStatusIcon(issue.status)}
              </span>
              <div className="flex-1">
                <span className="font-medium text-[#2e2a27] text-sm" style={{ fontFamily: 'Inter' }}>
                  {issue.title}
                </span>
                <span className="text-xs text-[#2e2a27]/50 ml-2">
                  ({CATEGORY_INFO[issue.category as keyof typeof CATEGORY_INFO]?.label})
                </span>
              </div>
              <span className="text-sm font-medium" style={{ color: getStatusColor(issue.status) }}>
                {issue.points_earned}/{issue.points_possible}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
