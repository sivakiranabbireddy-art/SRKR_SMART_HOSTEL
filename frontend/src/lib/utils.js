import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function getCompatibilityLabel(score) {
  if (score === null || score === undefined) return { label: 'Unknown', color: 'slate' };
  if (score === -1) return { label: 'Incompatible', color: 'red' };
  if (score >= 90) return { label: 'Excellent', color: 'green' };
  if (score >= 75) return { label: 'Very Good', color: 'blue' };
  if (score >= 60) return { label: 'Good', color: 'brand' };
  if (score >= 40) return { label: 'Moderate', color: 'amber' };
  return { label: 'Poor', color: 'red' };
}

export function getCompatibilityColor(score) {
  if (score === null || score === -1) return 'text-red-600';
  if (score >= 90) return 'text-emerald-600';
  if (score >= 75) return 'text-blue-600';
  if (score >= 60) return 'text-brand-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

export function getCompatibilityBg(score) {
  if (score === null || score === -1) return 'bg-red-50 text-red-700';
  if (score >= 90) return 'bg-emerald-50 text-emerald-700';
  if (score >= 75) return 'bg-blue-50 text-blue-700';
  if (score >= 60) return 'bg-brand-50 text-brand-700';
  if (score >= 40) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

export function getInitials(firstName, lastName) {
  return `${(firstName?.[0] || '').toUpperCase()}${(lastName?.[0] || '').toUpperCase()}`;
}

export function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
