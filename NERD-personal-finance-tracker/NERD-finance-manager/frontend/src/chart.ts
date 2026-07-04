// Chart.js rendering for the income-vs-expense over-time chart.
//
// The pure data shaping lives in ./aggregate; this module only owns the Chart
// instance and translates the aggregation into a line chart. It keeps a single
// chart instance and updates it in place on subsequent renders.

import Chart from 'chart.js/auto';
import { aggregateByMonth } from './aggregate.ts';
import type { FinanceRecord } from '@shared';

let chart: Chart | null = null;

const INCOME_COLOR = '#22c55e';
const EXPENSE_COLOR = '#ef4444';
const AXIS_COLOR = '#94a3b8';
const GRID_COLOR = '#334155';

export function renderChart(canvas: HTMLCanvasElement, records: FinanceRecord[]): void {
  const { labels, income, expense } = aggregateByMonth(records);

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = income;
    chart.data.datasets[1].data = expense;
    chart.update();
    return;
  }

  chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Income',
          data: income,
          borderColor: INCOME_COLOR,
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          fill: true,
          tension: 0.25,
        },
        {
          label: 'Expense',
          data: expense,
          borderColor: EXPENSE_COLOR,
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          fill: true,
          tension: 0.25,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: AXIS_COLOR },
          grid: { color: GRID_COLOR },
        },
        x: {
          ticks: { color: AXIS_COLOR },
          grid: { color: GRID_COLOR },
        },
      },
      plugins: {
        legend: { labels: { color: '#e2e8f0' } },
      },
    },
  });
}
