import { aggregateByMonth } from '../aggregate.ts';
import type { FinanceRecord } from '@shared';

function rec(partial: Partial<FinanceRecord>): FinanceRecord {
  return {
    id: 'x',
    type: 'expense',
    amount: 1,
    category: 'c',
    date: '2026-01-01',
    ...partial,
  };
}

describe('aggregateByMonth', () => {
  it('returns empty arrays for no records', () => {
    expect(aggregateByMonth([])).toEqual({ labels: [], income: [], expense: [] });
  });

  it('sums income and expense within a single month', () => {
    const result = aggregateByMonth([
      rec({ type: 'income', amount: 1000, date: '2026-01-10' }),
      rec({ type: 'income', amount: 200, date: '2026-01-20' }),
      rec({ type: 'expense', amount: 300, date: '2026-01-15' }),
    ]);
    expect(result).toEqual({ labels: ['2026-01'], income: [1200], expense: [300] });
  });

  it('groups across months and sorts chronologically', () => {
    const result = aggregateByMonth([
      rec({ type: 'income', amount: 1100, date: '2026-02-15' }),
      rec({ type: 'income', amount: 1000, date: '2026-01-15' }),
      rec({ type: 'expense', amount: 300, date: '2026-02-01' }),
      rec({ type: 'expense', amount: 200, date: '2026-01-20' }),
    ]);
    expect(result.labels).toEqual(['2026-01', '2026-02']);
    expect(result.income).toEqual([1000, 1100]);
    expect(result.expense).toEqual([200, 300]);
  });

  it('extracts the month from a full ISO timestamp', () => {
    const result = aggregateByMonth([
      rec({ type: 'income', amount: 5, date: '2026-03-09T10:30:00.000Z' }),
    ]);
    expect(result.labels).toEqual(['2026-03']);
    expect(result.income).toEqual([5]);
  });

  it('keeps income and expense arrays aligned with labels (zero-filling)', () => {
    const result = aggregateByMonth([
      rec({ type: 'income', amount: 500, date: '2026-01-05' }),
      rec({ type: 'expense', amount: 700, date: '2026-02-05' }),
    ]);
    expect(result.labels).toEqual(['2026-01', '2026-02']);
    expect(result.income).toEqual([500, 0]);
    expect(result.expense).toEqual([0, 700]);
  });

  it('orders months across year boundaries', () => {
    const result = aggregateByMonth([
      rec({ type: 'income', amount: 1, date: '2026-01-01' }),
      rec({ type: 'income', amount: 2, date: '2025-12-01' }),
    ]);
    expect(result.labels).toEqual(['2025-12', '2026-01']);
    expect(result.income).toEqual([2, 1]);
  });
});
