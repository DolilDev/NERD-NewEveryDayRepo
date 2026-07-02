import { capitalize, formatCurrency, formatDate } from '../format';

describe('formatCurrency', () => {
  it('formats a number as USD', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('formatDate', () => {
  it('formats an ISO date without timezone drift', () => {
    expect(formatDate('2026-06-01')).toBe('Jun 1, 2026');
    expect(formatDate('2026-12-31')).toBe('Dec 31, 2026');
  });
});

describe('capitalize', () => {
  it('capitalizes the first letter', () => {
    expect(capitalize('expense')).toBe('Expense');
    expect(capitalize('')).toBe('');
  });
});
