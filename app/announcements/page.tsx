'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'new' | 'update' | 'tip' | 'celebration' | 'maintenance';
  created_at: string;
  link?: string;
  link_text?: string;
}

export default function Announcements() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | Announcement['type']>('all');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch announcements from Supabase
  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        setAnnouncements(data || []);
      } catch (err: unknown) {
        console.error('Error fetching announcements:', err);
        setError('Failed to load announcements. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchAnnouncements();
  }, []);

  // Filter announcements
  const filteredAnnouncements = filter === 'all' 
    ? announcements 
    : announcements.filter(a => a.type === filter);

  // Get icon based on announcement type
  const getAnnouncementIcon = (type: Announcement['type']) => {
    switch (type) {
      case 'new':
        return '✨';
      case 'update':
        return '🔄';
      case 'tip':
        return '💡';
      case 'celebration':
        return '🎉';
      case 'maintenance':
        return '🔧';
      default:
        return '📢';
    }
  };

  // Get badge styles based on type - Updated for WCAG AA contrast
  const getBadgeStyles = (type: Announcement['type']) => {
    switch (type) {
      case 'new':
        return {
          background: 'rgba(0, 169, 157, 0.15)',
          color: '#006b63', // Darker teal for 4.5:1 contrast
        };
      case 'update':
        return {
          background: 'rgba(59, 130, 246, 0.15)',
          color: '#1d4ed8', // Darker blue for contrast
        };
      case 'tip':
        return {
          background: 'rgba(250, 168, 25, 0.15)',
          color: '#92400e', // Dark amber for contrast on light bg
        };
      case 'celebration':
        return {
          background: 'rgba(168, 85, 247, 0.15)',
          color: '#6b21a8', // Darker purple for contrast
        };
      case 'maintenance':
        return {
          background: 'rgba(82, 82, 82, 0.15)',
          color: '#404040', // Dark gray for contrast
        };
      default:
        return {
          background: 'rgba(82, 82, 82, 0.15)',
          color: '#404040',
        };
    }
  };

  // Format date with accessible datetime
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  }, []);

  // Get type label for screen readers and display
  const getTypeLabel = (type: Announcement['type']) => {
    switch (type) {
      case 'new':
        return 'New Feature';
      case 'update':
        return 'Update';
      case 'tip':
        return 'Pro Tip';
      case 'celebration':
        return 'Celebration';
      case 'maintenance':
        return 'Maintenance';
      default:
        return 'Announcement';
    }
  };

  const filterOptions: { value: 'all' | Announcement['type']; label: string; icon: string }[] = [
    { value: 'all', label: 'All', icon: '📢' },
    { value: 'new', label: 'New Features', icon: '✨' },
    { value: 'update', label: 'Updates', icon: '🔄' },
    { value: 'tip', label: 'Tips', icon: '💡' },
    { value: 'celebration', label: 'Celebrations', icon: '🎉' },
  ];

  // Common focus styles for accessibility
  const focusStyles = {
    outline: '2px solid #005a54',
    outlineOffset: '2px',
  };

  // Focus styles for light backgrounds (on teal/orange sections)
  const focusStylesLight = {
    outline: '2px solid #ffffff',
    outlineOffset: '2px',
  };

  return (
    <Layout activeNav="workspace">
      {/* Skip to main content link */}
      <a 
        href="#announcements-main" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-[#005a54] focus:rounded-lg focus:font-semibold"
        style={{ fontFamily: 'Montserrat Alternates' }}
      >
        Skip to main content
      </a>

      {/* Breadcrumb Navigation */}
      <nav 
        className="flex items-center gap-2 text-sm mb-6" 
        aria-label="Breadcrumb"
      >
        <ol className="flex items-center gap-2">
          <li>
            <a 
              href="/" 
              className="text-[#4a4642] hover:text-[#006b63] transition-colors duration-200 flex items-center gap-1"
              style={{ fontFamily: 'Inter', fontWeight: 500 }}
              onFocus={(e) => Object.assign(e.currentTarget.style, focusStyles)}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
                e.currentTarget.style.outlineOffset = '0';
              }}
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Workspace</span>
            </a>
          </li>
          <li aria-hidden="true">
            <svg 
              className="w-4 h-4 text-[#6b6560]" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </li>
          <li aria-current="page">
            <span 
              className="text-[#1a1a1a]"
              style={{ fontFamily: 'Inter', fontWeight: 600 }}
            >
              Announcements
            </span>
          </li>
        </ol>
      </nav>

      <main id="announcements-main" role="main">
        {/* Header - Frosted Glass Container */}
        <header 
          className="rounded-2xl p-8 mb-8"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.05) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div className="text-center mb-6">
            <h1 
              className="text-3xl lg:text-4xl mb-2" 
              style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
            >
              <span style={{ color: '#1a1a1a' }}>My </span>
              <span 
                style={{ 
                  background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Announcements
              </span>
            </h1>
            <p 
              className="text-base"
              style={{ 
                fontFamily: 'Inter', 
                fontWeight: 500,
                color: '#4a4642',
              }}
            >
              Stay up to date with the latest from Clemelopy
            </p>
          </div>
        </header>

        {/* Filter Tabs */}
        <section 
          className="rounded-2xl p-4 mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.03) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          }}
          aria-labelledby="filter-heading"
        >
          <h2 id="filter-heading" className="sr-only">Filter announcements by type</h2>
          <div 
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Announcement filters"
          >
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                role="tab"
                aria-selected={filter === option.value}
                aria-controls="announcements-list"
                id={`tab-${option.value}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  filter === option.value
                    ? 'text-white shadow-md'
                    : 'bg-[#f5f5f5] text-[#1a1a1a] hover:bg-[#ebebeb]'
                }`}
                style={{ 
                  fontFamily: 'Montserrat Alternates',
                  ...(filter === option.value && {
                    background: 'linear-gradient(to right, #00A99D, #0D7871)',
                  }),
                }}
                onFocus={(e) => {
                  if (filter === option.value) {
                    Object.assign(e.currentTarget.style, focusStylesLight);
                  } else {
                    Object.assign(e.currentTarget.style, focusStyles);
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                  e.currentTarget.style.outlineOffset = '0';
                }}
              >
                <span aria-hidden="true">{option.icon}</span>
                {option.label}
                {option.value === 'all' && (
                  <span 
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      filter === option.value ? 'bg-white/20' : 'bg-[#dedede]'
                    }`}
                    aria-label={`${announcements.length} total announcements`}
                  >
                    {announcements.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Loading State */}
        {loading && (
          <div 
            className="flex items-center justify-center py-16"
            role="status"
            aria-live="polite"
          >
            <div className="text-center">
              <div 
                className="w-12 h-12 border-3 border-[#00A99D] border-t-transparent rounded-full animate-spin mx-auto mb-4"
                aria-hidden="true"
              />
              <p 
                className="text-[#4a4642]" 
                style={{ fontFamily: 'Inter', fontWeight: 500 }}
              >
                Loading announcements...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div 
            className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">⚠️</span>
              <div>
                <h2 
                  className="text-red-800 font-semibold" 
                  style={{ fontFamily: 'Montserrat Alternates' }}
                >
                  Something went wrong
                </h2>
                <p 
                  className="text-red-700 text-sm" 
                  style={{ fontFamily: 'Inter', fontWeight: 500 }}
                >
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Announcements List */}
        {!loading && !error && (
          <section 
            id="announcements-list"
            role="tabpanel"
            aria-labelledby={`tab-${filter}`}
            aria-live="polite"
          >
            {filteredAnnouncements.length === 0 ? (
              <div 
                className="rounded-2xl p-12 text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.05) 100%)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.7)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                }}
              >
                <span className="text-5xl mb-4 block" aria-hidden="true">📭</span>
                <h2 
                  className="text-xl text-[#1a1a1a] mb-2"
                  style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                >
                  No announcements found
                </h2>
                <p 
                  className="text-[#4a4642]"
                  style={{ fontFamily: 'Inter', fontWeight: 500 }}
                >
                  {filter === 'all' 
                    ? 'Check back soon for updates!' 
                    : 'Try selecting a different filter'}
                </p>
              </div>
            ) : (
              <ul className="space-y-4" aria-label="Announcements">
                {filteredAnnouncements.map((announcement, index) => {
                  const badgeStyles = getBadgeStyles(announcement.type);
                  return (
                    <li 
                      key={announcement.id}
                      className="rounded-2xl p-6 hover:scale-[1.01] transition-all duration-200"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.05) 100%)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.7)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      <article className="flex items-start gap-4">
                        {/* Icon */}
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, rgba(0, 169, 157, 0.2) 0%, rgba(13, 120, 113, 0.2) 100%)',
                          }}
                          aria-hidden="true"
                        >
                          <span className="text-2xl">{getAnnouncementIcon(announcement.type)}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header row */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span 
                              className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
                              style={{ 
                                fontFamily: 'Montserrat Alternates',
                                backgroundColor: badgeStyles.background,
                                color: badgeStyles.color,
                              }}
                            >
                              {getTypeLabel(announcement.type)}
                            </span>
                            <time 
                              dateTime={announcement.created_at}
                              className="text-xs text-[#6b6560]" 
                              style={{ fontFamily: 'Inter', fontWeight: 500 }}
                            >
                              {formatDate(announcement.created_at)}
                            </time>
                          </div>

                          {/* Title */}
                          <h3 
                            className="text-lg text-[#1a1a1a] mb-2"
                            style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                          >
                            {announcement.title}
                          </h3>

                          {/* Message */}
                          <p 
                            className="text-[#4a4642] mb-4"
                            style={{ fontFamily: 'Inter', fontWeight: 500 }}
                          >
                            {announcement.message}
                          </p>

                          {/* Action Link */}
                          {announcement.link && (
                            <a
                              href={announcement.link}
                              className="inline-flex items-center gap-2 text-sm text-[#006b63] hover:text-[#005a54] font-semibold transition-colors duration-200"
                              style={{ fontFamily: 'Montserrat Alternates' }}
                              onFocus={(e) => Object.assign(e.currentTarget.style, focusStyles)}
                              onBlur={(e) => {
                                e.currentTarget.style.outline = 'none';
                                e.currentTarget.style.outlineOffset = '0';
                              }}
                            >
                              {announcement.link_text || 'Learn More'}
                              <svg 
                                className="w-4 h-4" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </main>
    </Layout>
  );
}