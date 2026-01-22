'use client';

import Link from 'next/link';

type TabId = 'help' | 'ticket' | 'my-tickets';

interface SupportTabNavProps {
  activeTab: TabId;
}

const tabs = [
  { id: 'help' as TabId, label: 'Help Articles', icon: '📚', href: '/support' },
  { id: 'ticket' as TabId, label: 'Submit Ticket', icon: '🎫', href: '/support/submit-ticket' },
  { id: 'my-tickets' as TabId, label: 'My Tickets', icon: '📋', href: '/support/my-tickets' },
];

export default function SupportTabNav({ activeTab }: SupportTabNavProps) {
  return (
    <nav className="mb-8" aria-label="Support navigation">
      <div 
        className="inline-flex p-1 rounded-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
        }}
        role="tablist"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'text-white shadow-lg' 
                : ''
            }`}
            style={{ 
              fontFamily: 'Montserrat Alternates',
              background: activeTab === tab.id 
                ? 'linear-gradient(135deg, #0D7871, #065f5b)' 
                : 'transparent',
              color: activeTab === tab.id ? 'white' : '#4a4642',
            }}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}