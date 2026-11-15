import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDistance(meters) {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) {
    return '—';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatTimeAgo(isoString, lang = 'az') {
  if (!isoString) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
  if (lang === 'en') {
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h ago`;
  }
  if (diffSec < 60) return `${diffSec} san əvvəl`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dəq əvvəl`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr} saat əvvəl`;
}
