import { countWords } from './validation';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date);
}

// Average adult reading speed is roughly 200–250 words per minute.
export function getReadingTime(content = '') {
  return Math.max(1, Math.round(countWords(content) / 220));
}

export function getFirstName(fullName = '') {
  return fullName.trim().split(/\s+/)[0] || 'there';
}

export function getInitials(fullName = '') {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
