import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getZoneColor(zoneType: string): string {
  const colors: Record<string, string> = {
    storage: '#3b82f6',
    lab: '#ec4899',
    office: '#1e40af',
    corridor: '#6b7280',
    entrance: '#8b5cf6',
  };
  return colors[zoneType] || '#6b7280';
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
}

/**
 * Format large numbers with K/M/B suffix
 * @example formatNumber(1500) => "1.5K"
 * @example formatNumber(2500000) => "2.5M"
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

/**
 * Format relative time from ISO string (lightweight version)
 * @example formatRelativeTimeShort("2024-01-15T10:00:00Z") => "5m ago"
 */
export function formatRelativeTimeShort(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
