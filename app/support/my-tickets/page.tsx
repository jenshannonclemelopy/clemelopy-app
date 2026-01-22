'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import SupportTabNav from '../../components/SupportTabNav';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  user_email: string;
  user_name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export default function MyTickets() {
  const { user, loading: authLoading } = useAuth();
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      fetchMyTickets();
    } else if (!authLoading && !user) {
      setTicketsLoading(false);
    }
  }, [user, authLoading]);

  const fetchMyTickets = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setMyTickets(data);
    }
    setTicketsLoading(false);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'open': 
        return { 
          background: 'rgba(107, 114, 128, 0.15)', 
          color: '#4b5563',
          border: '1px solid rgba(107, 114, 128, 0.3)'
        };
      case 'in-progress': 
        return { 
          background: 'rgba(0, 169, 157, 0.15)', 
          color: '#0D7871',
          border: '1px solid rgba(0, 169, 157, 0.3)'
        };
      case 'waiting-customer': 
        return { 
          background: 'rgba(250, 168, 25, 0.15)', 
          color: '#b45309',
          border: '1px solid rgba(250, 168, 25, 0.3)'
        };
      case 'resolved': 
        return { 
          background: 'rgba(0, 169, 157, 0.2)', 
          color: '#065f5b',
          border: '1px solid rgba(0, 169, 157, 0.4)'
        };
      case 'closed': 
        return { 
          background: 'rgba(107, 114, 128, 0.1)', 
          color: '#6b7280',
          border: '1px solid rgba(107, 114, 128, 0.2)'
        };
      default: 
        return { 
          background: 'rgba(107, 114, 128, 0.1)', 
          color: '#6b7280',
          border: '1px solid rgba(107, 114, 128, 0.2)'
        };
    }
  };

  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'urgent': return { color: '#dc2626', label: '●' };
      case 'high': return { color: '#ea580c', label: '●' };
      case 'medium': return { color: '#ca8a04', label: '●' };
      case 'low': return { color: '#16a34a', label: '●' };
      default: return { color: '#6b7280', label: '●' };
    }
  };

  const formatStatus = (status: string) => {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Loading state
  if (authLoading || ticketsLoading) {
    return (
      <Layout activeNav="support">
        <main>
          {/* Header */}
          <div 
            className="rounded-2xl p-8 mb-8"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.05) 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.7)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
            }}
          >
            <h1 
              className="text-3xl md:text-4xl font-bold mb-2"
              style={{ fontFamily: 'Montserrat Alternates' }}
            >
              <span style={{ color: '#2e2a27' }}>How can we </span>
              <span 
                style={{ 
                  background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                help you?
              </span>
            </h1>
            <p 
              className="text-[#4a4642]"
              style={{ fontFamily: 'Inter', fontWeight: 500 }}
            >
              Search our help articles or submit a support ticket
            </p>
          </div>

          <SupportTabNav activeTab="my-tickets" />

          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center" role="status" aria-live="polite">
              <svg className="w-10 h-10 animate-spin text-[#0D7871] mx-auto mb-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <p style={{ fontFamily: 'Inter', color: '#4a4642' }}>Loading your tickets...</p>
            </div>
          </div>
        </main>
      </Layout>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <Layout activeNav="support">
        <main>
          {/* Header */}
          <div 
            className="rounded-2xl p-8 mb-8"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.05) 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.7)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
            }}
          >
            <h1 
              className="text-3xl md:text-4xl font-bold mb-2"
              style={{ fontFamily: 'Montserrat Alternates' }}
            >
              <span style={{ color: '#2e2a27' }}>How can we </span>
              <span 
                style={{ 
                  background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                help you?
              </span>
            </h1>
            <p 
              className="text-[#4a4642]"
              style={{ fontFamily: 'Inter', fontWeight: 500 }}
            >
              Search our help articles or submit a support ticket
            </p>
          </div>

          <SupportTabNav activeTab="my-tickets" />

          <div 
            className="p-12 text-center max-w-lg mx-auto rounded-3xl"
            style={{ 
              background: 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.7)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, rgba(250, 168, 25, 0.15), rgba(250, 168, 25, 0.05))' }}
            >
              <svg className="w-10 h-10 text-[#FAA819]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 
              className="text-xl mb-2"
              style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}
            >
              Sign in required
            </h2>
            <p 
              className="mb-6"
              style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
            >
              Please sign in to view your support tickets.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:shadow-lg"
              style={{ 
                fontFamily: 'Montserrat Alternates',
                background: 'linear-gradient(135deg, #0D7871, #065f5b)',
              }}
            >
              Sign In
            </Link>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout activeNav="support">
      <main>
        {/* Header */}
        <div 
          className="rounded-2xl p-8 mb-8"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.05) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          }}
        >
          <h1 
            className="text-3xl md:text-4xl font-bold mb-2"
            style={{ fontFamily: 'Montserrat Alternates' }}
          >
            <span style={{ color: '#2e2a27' }}>How can we </span>
            <span 
              style={{ 
                background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              help you?
            </span>
          </h1>
          <p 
            className="text-[#4a4642]"
            style={{ fontFamily: 'Inter', fontWeight: 500 }}
          >
            Search our help articles or submit a support ticket
          </p>
        </div>

        {/* Tab Navigation */}
        <SupportTabNav activeTab="my-tickets" />

        {/* Content Container */}
        <div 
          className="rounded-3xl p-6 md:p-8"
          style={{ 
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
          }}
        >
          {myTickets.length > 0 ? (
            <>
              {/* Header Row */}
              <div className="flex items-center justify-between mb-6">
                <p 
                  className="text-[#4a4642]"
                  style={{ fontFamily: 'Inter', fontWeight: 500 }}
                >
                  {myTickets.length} ticket{myTickets.length !== 1 ? 's' : ''}
                </p>
                <Link
                  href="/support/submit-ticket"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold transition-all hover:shadow-lg"
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    background: 'linear-gradient(135deg, #00A99D, #0D7871)',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Ticket
                </Link>
              </div>

              {/* Tickets Grid */}
              <div className="grid gap-4">
                {myTickets.map((ticket) => {
                  const statusStyle = getStatusStyle(ticket.status);
                  const priorityIndicator = getPriorityIndicator(ticket.priority);
                  
                  return (
                    <Link
                      key={ticket.id}
                      href={`/support/my-tickets/${ticket.id}`}
                      className="group rounded-2xl p-5 transition-all hover:scale-[1.01] hover:shadow-lg"
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.9)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Ticket Number & Priority */}
                          <div className="flex items-center gap-2 mb-2">
                            <span 
                              style={{ color: priorityIndicator.color, fontSize: '8px' }}
                              title={`${ticket.priority} priority`}
                            >
                              {priorityIndicator.label}
                            </span>
                            <span 
                              className="text-sm"
                              style={{ fontFamily: 'Inter', color: '#6b6560' }}
                            >
                              {ticket.ticket_number}
                            </span>
                          </div>
                          
                          {/* Subject */}
                          <h3 
                            className="text-lg mb-2 truncate group-hover:text-[#0D7871] transition-colors"
                            style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}
                          >
                            {ticket.subject}
                          </h3>
                          
                          {/* Message Preview */}
                          <p 
                            className="text-sm line-clamp-2 mb-3"
                            style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
                          >
                            {ticket.message}
                          </p>
                          
                          {/* Meta Info */}
                          <div className="flex items-center gap-4 text-xs" style={{ color: '#6b6560' }}>
                            <span style={{ fontFamily: 'Inter' }}>
                              Updated {formatDate(ticket.updated_at)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        <div className="shrink-0">
                          <span 
                            className="px-3 py-1.5 rounded-full text-xs font-semibold"
                            style={{ 
                              fontFamily: 'Inter',
                              ...statusStyle
                            }}
                          >
                            {formatStatus(ticket.status)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="text-center py-12">
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'linear-gradient(135deg, rgba(0, 169, 157, 0.15), rgba(0, 169, 157, 0.05))' }}
              >
                <svg className="w-10 h-10 text-[#00A99D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <h2 
                className="text-xl mb-2"
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}
              >
                No tickets yet
              </h2>
              <p 
                className="mb-6 max-w-sm mx-auto"
                style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
              >
                You haven't submitted any support tickets. Need help with something?
              </p>
              <Link
                href="/support/submit-ticket"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg"
                style={{ 
                  fontFamily: 'Montserrat Alternates',
                  background: 'linear-gradient(135deg, #00A99D, #0D7871)',
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Submit Your First Ticket
              </Link>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}