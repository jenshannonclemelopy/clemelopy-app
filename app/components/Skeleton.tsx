'use client';

import React from 'react';

// Base skeleton with shimmer animation
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div 
      className={`bg-[#dedede]/50 rounded-lg animate-pulse ${className}`}
      style={{
        background: 'linear-gradient(90deg, #dedede 25%, #efefef 50%, #dedede 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-4 w-1/3 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-4/5 mb-2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

// Project card skeleton
export function ProjectCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-[#dedede]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Skeleton className="h-5 w-2/3 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
      <div className="flex items-center gap-4 mt-4">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-[#dedede]">
      <Skeleton className="w-10 h-10 rounded-lg" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/5" />
      <Skeleton className="h-4 w-1/6" />
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Hero skeleton */}
      <Skeleton className="h-32 w-full rounded-2xl" />
      
      {/* CTA skeleton */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border-l-4 border-[#dedede]">
        <Skeleton className="h-6 w-1/3 mb-3" />
        <Skeleton className="h-4 w-2/3 mb-4" />
        <Skeleton className="h-12 w-36 rounded-lg" />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CardSkeleton />
        </div>
        <div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// Profile skeleton
export function ProfileSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Photo card */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <Skeleton className="h-5 w-1/2 mb-6" />
          <div className="flex flex-col items-center">
            <Skeleton className="w-32 h-32 rounded-2xl mb-4" />
            <Skeleton className="h-5 w-2/3 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </div>
      
      {/* Info card */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Article card skeleton
export function ArticleCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-6">
        <Skeleton className="h-5 w-3/4 mb-3" />
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-2/3 mb-4" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

// Full page loading
export function PageLoading() {
  return (
    <div className="min-h-screen bg-[#fffaf3] flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-4">
          {/* Spinning ring */}
          <div 
            className="absolute inset-0 border-4 border-[#FAA819]/20 rounded-full"
          />
          <div 
            className="absolute inset-0 border-4 border-transparent border-t-[#FAA819] rounded-full animate-spin"
          />
          {/* Clementine in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">🍊</span>
          </div>
        </div>
        <p 
          className="text-[#4a4642] text-sm"
          style={{ fontFamily: 'Inter', fontWeight: 500 }}
        >
          Loading...
        </p>
      </div>
    </div>
  );
}

// Inline loading spinner
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div 
      className={`${sizeClasses[size]} border-[#FAA819]/20 border-t-[#FAA819] rounded-full animate-spin`}
    />
  );
}

// Add shimmer animation to global styles
export const skeletonStyles = `
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

export default Skeleton;