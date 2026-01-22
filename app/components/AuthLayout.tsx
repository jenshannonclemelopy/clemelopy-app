'use client';

import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/images/app-background.svg')" }}
    >
      <div className="flex flex-col items-center justify-center w-full">
        {children}
      </div>
    </div>
  );
}