import { computeTotals, formatCurrency } from '../calc.ts';
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

describe('computeTotals', () => {
  it('returns zeros for no records', () => {
    expect(computeTotals([])).toEqual({ income: 0, expense: 0, balance: 0 });
  });

  it('sums income and expenses and derives the balance', () => {
    const records = [
      rec({ type: 'income', amount: 1000 }),
      rec({ type: 'income', amount: 250 }),
      rec({ type: 'expense', amount: 400 }),
    ];
    expect(computeTotals(records)).toEqual({ income: 1250, expense: 400, balance: 850 });
  });

  it('can produce a negative balance', () => {
    expect(computeTotals([rec({ type: 'expense', amount: 100 })])).toEqual({
      income: 0,
      expense: 100,
      balance: -100,
    });
  });

  it('handles decimal amounts', () => {
    const totals = computeTotals([
      rec({ type: 'income', amount: 10.25 }),
      rec({ type: 'expense', amount: 3.1 }),
    ]);
    expect(totals.income).toBeCloseTo(10.25);
    expect(totals.expense).toBeCloseTo(3.1);
    expect(totals.balance).toBeCloseTo(7.15);
  });
});

describe('formatCurrency', () => {
  it('formats whole and fractional values as USD', () => {
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('formats negative values', () => {
    expect(formatCurrency(-50)).toBe('-$50.00');
  });
});
