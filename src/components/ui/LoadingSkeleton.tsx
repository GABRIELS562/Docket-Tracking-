import { cn } from '@/lib/utils';

/**
 * UI POLISH - Loading Skeletons
 *
 * ECC make-interfaces-feel-better principles applied:
 * 1. Shadows: Cards have layered shadows
 * 2. Concentric Radius: Outer containers rounded-lg/xl, inner elements rounded-md
 * 3. Motion: Subtle pulse animation (not distracting)
 */

interface SkeletonProps {
  className?: string;
}

/**
 * Animated skeleton placeholder for loading states
 *
 * Uses subtle pulse animation that doesn't distract
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md bg-gray-700/50',
        // Subtle pulse - not distracting
        'animate-pulse',
        className
      )}
    />
  );
}

/**
 * Zone floor plan loading skeleton
 *
 * Concentric radius: container rounded-lg (8px), inner elements rounded or rounded-md
 */
export function ZoneFloorPlanSkeleton() {
  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded-lg p-4"
      style={{
        // Layered card shadow
        boxShadow: `
          0 1px 2px 0 rgba(0, 0, 0, 0.3),
          0 4px 8px -2px rgba(0, 0, 0, 0.2)
        `,
      }}
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* SVG placeholder */}
      <div className="relative w-full aspect-[4/3] bg-gray-800/50 rounded-lg overflow-hidden">
        {/* Simulated zone boundary */}
        <div className="absolute inset-4 border border-gray-700 border-dashed rounded" />

        {/* Simulated reader positions */}
        <div className="absolute top-1/4 left-1/4">
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <div className="absolute top-1/4 right-1/4">
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <div className="absolute bottom-1/4 left-1/3">
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>

        {/* Overlay stats skeletons */}
        <div className="absolute top-2 left-2 bg-gray-900/80 rounded px-2 py-1">
          <Skeleton className="h-6 w-12 mb-1" />
          <Skeleton className="h-3 w-8" />
        </div>

        <div className="absolute top-2 right-2 bg-gray-900/80 rounded px-2 py-1">
          <Skeleton className="h-4 w-8 mb-1" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>

      {/* Reader list skeleton */}
      <div className="mt-4">
        <Skeleton className="h-4 w-16 mb-2" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-3 w-12 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Item list loading skeleton
 */
export function ItemListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="p-3 border-b border-gray-800">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-32 mb-1" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex flex-col items-end">
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Dashboard card skeleton
 *
 * Matches StatCard styling with layered shadows
 */
export function DashboardCardSkeleton() {
  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded-lg p-4"
      style={{
        // Layered card shadow
        boxShadow: `
          0 1px 2px 0 rgba(0, 0, 0, 0.3),
          0 4px 8px -2px rgba(0, 0, 0, 0.2),
          0 12px 24px -4px rgba(0, 0, 0, 0.15)
        `,
      }}
    >
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-8 w-24 mb-1" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}
