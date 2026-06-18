// Frontend entry point: fetch records and render the dashboard totals.
// Record list rendering, the add/edit form, error handling and the chart are
// layered on in later steps.

import { getRecords } from './api.ts';
import { computeTotals, formatCurrency } from './calc.ts';
import type { FinanceRecord } from '@shared';

let records: FinanceRecord[] = [];

function setText(id: string, text: string): void {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = text;
  }
}

function renderDashboard(): void {
  const totals = computeTotals(records);
  setText('total-income', formatCurrency(totals.income));
  setText('total-expense', formatCurrency(totals.expense));
  setText('balance', formatCurrency(totals.balance));
}

async function refresh(): Promise<void> {
  records = await getRecords();
  renderDashboard();
}

function init(): void {
  renderDashboard();
  void refresh().catch((error) => {
    // Proper user-facing error handling is added in a later step.
    console.error(error);
  });
}

document.addEventListener('DOMContentLoaded', init);
