'use client';

/**
 * AIReferralChart Component
 * 
 * Visualizes AI referral data as either a trend line or donut chart.
 * Uses pure CSS/SVG for lightweight rendering.
 */

import { useMemo } from 'react';

interface TrendData {
  date: string;
  sessions: number;
}

interface SourceData {
  displayName: string;
  sessions: number;
  color: string;
}

interface AIReferralChartProps {
  type: 'trend' | 'sources';
  data: TrendData[] | SourceData[];
}

export default function AIReferralChart({ type, data }: AIReferralChartProps) {
  if (type === 'trend') {
    return <TrendChart data={data as TrendData[]} />;
  }
  return <SourcesDonutChart data={data as SourceData[]} />;
}

function TrendChart({ data }: { data: TrendData[] }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const maxSessions = Math.max(...data.map(d => d.sessions), 1);
    const width = 100;
    const height = 40;
    const padding = 2;

    // Create SVG path for the area chart
    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - (d.sessions / maxSessions) * (height - padding * 2);
      return { x, y, sessions: d.sessions, date: d.date };
    });

    const linePath = points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

    return { points, linePath, areaPath, maxSessions, width, height };
  }, [data]);

  if (!chartData || data.length === 0) {
    return (
      <div className="empty-chart">
        <p>No trend data available</p>
        <style jsx>{`
          .empty-chart {
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #888;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  const { points, linePath, areaPath, maxSessions, width, height } = chartData;

  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FAA819" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FAA819" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaGradient)" />
        <path d={linePath} fill="none" stroke="#FAA819" strokeWidth="0.5" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="0.8"
            fill="#FAA819"
            className="data-point"
          />
        ))}
      </svg>

      <div className="chart-labels">
        <div className="y-axis">
          <span>{maxSessions}</span>
          <span>{Math.round(maxSessions / 2)}</span>
          <span>0</span>
        </div>
        <div className="x-axis">
          <span>{formatDate(data[0].date)}</span>
          <span>{formatDate(data[Math.floor(data.length / 2)]?.date)}</span>
          <span>{formatDate(data[data.length - 1].date)}</span>
        </div>
      </div>

      <div className="chart-summary">
        <div className="summary-item">
          <span className="label">Total</span>
          <span className="value">{data.reduce((sum, d) => sum + d.sessions, 0).toLocaleString()}</span>
        </div>
        <div className="summary-item">
          <span className="label">Avg/Day</span>
          <span className="value">{Math.round(data.reduce((sum, d) => sum + d.sessions, 0) / data.length).toLocaleString()}</span>
        </div>
        <div className="summary-item">
          <span className="label">Peak</span>
          <span className="value">{maxSessions.toLocaleString()}</span>
        </div>
      </div>

      <style jsx>{`
        .trend-chart {
          position: relative;
        }

        svg {
          width: 100%;
          height: 160px;
        }

        .data-point {
          transition: r 0.2s ease;
        }

        .data-point:hover {
          r: 1.5;
        }

        .chart-labels {
          display: flex;
          margin-top: 8px;
        }

        .y-axis {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-size: 10px;
          color: #888;
          padding-right: 8px;
          height: 160px;
          position: absolute;
          top: 0;
          left: -30px;
          text-align: right;
          width: 25px;
        }

        .x-axis {
          display: flex;
          justify-content: space-between;
          width: 100%;
          font-size: 11px;
          color: #888;
          margin-top: 4px;
        }

        .chart-summary {
          display: flex;
          justify-content: center;
          gap: 32px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }

        .summary-item {
          text-align: center;
        }

        .summary-item .label {
          display: block;
          font-size: 11px;
          color: #888;
          margin-bottom: 4px;
        }

        .summary-item .value {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
        }
      `}</style>
    </div>
  );
}

function SourcesDonutChart({ data }: { data: SourceData[] }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const total = data.reduce((sum, d) => sum + d.sessions, 0);
    if (total === 0) return null;

    // Calculate segments
    let cumulativePercent = 0;
    const segments = data.slice(0, 6).map(d => {
      const percent = (d.sessions / total) * 100;
      const segment = {
        ...d,
        percent,
        startPercent: cumulativePercent,
      };
      cumulativePercent += percent;
      return segment;
    });

    return { segments, total };
  }, [data]);

  if (!chartData) {
    return (
      <div className="empty-chart">
        <p>No source data available</p>
        <style jsx>{`
          .empty-chart {
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #888;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  const { segments, total } = chartData;
  const size = 140;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="donut-chart">
      <div className="chart-container">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f0f0f0"
            strokeWidth={strokeWidth}
          />
          
          {/* Segments */}
          {segments.map((segment, i) => {
            const dashOffset = circumference * (1 - segment.startPercent / 100);
            const dashLength = circumference * (segment.percent / 100);
            
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="segment"
              />
            );
          })}
        </svg>
        
        <div className="center-label">
          <span className="total-value">{total.toLocaleString()}</span>
          <span className="total-label">sessions</span>
        </div>
      </div>

      <div className="legend">
        {segments.map((segment, i) => (
          <div key={i} className="legend-item">
            <span className="legend-color" style={{ background: segment.color }} />
            <span className="legend-name">{segment.displayName}</span>
            <span className="legend-value">{segment.sessions.toLocaleString()}</span>
            <span className="legend-percent">{segment.percent.toFixed(1)}%</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .donut-chart {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .chart-container {
          position: relative;
          width: 140px;
          height: 140px;
        }

        .segment {
          transition: opacity 0.2s ease;
        }

        .segment:hover {
          opacity: 0.8;
        }

        .center-label {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .total-value {
          display: block;
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .total-label {
          display: block;
          font-size: 11px;
          color: #888;
        }

        .legend {
          width: 100%;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0;
          font-size: 13px;
        }

        .legend-color {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .legend-name {
          flex: 1;
          color: #333;
        }

        .legend-value {
          font-weight: 600;
          color: #1a1a1a;
          min-width: 50px;
          text-align: right;
        }

        .legend-percent {
          color: #888;
          min-width: 45px;
          text-align: right;
        }
      `}</style>
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
