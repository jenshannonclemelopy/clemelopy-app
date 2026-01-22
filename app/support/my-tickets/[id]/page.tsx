'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Layout from '../../../components/Layout';
import SupportTabNav from '../../../components/SupportTabNav';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/AuthContext';

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
  attachments?: string[];
}

interface TicketReply {
  id: string;
  ticket_id: string;
  message: string;
  is_internal: boolean;
  is_from_customer: boolean;
  sender_name: string;
  sender_email: string;
  created_at: string;
  attachments?: string[];
}

// Style objects defined outside component to prevent recreation on every render
const mainCardStyle = {
  background: 'rgba(255, 255, 255, 0.5)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.6)',
  borderRadius: '20px',
};

const sidebarCardStyle = {
  background: 'rgba(255, 255, 255, 0.5)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.6)',
  borderRadius: '20px',
};

const glassCardStyle = {
  background: 'rgba(255, 255, 255, 0.5)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.6)',
  borderRadius: '20px',
};

const messageBubbleStyleUser = {
  background: 'linear-gradient(180deg, rgba(255, 252, 248, 0.9) 0%, rgba(245, 248, 248, 0.8) 100%)',
  border: '1px solid rgba(255, 255, 255, 0.6)',
};

const messageBubbleStyleSupport = {
  background: 'linear-gradient(180deg, rgba(245, 252, 252, 0.9) 0%, rgba(235, 248, 248, 0.8) 100%)',
  border: '1px solid rgba(255, 255, 255, 0.6)',
};

const avatarStyleUser = {
  background: 'linear-gradient(135deg, #FAA819, #E99502)',
};

const avatarStyleSupport = {
  background: 'linear-gradient(135deg, #00A99D, #0D7871)',
};

const borderStyle = {
  borderColor: 'rgba(255, 255, 255, 0.5)',
};

const resolvedNoticeStyle = {
  background: 'rgba(0, 169, 157, 0.15)',
};

const filePreviewStyle = {
  background: 'rgba(255, 250, 243, 0.8)',
};

export default function TicketDetail() {
  const params = useParams();
  const ticketId = params?.id as string;
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading]);

  useEffect(() => {
    if (user && ticketId) {
      fetchTicket();
    }
  }, [user, ticketId]);

  useEffect(() => {
    if (ticket) {
      fetchReplies();
    }
  }, [ticket]);

  const fetchTicket = async () => {
    if (!user?.id || !ticketId) return;

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setTicket(data);
    }
  };

  const fetchReplies = async () => {
    if (!ticket) return;
    setLoadingReplies(true);
    
    const { data, error } = await supabase
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticket.id)
      .eq('is_internal', false)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setReplies(data);
    }
    setLoadingReplies(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setReplyAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setReplyAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (): Promise<string[]> => {
    if (replyAttachments.length === 0) return [];
    
    const uploadedUrls: string[] = [];
    
    for (const file of replyAttachments) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${ticket?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .upload(fileName, file);
      
      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(data.path);
        
        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      }
    }
    
    return uploadedUrls;
  };

  const handleSendReply = async () => {
    if ((!replyMessage.trim() && replyAttachments.length === 0) || !ticket || !user) return;
    
    setIsSendingReply(true);
    setIsUploading(replyAttachments.length > 0);
    
    try {
      // Upload attachments first
      const attachmentUrls = await uploadAttachments();
      
      // Insert reply
      const { error } = await supabase
        .from('ticket_replies')
        .insert({
          ticket_id: ticket.id,
          message: replyMessage,
          is_internal: false,
          is_from_customer: true,
          sender_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer',
          sender_email: user.email,
          attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
        });

      if (error) {
        console.error('Error sending reply:', error);
      } else {
        setReplyMessage('');
        setReplyAttachments([]);
        fetchReplies();
        
        // Update ticket status if it was waiting for customer
        if (ticket.status === 'waiting-customer') {
          await supabase
            .from('support_tickets')
            .update({ status: 'open', updated_at: new Date().toISOString() })
            .eq('id', ticket.id);
          fetchTicket();
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsSendingReply(false);
      setIsUploading(false);
    }
  };

  const handleMarkResolved = async () => {
    if (!ticket) return;
    
    const { error } = await supabase
      .from('support_tickets')
      .update({ 
        status: 'resolved', 
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('id', ticket.id);
    
    if (!error) {
      fetchTicket();
    }
  };

  const handleReopenTicket = async () => {
    if (!ticket) return;
    
    const { error } = await supabase
      .from('support_tickets')
      .update({ 
        status: 'open', 
        resolved_at: null,
        updated_at: new Date().toISOString() 
      })
      .eq('id', ticket.id);
    
    if (!error) {
      fetchTicket();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatStatus = (status: string) => {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'open': return 'bg-gray-500/20 text-gray-700';
      case 'in-progress': return 'bg-[#0D7871]/20 text-[#0D7871]';
      case 'waiting-customer': return 'bg-purple-500/20 text-purple-700';
      case 'resolved': return 'bg-[#00A99D]/20 text-[#065f5b]';
      case 'closed': return 'bg-gray-400/20 text-gray-600';
      default: return 'bg-gray-500/20 text-gray-700';
    }
  };

  const formatCategory = (category: string) => {
    return category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Get initials from full name (e.g., "Jen Shannon" -> "JS")
  // For customer messages, use logged-in user's data (more reliable than ticket data)
  const getUserInitials = () => {
    // First try logged-in user's metadata (most accurate for current user)
    const name = user?.user_metadata?.full_name || ticket?.user_name;
    if (name && name.toLowerCase() !== 'support') {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
      }
      return name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      // Try to get initials from email prefix if it looks like a name
      const emailPrefix = user.email.split('@')[0];
      if (emailPrefix.includes('.')) {
        const parts = emailPrefix.split('.');
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
      }
      return emailPrefix.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Get user's profile photo URL if available
  const getUserAvatarUrl = () => {
    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  };

  // Get display name - prefer logged-in user data over ticket data
  const getUserDisplayName = () => {
    // Use logged-in user's metadata first (most accurate)
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    // Fall back to ticket data if it's not just "support"
    if (ticket?.user_name && ticket.user_name.toLowerCase() !== 'support') return ticket.user_name;
    // Last resort: email prefix
    if (user?.email) return user.email.split('@')[0];
    return 'You';
  };

  const isImageFile = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  const getAllAttachments = () => {
    const attachments: { url: string; from: string }[] = [];
    
    if (ticket?.attachments) {
      ticket.attachments.forEach(url => {
        attachments.push({ url, from: 'Original ticket' });
      });
    }
    
    replies.forEach(reply => {
      if (reply.attachments) {
        reply.attachments.forEach(url => {
          attachments.push({ 
            url, 
            from: reply.is_from_customer ? 'You' : (reply.sender_name || 'Support') 
          });
        });
      }
    });
    
    return attachments;
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <Layout activeNav="support">
        <main id="support-main" role="main">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center" role="status" aria-live="polite">
              <svg className="w-10 h-10 animate-spin text-[#b45309] mx-auto mb-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <p style={{ fontFamily: 'Inter', color: '#4a4642' }}>Loading ticket...</p>
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
        <main id="support-main" role="main">
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
            <h1 className="text-3xl lg:text-4xl mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}>
              <span style={{ color: '#1a1a1a' }}>How can we </span>
              <span style={{ background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>help you?</span>
            </h1>
            <p className="text-base max-w-2xl" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>Search our help articles or submit a support ticket</p>
          </header>
          <SupportTabNav activeTab="my-tickets" />
          <div style={glassCardStyle} className="p-12 text-center">
            <div className="w-20 h-20 bg-[#fffaf3] rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
              <svg className="w-10 h-10 text-[#b45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>Sign in required</h2>
            <p className="mb-6" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>Please sign in to view your support tickets.</p>
            <a href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold hover:shadow-lg transition-all" style={{ fontFamily: 'Montserrat Alternates', background: 'linear-gradient(135deg, #0D7871, #065f5b)' }}>Sign In</a>
          </div>
        </main>
      </Layout>
    );
  }

  // Ticket not found
  if (!ticket) {
    return (
      <Layout activeNav="support">
        <main id="support-main" role="main">
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
            <h1 className="text-3xl lg:text-4xl mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}>
              <span style={{ color: '#1a1a1a' }}>How can we </span>
              <span style={{ background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>help you?</span>
            </h1>
            <p className="text-base max-w-2xl" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>Search our help articles or submit a support ticket</p>
          </header>
          <SupportTabNav activeTab="my-tickets" />
          <div style={glassCardStyle} className="p-12 text-center">
            <h2 className="text-xl mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>Ticket not found</h2>
            <p className="mb-6" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>This ticket doesn't exist or you don't have access to it.</p>
            <a href="/support/my-tickets" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold hover:shadow-lg transition-all" style={{ fontFamily: 'Montserrat Alternates', background: 'linear-gradient(135deg, #0D7871, #065f5b)' }}>← Back to My Tickets</a>
          </div>
        </main>
      </Layout>
    );
  }

  const allAttachments = getAllAttachments();

  return (
    <Layout activeNav="support">
      {/* Skip to main content link */}
      <a 
        href="#support-main" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-[#005a54] focus:rounded-lg focus:font-semibold"
        style={{ fontFamily: 'Montserrat Alternates' }}
      >
        Skip to main content
      </a>

      <main id="support-main" role="main">
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
          <h1 
            className="text-3xl lg:text-4xl mb-2" 
            style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
          >
            <span style={{ color: '#1a1a1a' }}>How can we </span>
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
            className="text-base max-w-2xl"
            style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
          >
            Search our help articles or submit a support ticket
          </p>
        </header>

        <SupportTabNav activeTab="my-tickets" />

        {/* Main Frosted Glass Container */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '32px',
            padding: '32px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column - Conversation (2/3 width) */}
            <div className="lg:col-span-2">
              <section style={mainCardStyle} className="overflow-hidden" aria-labelledby="ticket-subject">
                
                {/* Back Link */}
                <div className="px-6 pt-6">
                  <a 
                    href="/support/my-tickets"
                    className="inline-flex items-center gap-1 text-sm text-[#006b63] hover:text-[#0D7871] transition-colors"
                    style={{ fontFamily: 'Inter', fontWeight: 500 }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to tickets
                  </a>
                </div>

                {/* Ticket Header */}
                <div className="px-6 py-4 border-b" style={borderStyle}>
                  <h2 
                    id="ticket-subject"
                    className="text-xl text-[#1a1a1a] mb-1"
                    style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                  >
                    {ticket.subject}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[#1a1a1a]/60" style={{ fontFamily: 'Inter' }}>
                      {ticket.ticket_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(ticket.status)}`}>
                      {formatStatus(ticket.status)}
                    </span>
                  </div>
                </div>

                {/* Messages - Newest first */}
                <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                  
                  {/* Loading replies */}
                  {loadingReplies && (
                    <div className="text-center py-4">
                      <svg className="w-6 h-6 animate-spin text-[#b45309] mx-auto" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                    </div>
                  )}

                  {/* Replies - reversed so newest first */}
                  {!loadingReplies && [...replies].reverse().map((reply) => (
                    <div key={reply.id} className={`flex gap-3 ${reply.is_from_customer ? 'justify-end' : 'justify-start'}`}>
                      {/* Support avatar - Clemelopy icon */}
                      {!reply.is_from_customer && (
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                          style={avatarStyleSupport}
                        >
                          <img 
                            src="/images/clemelopy-icon.png" 
                            alt="Clemelopy Support" 
                            className="w-7 h-7 object-contain"
                          />
                        </div>
                      )}
                      
                      <div 
                        className={`flex-1 max-w-[85%] p-4 rounded-2xl ${reply.is_from_customer ? 'rounded-tr-md' : 'rounded-tl-md'}`}
                        style={reply.is_from_customer ? messageBubbleStyleUser : messageBubbleStyleSupport}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span 
                            className="text-sm font-semibold" 
                            style={{ 
                              fontFamily: 'Montserrat Alternates', 
                              color: reply.is_from_customer ? '#E99502' : '#0D7871'
                            }}
                          >
                            {reply.is_from_customer ? getUserDisplayName() : (reply.sender_name || 'Clemelopy Support')}
                          </span>
                          <span className="text-xs text-[#1a1a1a]/50" style={{ fontFamily: 'Inter' }}>
                            {formatDate(reply.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-[#1a1a1a] whitespace-pre-wrap" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                          {reply.message}
                        </p>
                        
                        {/* Reply attachments - show as thumbnails */}
                        {reply.attachments && reply.attachments.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {reply.attachments.map((url, idx) => (
                              <a 
                                key={idx} 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                              >
                                {isImageFile(url) ? (
                                  <img 
                                    src={url} 
                                    alt="Attachment" 
                                    className="h-24 w-24 object-cover rounded-lg border border-white/50" 
                                  />
                                ) : (
                                  <div 
                                    className="h-24 w-24 rounded-lg flex flex-col items-center justify-center gap-1"
                                    style={{ background: 'rgba(255, 250, 243, 0.9)', border: '1px solid rgba(255, 255, 255, 0.5)' }}
                                  >
                                    <svg className="w-8 h-8 text-[#b45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-xs text-[#1a1a1a]/60 px-1 truncate max-w-[80px]" style={{ fontFamily: 'Inter' }}>
                                      {url.split('/').pop()?.split('?')[0] || 'File'}
                                    </span>
                                  </div>
                                )}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* User avatar - profile photo or initials */}
                      {reply.is_from_customer && (
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-semibold text-sm overflow-hidden"
                          style={avatarStyleUser}
                        >
                          {getUserAvatarUrl() ? (
                            <img 
                              src={getUserAvatarUrl()!} 
                              alt={getUserDisplayName()} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getUserInitials()
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Original ticket message - User's message (oldest, shows at bottom) */}
                  <div className="flex gap-3 justify-end">
                    <div 
                      className="flex-1 max-w-[85%] p-4 rounded-2xl rounded-tr-md"
                      style={messageBubbleStyleUser}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="text-sm font-semibold" 
                          style={{ 
                            fontFamily: 'Montserrat Alternates', 
                            color: '#E99502' 
                          }}
                        >
                          {getUserDisplayName()}
                        </span>
                        <span className="text-xs text-[#1a1a1a]/50" style={{ fontFamily: 'Inter' }}>{formatDate(ticket.created_at)}</span>
                      </div>
                      <p className="text-sm text-[#1a1a1a]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                        {ticket.message}
                      </p>
                      
                      {/* Original ticket attachments - show as thumbnails */}
                      {ticket.attachments && ticket.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {ticket.attachments.map((url, idx) => (
                            <a 
                              key={idx} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                            >
                              {isImageFile(url) ? (
                                <img 
                                  src={url} 
                                  alt="Attachment" 
                                  className="h-24 w-24 object-cover rounded-lg border border-white/50" 
                                />
                              ) : (
                                <div 
                                  className="h-24 w-24 rounded-lg flex flex-col items-center justify-center gap-1"
                                  style={{ background: 'rgba(255, 250, 243, 0.9)', border: '1px solid rgba(255, 255, 255, 0.5)' }}
                                >
                                  <svg className="w-8 h-8 text-[#b45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-xs text-[#1a1a1a]/60 px-1 truncate max-w-[80px]" style={{ fontFamily: 'Inter' }}>
                                    {url.split('/').pop()?.split('?')[0] || 'File'}
                                  </span>
                                </div>
                              )}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* User avatar - profile photo or initials */}
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-semibold text-sm overflow-hidden"
                      style={avatarStyleUser}
                    >
                      {getUserAvatarUrl() ? (
                        <img 
                          src={getUserAvatarUrl()!} 
                          alt={getUserDisplayName()} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getUserInitials()
                      )}
                    </div>
                  </div>

                  {/* No replies yet */}
                  {!loadingReplies && replies.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-[#1a1a1a]/50" style={{ fontFamily: 'Inter' }}>
                        Waiting for a response from our support team...
                      </p>
                    </div>
                  )}
                </div>

                {/* Reply Input */}
                {ticket.status !== 'closed' && (
                  <div className="p-6 border-t" style={borderStyle}>
                    {/* Attachment previews */}
                    {replyAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {replyAttachments.map((file, idx) => (
                          <div key={idx} className="relative group">
                            {file.type.startsWith('image/') ? (
                              <img 
                                src={URL.createObjectURL(file)} 
                                alt={file.name}
                                className="h-16 w-16 object-cover rounded-lg"
                              />
                            ) : (
                              <div 
                                className="h-16 w-16 rounded-lg flex flex-col items-center justify-center"
                                style={filePreviewStyle}
                              >
                                <svg className="w-6 h-6 text-[#b45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-[8px] text-[#1a1a1a]/60 mt-1 truncate max-w-[56px]">{file.name.split('.').pop()}</span>
                              </div>
                            )}
                            <button
                              onClick={() => removeAttachment(idx)}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Add a reply..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005a54] resize-none text-[#1a1a1a]"
                      style={{ 
                        fontFamily: 'Inter', 
                        fontWeight: 500,
                        background: 'rgba(255, 255, 255, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.6)',
                      }}
                    />
                    
                    <div className="flex items-center justify-between mt-3">
                      {/* Attachment button */}
                      <label className="cursor-pointer flex items-center gap-2 text-sm hover:text-[#006b63] transition-colors" style={{ color: '#4a4642' }}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span style={{ fontFamily: 'Inter' }}>Attach files</span>
                        <input 
                          type="file" 
                          multiple 
                          className="hidden" 
                          onChange={handleFileSelect}
                          accept="image/*,.pdf,.doc,.docx,.txt"
                        />
                      </label>
                      
                      {/* Send button */}
                      <button
                        onClick={handleSendReply}
                        disabled={(!replyMessage.trim() && replyAttachments.length === 0) || isSendingReply}
                        className="px-5 py-2.5 rounded-xl text-white font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                        style={{ 
                          fontFamily: 'Montserrat Alternates',
                          background: 'linear-gradient(135deg, #0D7871, #065f5b)',
                        }}
                      >
                        {isSendingReply ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            {isUploading ? 'Uploading...' : 'Sending...'}
                          </>
                        ) : (
                          'Send Reply'
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Resolved Notice */}
                {ticket.status === 'resolved' && (
                  <div 
                    className="p-4 text-center"
                    style={resolvedNoticeStyle}
                  >
                    <p className="text-sm" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#065f5b' }}>
                      This ticket has been resolved. Need more help?{' '}
                      <a href="/support/submit-ticket" className="underline font-semibold" style={{ color: '#065f5b' }}>Open a new ticket</a>
                    </p>
                  </div>
                )}
              </section>
            </div>

            {/* Right Column - Ticket Details Sidebar (1/3 width) */}
            <aside className="space-y-6">
              
              {/* Ticket Details Card */}
              <section style={sidebarCardStyle} className="p-6" aria-labelledby="ticket-details-heading">
                <h3 
                  id="ticket-details-heading"
                  className="text-lg text-[#1a1a1a] mb-4"
                  style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                >
                  Ticket Details
                </h3>
                
                <dl className="space-y-4">
                  <div>
                    <dt className="text-xs mb-1" style={{ fontFamily: 'Inter', color: '#4a4642' }}>Category</dt>
                    <dd className="text-sm font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
                      {formatCategory(ticket.category)}
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="text-xs mb-1" style={{ fontFamily: 'Inter', color: '#4a4642' }}>Created</dt>
                    <dd className="text-sm font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
                      <time dateTime={ticket.created_at}>{formatDate(ticket.created_at)}</time>
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="text-xs mb-1" style={{ fontFamily: 'Inter', color: '#4a4642' }}>Last Updated</dt>
                    <dd className="text-sm font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
                      <time dateTime={ticket.updated_at}>{formatDate(ticket.updated_at)}</time>
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Attachments Card */}
              {allAttachments.length > 0 && (
                <section style={sidebarCardStyle} className="p-6" aria-labelledby="attachments-heading">
                  <h3 
                    id="attachments-heading"
                    className="text-lg text-[#1a1a1a] mb-4 flex items-center gap-2"
                    style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                  >
                    <svg className="w-5 h-5 text-[#006b63]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Attachments ({allAttachments.length})
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {allAttachments.map((attachment, idx) => (
                      <a 
                        key={idx}
                        href={attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group relative rounded-lg overflow-hidden"
                      >
                        {isImageFile(attachment.url) ? (
                          <div className="aspect-square">
                            <img 
                              src={attachment.url} 
                              alt="Attachment" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          </div>
                        ) : (
                          <div 
                            className="aspect-square flex flex-col items-center justify-center gap-2"
                            style={filePreviewStyle}
                          >
                            <svg className="w-8 h-8 text-[#b45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-xs text-[#1a1a1a]/60" style={{ fontFamily: 'Inter' }}>File</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/50 text-white text-[10px] truncate opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontFamily: 'Inter' }}>
                          {attachment.from}
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* Actions Card */}
              <section style={sidebarCardStyle} className="p-6" aria-labelledby="actions-heading">
                <h3 
                  id="actions-heading"
                  className="text-lg text-[#1a1a1a] mb-4"
                  style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                >
                  Actions
                </h3>
                
                {ticket.status === 'resolved' || ticket.status === 'closed' ? (
                  <button
                    onClick={handleReopenTicket}
                    className="w-full py-3 rounded-xl font-medium transition-all hover:bg-[#00A99D]/10"
                    style={{ 
                      fontFamily: 'Montserrat Alternates',
                      border: '2px solid #065f5b',
                      color: '#065f5b',
                    }}
                  >
                    Reopen Ticket
                  </button>
                ) : (
                  <button
                    onClick={handleMarkResolved}
                    className="w-full py-3 rounded-xl font-medium transition-all hover:bg-[#00A99D]/10"
                    style={{ 
                      fontFamily: 'Montserrat Alternates',
                      border: '2px solid #065f5b',
                      color: '#065f5b',
                    }}
                  >
                    Mark as Resolved
                  </button>
                )}
              </section>
            </aside>
          </div>
        </div>
      </main>
    </Layout>
  );
}