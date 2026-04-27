/**
 * Format a number as Indian rupees.
 * Values >= 1000 are abbreviated (e.g. ₹1.2k).
 */
export function formatCurrency(n: number): string {
  return `₹${n >= 1000 ? (n / 1000).toFixed(1) + 'k' : Math.round(n)}`;
}

/**
 * Format an ISO date string as a human-readable label.
 * Returns "Today", "Yesterday", or "DD MMM YYYY".
 */
export function formatSyncDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24 && date.getDate() === now.getDate()) return 'Today';
  if (diffHours < 48) return 'Yesterday';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
