'use client';

/**
 * ConnectGA4Button Component
 * 
 * Button that initiates the Google Analytics OAuth flow.
 */

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function ConnectGA4Button() {
  const [isConnecting, setIsConnecting] = useState(false);

  async function handleConnect() {
    setIsConnecting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in first');
        setIsConnecting(false);
        return;
      }

      // Get the OAuth URL from our API
      const response = await fetch('/api/analytics/connect', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (data.authUrl) {
        // Open OAuth flow in current window
        window.location.href = data.authUrl;
      } else {
        alert('Failed to initiate connection. Please try again.');
        setIsConnecting(false);
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Failed to connect. Please try again.');
      setIsConnecting(false);
    }
  }

  return (
    <>
      <button
        className="connect-ga4-button"
        onClick={handleConnect}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <>
            <span className="spinner" />
            Connecting...
          </>
        ) : (
          <>
            <GoogleIcon />
            Connect Google Analytics
          </>
        )}
      </button>

      <style jsx>{`
        .connect-ga4-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 14px 28px;
          background: linear-gradient(135deg, #FAA819 0%, #E99502 100%);
          border: none;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 14px rgba(250, 168, 25, 0.3);
        }

        .connect-ga4-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(250, 168, 25, 0.4);
        }

        .connect-ga4-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .connect-ga4-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
