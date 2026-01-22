'use client';

import Layout from '../components/Layout';
import SchemaBuilder from '../components/SchemaBuilder';

export default function SchemaStudioPage() {
  return (
    <Layout 
      activeNav="tools"
    >
      {/* Page Header - Glassmorphic style matching To-Do List */}
      <div 
        className="mb-8"
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 800 }}>
              <span style={{ color: '#1a1a1a' }}>Schema </span>
              <span 
                style={{ 
                  background: 'linear-gradient(90deg, #FAA819, #E99502, #00A99D)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >Studio</span>
            </h1>
            <p style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#4a4642' }}>
              Create structured data markup so AI engines can understand and cite your content.
            </p>
          </div>
          {/* Tour Button - placeholder for future implementation */}
          {/* 
          <button
            className="px-4 py-2 rounded-xl text-sm flex items-center gap-2"
            style={{
              fontFamily: 'Montserrat Alternates',
              fontWeight: 500,
              background: 'rgba(255, 255, 255, 0.6)',
              border: '1px solid rgba(0, 169, 157, 0.3)',
              color: '#005a54',
            }}
          >
            <span>👁</span> Tour
          </button>
          */}
        </div>
      </div>

      <SchemaBuilder />
    </Layout>
  );
}