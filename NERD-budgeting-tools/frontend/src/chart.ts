// Chart.js rendering. The pure data shaping lives in ./aggregate; this module
// only owns the Chart instances and translates aggregations into chart configs.
// A single instance per canvas key is kept and replaced on each render.

import Chart from 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js';
import { expensesByCategory, monthlyTotals } from './aggregate';
import type { Budget, Transaction } from './types';

const INCOME_COLOR = '#16a34a';
const EXPENSE_COLOR = '#dc2626';
const LIMIT_COLOR = '#94a3b8';
const PALETTE = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6',
];

const charts = new Map<string, Chart>();

function upsert(
  key: string,
  canvas: HTMLCanvasElement,
  config: ChartConfiguration,
): void {
  charts.get(key)?.destroy();
  charts.set(key, new Chart(canvas, config));
}

function barOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true } },
    plugins: { legend: { position: 'bottom' as const } },
  };
}

export function renderMonthlyChart(
  canvas: HTMLCanvasElement,
  transactions: Transaction[],
): void {
  const data = monthlyTotals(transactions);
  upsert('monthly', canvas, {
    type: 'bar',
    data: {
      labels: data.map((d) => d.month),
      datasets: [
        { label: 'Income', data: data.map((d) => d.income), backgroundColor: INCOME_COLOR },
        { label: 'Expense', data: data.map((d) => d.expense), backgroundColor: EXPENSE_COLOR },
      ],
    },
    options: barOptions(),
  });
}

export function renderCategoryChart(
  canvas: HTMLCanvasElement,
  transactions: Transaction[],
): void {
  const data = expensesByCategory(transactions);
  upsert('category', canvas, {
    type: 'doughnut',
    data: {
      labels: data.map((d) => d.category),
      datasets: [{ data: data.map((d) => d.total), backgroundColor: PALETTE }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' as const } },
    },
  });
}

export function renderBudgetChart(
  canvas: HTMLCanvasElement,
  budgets: Budget[],
): void {
  upsert('budget', canvas, {
    type: 'bar',
    data: {
      labels: budgets.map((b) => b.category),
      datasets: [
        { label: 'Spent', data: budgets.map((b) => b.spent), backgroundColor: EXPENSE_COLOR },
        { label: 'Limit', data: budgets.map((b) => b.limit), backgroundColor: LIMIT_COLOR },
      ],
    },
    options: barOptions(),
  });
}
