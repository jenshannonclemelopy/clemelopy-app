'use client';

/**
 * DateRangePicker Component
 * 
 * Simple dropdown to select predefined date ranges.
 */

interface DateRangePickerProps {
  value: '7days' | '30days' | '90days';
  onChange: (value: '7days' | '30days' | '90days') => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const options = [
    { value: '7days', label: 'Last 7 days' },
    { value: '30days', label: 'Last 30 days' },
    { value: '90days', label: 'Last 90 days' },
  ];

  return (
    <div className="date-range-picker">
      <CalendarIcon />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as '7days' | '30days' | '90days')}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronIcon />

      <style jsx>{`
        .date-range-picker {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 12px;
          position: relative;
          cursor: pointer;
        }

        .date-range-picker:hover {
          background: rgba(255, 255, 255, 0.7);
        }

        select {
          appearance: none;
          background: transparent;
          border: none;
          font-size: 14px;
          font-weight: 500;
          color: #333;
          cursor: pointer;
          padding-right: 20px;
          outline: none;
        }

        select:focus {
          outline: none;
        }

        .date-range-picker :global(svg) {
          color: #666;
          flex-shrink: 0;
        }

        .date-range-picker :global(svg:last-child) {
          position: absolute;
          right: 12px;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
