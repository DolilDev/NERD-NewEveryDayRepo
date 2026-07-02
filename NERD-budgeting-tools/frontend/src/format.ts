// Pure display formatting helpers (currency, dates, casing).

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/** Render an ISO ``YYYY-MM-DD`` string as e.g. "Jun 1, 2026" (no TZ drift). */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

export function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
