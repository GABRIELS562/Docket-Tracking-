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
