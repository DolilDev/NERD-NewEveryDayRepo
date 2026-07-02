import {
  budgetUsage,
  expensesByCategory,
  monthlyTotals,
  summarize,
} from '../aggregate';
import type { Transaction } from '../types';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 1,
  user_id: 1,
  type: 'expense',
  amount: 10,
  category: 'food',
  date: '2026-06-01',
  description: null,
  ...over,
});

describe('summarize', () => {
  it('totals income, expenses and balance', () => {
    const result = summarize([
      tx({ type: 'income', amount: 100 }),
      tx({ type: 'expense', amount: 30 }),
      tx({ type: 'expense', amount: 20 }),
    ]);
    expect(result).toEqual({
      total_income: 100,
      total_expenses: 50,
      balance: 50,
    });
  });

  it('handles an empty list', () => {
    expect(summarize([])).toEqual({
      total_income: 0,
      total_expenses: 0,
      balance: 0,
    });
  });
});

describe('expensesByCategory', () => {
  it('groups expenses sorted by total desc, ignoring income', () => {
    const result = expensesByCategory([
      tx({ category: 'food', amount: 10 }),
      tx({ category: 'food', amount: 5 }),
      tx({ category: 'rent', amount: 100 }),
      tx({ type: 'income', category: 'food', amount: 999 }),
    ]);
    expect(result).toEqual([
      { category: 'rent', total: 100 },
      { category: 'food', total: 15 },
    ]);
  });
});

describe('monthlyTotals', () => {
  it('buckets by YYYY-MM in chronological order', () => {
    const result = monthlyTotals([
      tx({ date: '2026-06-01', type: 'income', amount: 100 }),
      tx({ date: '2026-06-15', type: 'expense', amount: 40 }),
      tx({ date: '2026-05-10', type: 'expense', amount: 20 }),
    ]);
    expect(result).toEqual([
      { month: '2026-05', income: 0, expense: 20 },
      { month: '2026-06', income: 100, expense: 40 },
    ]);
  });
});

describe('budgetUsage', () => {
  it('returns the percentage of the limit used', () => {
    expect(budgetUsage(100, 25)).toBe(25);
    expect(budgetUsage(200, 50)).toBe(25);
  });

  it('returns 0 when there is no limit', () => {
    expect(budgetUsage(0, 25)).toBe(0);
  });
});
