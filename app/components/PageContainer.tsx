'use client';

import React, { ReactNode } from 'react';

interface PageContainerProps {
  /** Content to render inside the container */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Custom padding (default: 32px) */
  padding?: string;
}

export default function PageContainer({
  children,
  className = '',
  padding = '32px',
}: PageContainerProps) {
  return (
    <div 
      className={className}
      style={{ 
        background: 'rgba(255, 255, 255, 0.25)', 
        backdropFilter: 'blur(20px)', 
        WebkitBackdropFilter: 'blur(20px)', 
        border: '1px solid rgba(255, 255, 255, 0.4)', 
        borderRadius: '32px', 
        padding: padding, 
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
      }}
    >
      {children}
    </div>
  );
}
