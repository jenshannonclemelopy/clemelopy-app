'use client';

import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  variant?: 'projects' | 'search' | 'notifications' | 'data' | 'error';
}

export default function EmptyState({ 
  title, 
  description, 
  actionLabel, 
  actionHref, 
  onAction,
  variant = 'projects' 
}: EmptyStateProps) {
  
  const illustrations: Record<string, React.ReactNode> = {
    projects: (
      <div className="relative">
        {/* Folder stack */}
        <div className="w-24 h-20 bg-linear-to-br from-[#FAA819]/20 to-[#E99502]/20 rounded-xl absolute -left-4 top-2 transform -rotate-6" />
        <div className="w-24 h-20 bg-linear-to-br from-[#00A99D]/20 to-[#0D7871]/20 rounded-xl absolute left-4 top-0 transform rotate-3" />
        <div className="w-24 h-20 bg-white rounded-xl shadow-lg relative z-10 flex items-center justify-center border border-[#dedede]">
          <span className="text-4xl">📁</span>
        </div>
        {/* Sparkles */}
        <div className="absolute -top-2 -right-2 text-xl animate-pulse">✨</div>
        <div className="absolute bottom-0 -left-6 text-lg animate-pulse delay-300">✨</div>
      </div>
    ),
    search: (
      <div className="relative">
        <div className="w-28 h-28 bg-linear-to-br from-[#00A99D]/10 to-[#0D7871]/10 rounded-full flex items-center justify-center">
          <svg className="w-14 h-14 text-[#00A99D]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {/* Question marks */}
        <div className="absolute -top-1 right-0 text-2xl text-[#FAA819]/60">?</div>
        <div className="absolute bottom-2 -left-2 text-xl text-[#FAA819]/40">?</div>
      </div>
    ),
    notifications: (
      <div className="relative">
        <div className="w-28 h-28 bg-linear-to-br from-[#FAA819]/10 to-[#E99502]/10 rounded-full flex items-center justify-center">
          <svg className="w-14 h-14 text-[#FAA819]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        {/* Zzz */}
        <div className="absolute top-0 right-0 text-lg text-[#1a1a1a]/30 font-bold">z</div>
        <div className="absolute top-3 right-4 text-sm text-[#1a1a1a]/20 font-bold">z</div>
        <div className="absolute top-5 right-7 text-xs text-[#1a1a1a]/10 font-bold">z</div>
      </div>
    ),
    data: (
      <div className="relative">
        <div className="w-28 h-28 bg-linear-to-br from-[#00A99D]/10 to-[#FAA819]/10 rounded-full flex items-center justify-center">
          <svg className="w-14 h-14 text-[#00A99D]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        {/* Dots */}
        <div className="absolute top-2 left-0 w-2 h-2 bg-[#FAA819]/40 rounded-full" />
        <div className="absolute bottom-4 right-0 w-3 h-3 bg-[#00A99D]/40 rounded-full" />
      </div>
    ),
    error: (
      <div className="relative">
        <div className="w-28 h-28 bg-linear-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center">
          <span className="text-5xl">🍊</span>
        </div>
        {/* Sad face overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-28 h-28 flex items-end justify-center pb-6">
            <span className="text-2xl">😵</span>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="text-center py-12 px-4">
      {/* Illustration */}
      <div className="flex justify-center mb-6">
        {illustrations[variant]}
      </div>

      {/* Title */}
      <h3 
        className="text-xl text-[#1a1a1a] mb-2"
        style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
      >
        {title}
      </h3>

      {/* Description */}
      <p 
        className="text-[#1a1a1a]/60 mb-6 max-w-sm mx-auto"
        style={{ fontFamily: 'Inter', fontWeight: 500 }}
      >
        {description}
      </p>

      {/* Action Button */}
      {(actionLabel && (actionHref || onAction)) && (
        actionHref ? (
          <a 
            href={actionHref}
            className="inline-block px-6 py-3 bg-gradient-to-r from-[#FAA819] to-[#E99502] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            style={{ fontFamily: 'Montserrat Alternates' }}
          >
            {actionLabel}
          </a>
        ) : (
          <button 
            onClick={onAction}
            className="px-6 py-3 bg-gradient-to-r from-[#FAA819] to-[#E99502] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            style={{ fontFamily: 'Montserrat Alternates' }}
          >
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
}

// Specific empty states for common use cases
export function NoProjectsEmpty() {
  return (
    <EmptyState
      variant="projects"
      title="No projects yet"
      description="Create your first linking strategy to get started on your GEO optimization journey."
      actionLabel="Create Your First Project"
      actionHref="/linking-strategy"
    />
  );
}

export function NoSearchResultsEmpty({ query }: { query: string }) {
  return (
    <EmptyState
      variant="search"
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search terms.`}
    />
  );
}

export function NoNotificationsEmpty() {
  return (
    <EmptyState
      variant="notifications"
      title="All caught up!"
      description="You don't have any notifications right now. We'll let you know when something happens."
    />
  );
}

export function NoDataEmpty() {
  return (
    <EmptyState
      variant="data"
      title="No data available"
      description="Once you start using Clemelopy, your analytics and insights will appear here."
    />
  );
}

export function ErrorEmpty({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      variant="error"
      title="Something went wrong"
      description="We had trouble loading this content. Please try again."
      actionLabel="Try Again"
      onAction={onRetry}
    />
  );
}