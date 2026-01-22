'use client';

/**
 * PropertySelector Component
 * 
 * Displays available GA4 properties and lets user select one.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { GA4Property } from '../../lib/google-analytics';

interface PropertySelectorProps {
  onSelect: (propertyId: string, propertyName: string) => void;
}

export default function PropertySelector({ onSelect }: PropertySelectorProps) {
  const [properties, setProperties] = useState<GA4Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  async function fetchProperties() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/analytics/properties', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load properties');
        return;
      }

      setProperties(data.properties || []);
      
      // If there's only one property, auto-select it
      if (data.properties?.length === 1) {
        setSelectedId(data.properties[0].name);
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError('Failed to load properties');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedId) return;

    setIsSaving(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const selectedProperty = properties.find(p => p.name === selectedId);
      
      const response = await fetch('/api/analytics/properties', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: selectedId.replace('properties/', ''),
          propertyName: selectedProperty?.displayName || 'Unknown Property',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save selection');
        return;
      }

      onSelect(data.propertyId, data.propertyName);
    } catch (err) {
      console.error('Error saving property:', err);
      setError('Failed to save selection');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="property-selector loading">
        <div className="loading-spinner" />
        <p>Loading your GA4 properties...</p>

        <style jsx>{`
          .property-selector {
            background: rgba(255, 255, 255, 0.5);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            border-radius: 24px;
            padding: 48px;
            max-width: 500px;
            text-align: center;
          }

          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(250, 168, 25, 0.2);
            border-top-color: #FAA819;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          p {
            color: #666;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="property-selector">
      <div className="selector-icon">
        <PropertyIcon />
      </div>
      
      <h2>Select a Property</h2>
      <p>Choose which GA4 property you want to track AI traffic for.</p>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {properties.length === 0 ? (
        <div className="no-properties">
          <p>No GA4 properties found in your account.</p>
          <p className="hint">
            Make sure you have at least one GA4 property and that your 
            Google account has access to it.
          </p>
        </div>
      ) : (
        <>
          <div className="properties-list">
            {properties.map(property => (
              <label
                key={property.name}
                className={`property-option ${selectedId === property.name ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="property"
                  value={property.name}
                  checked={selectedId === property.name}
                  onChange={(e) => setSelectedId(e.target.value)}
                />
                <div className="property-info">
                  <span className="property-name">{property.displayName}</span>
                  <span className="property-id">
                    {property.name.replace('properties/', 'ID: ')}
                  </span>
                </div>
                <div className="check-mark">
                  <CheckIcon />
                </div>
              </label>
            ))}
          </div>

          <button
            className="save-button"
            onClick={handleSave}
            disabled={!selectedId || isSaving}
          >
            {isSaving ? 'Saving...' : 'Continue'}
          </button>
        </>
      )}

      <style jsx>{`
        .property-selector {
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 24px;
          padding: 48px;
          max-width: 500px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }

        .selector-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #00A99D 0%, #00867A 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        .selector-icon :global(svg) {
          width: 32px;
          height: 32px;
          color: white;
        }

        h2 {
          font-family: 'Montserrat Alternates', sans-serif;
          font-size: 24px;
          font-weight: 600;
          margin: 0 0 12px 0;
          color: #1a1a1a;
          text-align: center;
        }

        p {
          color: #666;
          margin: 0 0 24px 0;
          text-align: center;
        }

        .error-message {
          background: #FEE2E2;
          color: #DC2626;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .no-properties {
          text-align: center;
          padding: 24px;
          background: rgba(0, 0, 0, 0.03);
          border-radius: 12px;
        }

        .no-properties p {
          margin: 0;
        }

        .hint {
          font-size: 13px;
          color: #888;
          margin-top: 8px !important;
        }

        .properties-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .property-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.6);
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .property-option:hover {
          background: rgba(255, 255, 255, 0.8);
        }

        .property-option.selected {
          border-color: #00A99D;
          background: rgba(0, 169, 157, 0.1);
        }

        .property-option input {
          display: none;
        }

        .property-info {
          flex: 1;
          text-align: left;
        }

        .property-name {
          display: block;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 4px;
        }

        .property-id {
          display: block;
          font-size: 12px;
          color: #888;
        }

        .check-mark {
          width: 24px;
          height: 24px;
          border: 2px solid #ddd;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .property-option.selected .check-mark {
          background: #00A99D;
          border-color: #00A99D;
        }

        .check-mark :global(svg) {
          width: 14px;
          height: 14px;
          color: white;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .property-option.selected .check-mark :global(svg) {
          opacity: 1;
        }

        .save-button {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #00A99D 0%, #00867A 100%);
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .save-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(0, 169, 157, 0.3);
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

function PropertyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
