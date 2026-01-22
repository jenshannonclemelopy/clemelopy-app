'use client';

/**
 * ReferralTable Component
 * 
 * Displays AI referral data in a table format.
 */

interface SourceData {
  displayName: string;
  sessions: number;
  users: number;
  conversions: number;
  color: string;
}

interface PageData {
  page: string;
  source: string;
  sessions: number;
}

interface ReferralTableProps {
  type: 'sources' | 'pages';
  data: SourceData[] | PageData[];
}

export default function ReferralTable({ type, data }: ReferralTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-table">
        <p>No data available</p>
        <style jsx>{`
          .empty-table {
            padding: 32px;
            text-align: center;
            color: #888;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  if (type === 'sources') {
    return <SourcesTable data={data as SourceData[]} />;
  }
  return <PagesTable data={data as PageData[]} />;
}

function SourcesTable({ data }: { data: SourceData[] }) {
  const total = data.reduce((sum, d) => sum + d.sessions, 0);

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Sessions</th>
            <th>Users</th>
            <th>Conv.</th>
            <th>Share</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 8).map((row, i) => (
            <tr key={i}>
              <td>
                <div className="source-cell">
                  <span className="source-dot" style={{ background: row.color }} />
                  <span className="source-name">{row.displayName}</span>
                </div>
              </td>
              <td className="number">{row.sessions.toLocaleString()}</td>
              <td className="number">{row.users.toLocaleString()}</td>
              <td className="number">{row.conversions.toLocaleString()}</td>
              <td className="number">
                <div className="share-cell">
                  <div 
                    className="share-bar" 
                    style={{ 
                      width: `${(row.sessions / total) * 100}%`,
                      background: row.color 
                    }} 
                  />
                  <span>{((row.sessions / total) * 100).toFixed(1)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style jsx>{`
        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        th {
          text-align: left;
          padding: 10px 12px;
          font-weight: 600;
          color: #666;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        th:not(:first-child) {
          text-align: right;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
          color: #333;
        }

        tr:last-child td {
          border-bottom: none;
        }

        tr:hover {
          background: rgba(0, 0, 0, 0.02);
        }

        .source-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .source-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .source-name {
          font-weight: 500;
        }

        .number {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .share-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-end;
        }

        .share-bar {
          height: 6px;
          border-radius: 3px;
          min-width: 4px;
          max-width: 60px;
        }

        .share-cell span {
          min-width: 45px;
          text-align: right;
          color: #666;
        }
      `}</style>
    </div>
  );
}

function PagesTable({ data }: { data: PageData[] }) {
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Landing Page</th>
            <th>Source</th>
            <th>Sessions</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 8).map((row, i) => (
            <tr key={i}>
              <td>
                <div className="page-cell">
                  <span className="page-path" title={row.page}>
                    {truncatePath(row.page)}
                  </span>
                </div>
              </td>
              <td>
                <span className="source-badge">{row.source}</span>
              </td>
              <td className="number">{row.sessions.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <style jsx>{`
        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        th {
          text-align: left;
          padding: 10px 12px;
          font-weight: 600;
          color: #666;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        th:last-child {
          text-align: right;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
          color: #333;
        }

        tr:last-child td {
          border-bottom: none;
        }

        tr:hover {
          background: rgba(0, 0, 0, 0.02);
        }

        .page-cell {
          max-width: 200px;
        }

        .page-path {
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
          font-size: 12px;
          color: #444;
        }

        .source-badge {
          display: inline-block;
          padding: 4px 8px;
          background: rgba(0, 169, 157, 0.1);
          color: #00867A;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }

        .number {
          text-align: right;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </div>
  );
}

function truncatePath(path: string): string {
  if (!path) return '/';
  
  // Remove protocol and domain if present
  let cleanPath = path.replace(/^https?:\/\/[^/]+/, '');
  
  // Ensure it starts with /
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }
  
  // Truncate if too long
  if (cleanPath.length > 40) {
    return cleanPath.substring(0, 37) + '...';
  }
  
  return cleanPath || '/';
}
