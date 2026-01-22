import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import { AuthProvider } from './lib/AuthContext';
import EmailConfirmationBlocker from './components/EmailConfirmationBlocker';
import CookieBanner from '../app/components/CookieBanner';

export const metadata: Metadata = {
  title: 'Clemelopy',
  description: 'GEO Optimization Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        
          <AuthProvider>
            <EmailConfirmationBlocker />
            {children}
            <CookieBanner />
          </AuthProvider>
        
      </body>
    </html>
  );
}