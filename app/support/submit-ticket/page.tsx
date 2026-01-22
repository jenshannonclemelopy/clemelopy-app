'use client';

import React, { useState, useRef } from 'react';
import Layout from '../../components/Layout';
import SupportTabNav from '../../components/SupportTabNav';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

export default function SubmitTicket() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'technical',
    priority: 'medium',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [submittedTicketNumber, setSubmittedTicketNumber] = useState('');
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const generateTicketNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `CLM-${year}-${random}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!user?.id) {
      setError('You must be logged in to upload attachments.');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    setIsUploading(true);
    setError('');

    try {
      for (const file of Array.from(files)) {
        if (!allowedTypes.includes(file.type)) {
          setError(`Invalid file type: ${file.name}. Only PNG, JPG, and PDF files are allowed.`);
          continue;
        }

        if (file.size > maxSize) {
          setError(`File too large: ${file.name}. Maximum size is 10MB.`);
          continue;
        }

        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${user.id}/${timestamp}-${sanitizedName}`;

        const { data, error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          setError(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(filePath);

        setAttachments(prev => [...prev, {
          name: file.name,
          url: urlData.publicUrl,
          size: file.size,
          type: file.type,
        }]);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeAttachment = async (index: number) => {
    const attachment = attachments[index];
    
    try {
      const url = new URL(attachment.url);
      const pathParts = url.pathname.split('/ticket-attachments/');
      if (pathParts[1]) {
        await supabase.storage
          .from('ticket-attachments')
          .remove([decodeURIComponent(pathParts[1])]);
      }
    } catch (err) {
      console.error('Error removing file from storage:', err);
    }

    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      setError('You must be logged in to submit a ticket.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');

    const ticketNumber = generateTicketNumber();
    const customerEmail = user.email || 'anonymous@unknown.com';
    const customerName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous User';

    try {
      const { error: insertError } = await supabase
        .from('support_tickets')
        .insert({
          ticket_number: ticketNumber,
          subject: ticketForm.subject,
          message: ticketForm.message,
          category: ticketForm.category,
          priority: ticketForm.priority,
          status: 'open',
          user_email: customerEmail,
          user_name: customerName,
          user_id: user.id,
          attachments: attachments.length > 0 ? attachments : null,
        });

      if (insertError) {
        throw insertError;
      }

      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ticket_created',
            data: {
              customerEmail: customerEmail,
              customerName: customerName,
              ticketNumber: ticketNumber,
              subject: ticketForm.subject,
              message: ticketForm.message,
              category: ticketForm.category,
              priority: ticketForm.priority,
              attachments: attachments,
            },
          }),
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      setSubmittedTicketNumber(ticketNumber);
      setTicketSubmitted(true);
    } catch (err: any) {
      console.error('Error submitting ticket:', err);
      setError(err.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <SupportTabNav activeTab="ticket" />

        {/* Two Column Content Container */}
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
          {!ticketSubmitted ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Help Info */}
              <div className="space-y-6">
                {/* Tips for Better Support */}
                <div 
                  className="rounded-2xl p-6"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, rgba(0, 169, 157, 0.2), rgba(0, 169, 157, 0.1))' }}
                    >
                      <svg className="w-5 h-5 text-[#0D7871]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 
                      className="text-lg text-[#1a1a1a]"
                      style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                    >
                      Tips for Faster Resolution
                    </h3>
                  </div>
                  
                  <div className="space-y-4" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#FAA819]/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-[#E99502]">1</span>
                      </div>
                      <div>
                        <p className="text-[#1a1a1a] font-semibold text-sm">Be specific with your subject line</p>
                        <p className="text-[#4a4642] text-sm">Instead of "Help needed", try "Unable to generate linking strategy for my website"</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#FAA819]/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-[#E99502]">2</span>
                      </div>
                      <div>
                        <p className="text-[#1a1a1a] font-semibold text-sm">Include steps to reproduce</p>
                        <p className="text-[#4a4642] text-sm">Tell us exactly what you did before the issue occurred, step by step</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#FAA819]/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-[#E99502]">3</span>
                      </div>
                      <div>
                        <p className="text-[#1a1a1a] font-semibold text-sm">Share error messages</p>
                        <p className="text-[#4a4642] text-sm">Copy and paste any error messages you see, or include them in a screenshot</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#FAA819]/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-[#E99502]">4</span>
                      </div>
                      <div>
                        <p className="text-[#1a1a1a] font-semibold text-sm">Attach screenshots</p>
                        <p className="text-[#4a4642] text-sm">A picture is worth a thousand words! Screenshots help us understand your issue quickly</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* What to Include */}
                <div 
                  className="rounded-2xl p-6"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, rgba(250, 168, 25, 0.2), rgba(250, 168, 25, 0.1))' }}
                    >
                      <svg className="w-5 h-5 text-[#E99502]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <h3 
                      className="text-lg text-[#1a1a1a]"
                      style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                    >
                      What to Include
                    </h3>
                  </div>
                  
                  <ul className="space-y-2 text-sm" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                    <li className="flex items-center gap-2 text-[#4a4642]">
                      <svg className="w-4 h-4 text-[#00A99D] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Browser and device you're using
                    </li>
                    <li className="flex items-center gap-2 text-[#4a4642]">
                      <svg className="w-4 h-4 text-[#00A99D] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Which page or feature is affected
                    </li>
                    <li className="flex items-center gap-2 text-[#4a4642]">
                      <svg className="w-4 h-4 text-[#00A99D] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      When the issue started happening
                    </li>
                    <li className="flex items-center gap-2 text-[#4a4642]">
                      <svg className="w-4 h-4 text-[#00A99D] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Any recent changes you made
                    </li>
                    <li className="flex items-center gap-2 text-[#4a4642]">
                      <svg className="w-4 h-4 text-[#00A99D] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      What you expected to happen
                    </li>
                  </ul>
                </div>

                {/* Response Time Info */}
                <div 
                  className="rounded-2xl p-6"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #00A99D, #0D7871)' }}
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 
                        className="text-[#0D7871] mb-1"
                        style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                      >
                        Response Time
                      </h4>
                      <p 
                        className="text-[#4a4642] text-sm mb-2"
                        style={{ fontFamily: 'Inter', fontWeight: 500 }}
                      >
                        We typically respond within <strong className="text-[#0D7871]">1 business day</strong>, Monday through Friday.
                      </p>
                      <p 
                        className="text-[#4a4642]/70 text-xs"
                        style={{ fontFamily: 'Inter' }}
                      >
                        We value work-life balance for our team, so weekend inquiries will be addressed the following Monday. Thank you for your patience! 🧡
                      </p>
                    </div>
                  </div>
                </div>

                {/* Check Help Articles First */}
                <div 
                  className="rounded-2xl p-6"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, rgba(219, 39, 119, 0.2), rgba(219, 39, 119, 0.1))' }}
                    >
                      <span className="text-xl">📚</span>
                    </div>
                    <h3 
                      className="text-lg text-[#1a1a1a]"
                      style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                    >
                      Before You Submit
                    </h3>
                  </div>
                  <p 
                    className="text-[#4a4642] text-sm mb-4"
                    style={{ fontFamily: 'Inter', fontWeight: 500 }}
                  >
                    Many common questions are already answered in our Help Center. You might find an instant solution!
                  </p>
                  <a
                    href="https://support.clemelopy.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#0D7871] text-sm font-semibold hover:gap-3 transition-all"
                    style={{ fontFamily: 'Inter' }}
                  >
                    Browse Help Articles
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Right Column - Form */}
              <div 
                className="rounded-2xl p-6 md:p-8"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
                }}
              >
                {/* Form Header */}
                <div className="text-center mb-6">
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'linear-gradient(135deg, rgba(250, 168, 25, 0.2), rgba(233, 149, 2, 0.2))' }}
                  >
                    <svg className="w-7 h-7 text-[#FAA819]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  <h2 
                    className="text-xl text-[#1a1a1a] mb-1"
                    style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
                  >
                    Submit a Support Ticket
                  </h2>
                  <p 
                    className="text-[#4a4642] text-sm"
                    style={{ fontFamily: 'Inter', fontWeight: 500 }}
                  >
                    Fill out the form below and we'll respond within 1 business day.
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm" style={{ fontFamily: 'Inter' }}>
                    {error}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates' }}>
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                      placeholder="Brief description of your issue"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-[#1a1a1a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#FAA819] focus:border-transparent transition-all"
                      style={{ fontFamily: 'Inter', fontWeight: 500 }}
                    />
                  </div>

                  {/* Category & Priority */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates' }}>
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={ticketForm.category}
                        onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#FAA819] focus:border-transparent transition-all cursor-pointer"
                        style={{ fontFamily: 'Inter', fontWeight: 500 }}
                      >
                        <option value="general">General Question</option>
                        <option value="technical">Technical Issue</option>
                        <option value="billing">Billing & Subscription</option>
                        <option value="feature">Feature Request</option>
                        <option value="bug">Bug Report</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates' }}>
                        Priority
                      </label>
                      <select
                        value={ticketForm.priority}
                        onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#FAA819] focus:border-transparent transition-all cursor-pointer"
                        style={{ fontFamily: 'Inter', fontWeight: 500 }}
                      >
                        <option value="low">Low - General inquiry</option>
                        <option value="medium">Medium - Need help soon</option>
                        <option value="high">High - Affecting my work</option>
                        <option value="urgent">Urgent - Critical issue</option>
                      </select>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates' }}>
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      value={ticketForm.message}
                      onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                      placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, or relevant information."
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-[#1a1a1a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#FAA819] focus:border-transparent transition-all resize-none"
                      style={{ fontFamily: 'Inter', fontWeight: 500 }}
                    />
                  </div>

                  {/* Attachments */}
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates' }}>
                      Attachments <span className="text-[#4a4642]/50 font-normal">(optional)</span>
                    </label>
                    
                    {/* Upload Area */}
                    <div
                      className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                        dragActive 
                          ? 'border-[#FAA819] bg-[#FAA819]/5' 
                          : 'border-gray-200 hover:border-[#FAA819]/50 bg-gray-50/50'
                      } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".png,.jpg,.jpeg,.pdf"
                        className="hidden"
                        onChange={(e) => handleFiles(e.target.files)}
                        disabled={isUploading}
                      />
                      
                      {isUploading ? (
                        <div className="flex flex-col items-center">
                          <svg className="w-8 h-8 text-[#FAA819] animate-spin mb-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p className="text-[#4a4642] text-sm" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                            Uploading...
                          </p>
                        </div>
                      ) : (
                        <>
                          <svg className="w-8 h-8 text-[#9ca3af] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-[#4a4642] text-sm" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                            Drag & drop files here or click to browse
                          </p>
                          <p className="text-[#9ca3af] text-xs mt-1" style={{ fontFamily: 'Inter' }}>
                            PNG, JPG, PDF up to 10MB
                          </p>
                        </>
                      )}
                    </div>

                    {/* Uploaded Files List */}
                    {attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {attachments.map((file, index) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {file.type === 'application/pdf' ? (
                                <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-[#00A99D] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                </svg>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm text-[#1a1a1a] truncate" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                                  {file.name}
                                </p>
                                <p className="text-xs text-[#9ca3af]" style={{ fontFamily: 'Inter' }}>
                                  {formatFileSize(file.size)}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="p-1 text-[#9ca3af] hover:text-red-500 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    className="w-full py-4 rounded-xl text-white font-semibold hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                    style={{ 
                      fontFamily: 'Montserrat Alternates',
                      background: 'linear-gradient(135deg, #FAA819, #E99502)',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Submit Ticket
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Success State */
            <div className="max-w-lg mx-auto text-center py-12">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'linear-gradient(135deg, #00A99D, #0D7871)' }}
              >
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 
                className="text-2xl text-[#00A99D] mb-3"
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
              >
                Ticket Submitted!
              </h2>
              
              <p 
                className="text-[#4a4642] mb-2"
                style={{ fontFamily: 'Inter', fontWeight: 500 }}
              >
                Your ticket number is:
              </p>
              
              <p 
                className="text-2xl text-[#1a1a1a] font-bold mb-6"
                style={{ fontFamily: 'Montserrat Alternates' }}
              >
                {submittedTicketNumber}
              </p>

              <div 
                className="rounded-xl p-4 mb-6"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.9)',
                }}
              >
                <p 
                  className="text-[#4a4642] text-sm"
                  style={{ fontFamily: 'Inter', fontWeight: 500 }}
                >
                  We've received your ticket and will get back to you within 1 business day (Monday–Friday). You'll receive an email confirmation shortly.
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => {
                    setTicketSubmitted(false);
                    setTicketForm({ subject: '', category: 'technical', priority: 'medium', message: '' });
                    setAttachments([]);
                    setError('');
                  }}
                  className="px-6 py-3 rounded-xl font-semibold transition-all hover:shadow-md"
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    color: '#4a4642',
                  }}
                >
                  Submit Another
                </button>
                <a 
                  href="/support/my-tickets"
                  className="px-6 py-3 rounded-xl text-white font-semibold hover:shadow-lg transition-all"
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    background: 'linear-gradient(135deg, #00A99D, #0D7871)',
                  }}
                >
                  View My Tickets
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}