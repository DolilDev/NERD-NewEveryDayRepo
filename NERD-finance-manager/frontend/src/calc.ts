// Pure calculation helpers for the dashboard.
//
// `computeTotals` is intentionally free of any DOM or network code so it can be
// unit-tested directly (see calc.test.ts).

import type { FinanceRecord } from '@shared';

export interface Totals {
  income: number;
  expense: number;
  balance: number;
}

/** Sum income and expense amounts and derive the balance (income − expense). */
export function computeTotals(records: FinanceRecord[]): Totals {
  let income = 0;
  let expense = 0;

  for (const record of records) {
    if (record.type === 'income') {
      income += record.amount;
    } else if (record.type === 'expense') {
      expense += record.amount;
    }
  }

  return { income, expense, balance: income - expense };
}

/** Format a number as a USD currency string, e.g. 1234.5 → "$1,234.50". */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
