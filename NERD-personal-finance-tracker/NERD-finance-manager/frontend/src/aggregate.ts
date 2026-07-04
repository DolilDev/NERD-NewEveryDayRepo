// Pure aggregation for the income-vs-expense over-time chart.
//
// Groups records by calendar month (YYYY-MM) and sums income and expenses per
// month, returned in chronological order. No Chart.js or DOM dependency, so it
// is unit-testable on its own (see aggregate.test.ts).

import type { FinanceRecord } from '@shared';

export interface MonthlyAggregation {
  /** Months present in the data, sorted ascending, e.g. ["2026-01", "2026-02"]. */
  labels: string[];
  /** Total income per month, aligned with `labels`. */
  income: number[];
  /** Total expenses per month, aligned with `labels`. */
  expense: number[];
}

export function aggregateByMonth(records: FinanceRecord[]): MonthlyAggregation {
  const byMonth = new Map<string, { income: number; expense: number }>();

  for (const record of records) {
    const month = record.date.slice(0, 7); // "YYYY-MM"
    const bucket = byMonth.get(month) ?? { income: 0, expense: 0 };
    if (record.type === 'income') {
      bucket.income += record.amount;
    } else if (record.type === 'expense') {
      bucket.expense += record.amount;
    }
    byMonth.set(month, bucket);
  }

  // Lexical sort of "YYYY-MM" is chronological.
  const labels = [...byMonth.keys()].sort();

  return {
    labels,
    income: labels.map((month) => byMonth.get(month)!.income),
    expense: labels.map((month) => byMonth.get(month)!.expense),
  };
}
