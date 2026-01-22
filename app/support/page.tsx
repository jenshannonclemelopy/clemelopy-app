'use client';

import React from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import SupportTabNav from '../components/SupportTabNav';

export default function Support() {
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
        <SupportTabNav activeTab="help" />

        {/* Three Card Options - Glass Container */}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Help Articles Card */}
            <a
              href="https://support.clemelopy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl p-8 text-center transition-all hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FAA819] focus:ring-offset-2"
              style={{ 
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
              }}
            >
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-transform group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, rgba(250, 168, 25, 0.15), rgba(250, 168, 25, 0.05))' }}
              >
                <span className="text-4xl" role="img" aria-label="Books">📚</span>
              </div>
              
              <h2 
                className="text-xl mb-2 text-[#1a1a1a]"
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
              >
                Help Articles
              </h2>
              
              <p 
                className="text-[#4a4642] mb-4"
                style={{ fontFamily: 'Inter', fontWeight: 500 }}
              >
                Browse our knowledge base for guides, FAQs, and tutorials.
              </p>
              
              <span 
                className="inline-flex items-center gap-2 text-[#0D7871] font-semibold group-hover:gap-3 transition-all"
                style={{ fontFamily: 'Inter' }}
              >
                Visit Help Center
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </span>
            </a>

            {/* Submit Ticket Card */}
            <Link
              href="/support/submit-ticket"
              className="group rounded-2xl p-8 text-center transition-all hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FAA819] focus:ring-offset-2"
              style={{ 
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
              }}
            >
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-transform group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, rgba(0, 169, 157, 0.15), rgba(0, 169, 157, 0.05))' }}
              >
                <span className="text-4xl" role="img" aria-label="Ticket">🎫</span>
              </div>
              
              <h2 
                className="text-xl mb-2 text-[#1a1a1a]"
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
              >
                Submit a Ticket
              </h2>
              
              <p 
                className="text-[#4a4642] mb-4"
                style={{ fontFamily: 'Inter', fontWeight: 500 }}
              >
                Can't find what you need? Our team is here to help.
              </p>
              
              <span 
                className="inline-flex items-center gap-2 text-[#0D7871] font-semibold group-hover:gap-3 transition-all"
                style={{ fontFamily: 'Inter' }}
              >
                Get Support
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </Link>

            {/* My Tickets Card */}
            <Link
              href="/support/my-tickets"
              className="group rounded-2xl p-8 text-center transition-all hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FAA819] focus:ring-offset-2"
              style={{ 
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
              }}
            >
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-transform group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, rgba(219, 39, 119, 0.15), rgba(219, 39, 119, 0.05))' }}
              >
                <span className="text-4xl" role="img" aria-label="Clipboard">📋</span>
              </div>
              
              <h2 
                className="text-xl mb-2 text-[#1a1a1a]"
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
              >
                My Tickets
              </h2>
              
              <p 
                className="text-[#4a4642] mb-4"
                style={{ fontFamily: 'Inter', fontWeight: 500 }}
              >
                View and track your submitted support requests.
              </p>
              
              <span 
                className="inline-flex items-center gap-2 text-[#0D7871] font-semibold group-hover:gap-3 transition-all"
                style={{ fontFamily: 'Inter' }}
              >
                View Tickets
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </Link>

          </div>
        </div>
      </main>
    </Layout>
  );
}