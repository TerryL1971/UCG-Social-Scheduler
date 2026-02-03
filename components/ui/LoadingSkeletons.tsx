// components/ui/LoadingSkeletons.tsx

// Reusable loading skeleton components

import { Skeleton } from './Skeleton'

// Stats Card Skeleton (for dashboard stats)
export function StatsCardSkeleton() {
  return (
    <div className="ucg-card p-4 sm:p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg" />
      </div>
      <div className="mt-3 sm:mt-4">
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

// Post Card Skeleton (for post lists)
export function PostCardSkeleton() {
  return (
    <div className="ucg-card p-4 sm:p-6 animate-pulse">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
          
          {/* Info */}
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col gap-2 w-full lg:w-auto">
          <Skeleton className="h-11 w-full lg:w-36" />
          <Skeleton className="h-11 w-full lg:w-36" />
          <Skeleton className="h-11 w-full lg:w-36" />
        </div>
      </div>
    </div>
  )
}

// Dashboard Loading (full page)
export function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="p-4 sm:p-6 rounded-lg shadow-lg bg-gradient-to-r from-gray-700 to-gray-800 animate-pulse">
        <Skeleton className="h-6 sm:h-8 w-64 mb-2 bg-gray-600" />
        <Skeleton className="h-4 w-96 max-w-full bg-gray-600" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>

      {/* Quick Actions */}
      <div className="ucg-card p-4 sm:p-6 animate-pulse">
        <Skeleton className="h-6 w-32 mb-3 sm:mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>

      {/* Section Header */}
      <div className="ucg-section-header animate-pulse">
        <Skeleton className="h-6 w-56" />
      </div>

      {/* Upcoming Posts */}
      <div className="space-y-3 sm:space-y-4">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </div>
  )
}

// Posts List Loading (full page)
export function PostsListSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 animate-pulse">
        <div className="flex-1">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-11 w-full sm:w-40" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border-l-4 border-gray-300 animate-pulse">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-12" />
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border-l-4 border-gray-300 animate-pulse">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-12" />
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border-l-4 border-gray-300 animate-pulse">
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-8 w-12" />
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border-l-4 border-gray-300 animate-pulse">
          <Skeleton className="h-4 w-12 mb-2" />
          <Skeleton className="h-8 w-12" />
        </div>
      </div>

      {/* Post Cards */}
      <div className="space-y-3 sm:space-y-4">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </div>
  )
}

// Loading Spinner (inline for buttons)
export function LoadingSpinner({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }
  
  return (
    <div className={`animate-spin rounded-full border-b-2 border-current ${sizeClasses[size]}`} />
  )
}
