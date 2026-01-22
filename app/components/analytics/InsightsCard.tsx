'use client';

/**
 * InsightsCard Component
 * 
 * Displays a single metric with optional change indicator.
 */

import { ReactNode } from 'react';

interface InsightsCardProps {
  title: string;
  value: string;
  change?: number;
  icon: ReactNode;
}

export default function InsightsCard({ title, value, change, icon }: InsightsCardProps) {
  const hasChange = typeof change === 'number';
  const isPositive = hasChange && change >= 0;

  return (
    <div className="insights-card">
      <div className="card-header">
        <div className="icon-container">
          {icon}
        </div>
        <span className="title">{title}</span>
      </div>
      
      <div className="card-body">
        <span className="value">{value}</span>
        
        {hasChange && (
          <div className={`change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? (
              <ArrowUpIcon />
            ) : (
              <ArrowDownIcon />
            )}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>

      {hasChange && (
        <div className="change-label">
          vs. previous period
        </div>
      )}

      <style jsx>{`
        .insights-card {
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 20px;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .insights-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .icon-container {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, rgba(250, 168, 25, 0.15) 0%, rgba(0, 169, 157, 0.15) 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-container :global(svg) {
          width: 18px;
          height: 18px;
          color: #00A99D;
        }

        .title {
          font-size: 13px;
          font-weight: 500;
          color: #666;
        }

        .card-body {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .value {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          font-variant-numeric: tabular-nums;
        }

        .change {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
        }

        .change.positive {
          background: rgba(34, 197, 94, 0.1);
          color: #16A34A;
        }

        .change.negative {
          background: rgba(239, 68, 68, 0.1);
          color: #DC2626;
        }

        .change :global(svg) {
          width: 12px;
          height: 12px;
        }

        .change-label {
          margin-top: 8px;
          font-size: 11px;
          color: #888;
        }
      `}</style>
    </div>
  );
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}
