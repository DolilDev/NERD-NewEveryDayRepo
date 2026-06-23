// Pure data-shaping used by both the summary cards and the charts. Kept free of
// DOM/Chart.js so the maths can be unit tested in isolation.

import type { Summary, Transaction } from './types';

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Total income, total expenses and the resulting balance. */
export function summarize(transactions: Transaction[]): Summary {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') expenses += t.amount;
  }
  return {
    total_income: round(income),
    total_expenses: round(expenses),
    balance: round(income - expenses),
  };
}

export interface CategoryTotal {
  category: string;
  total: number;
}

/** Expense totals per category, largest first (income is ignored). */
export function expensesByCategory(
  transactions: Transaction[],
): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  }
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total: round(total) }))
    .sort((a, b) => b.total - a.total);
}

export interface MonthlyTotal {
  month: string; // YYYY-MM
  income: number;
  expense: number;
}

/** Income vs expense bucketed by month, in chronological order. */
export function monthlyTotals(transactions: Transaction[]): MonthlyTotal[] {
  const months = new Map<string, { income: number; expense: number }>();
  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    const entry = months.get(month) ?? { income: 0, expense: 0 };
    if (t.type === 'income') entry.income += t.amount;
    else entry.expense += t.amount;
    months.set(month, entry);
  }
  return [...months.entries()]
    .map(([month, value]) => ({
      month,
      income: round(value.income),
      expense: round(value.expense),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** Percentage of a budget that has been spent (0 when there is no limit). */
export function budgetUsage(limit: number, spent: number): number {
  if (limit <= 0) return 0;
  return Math.round((spent / limit) * 100);
}
