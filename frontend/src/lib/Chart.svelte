<script>
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';
  import { summary } from '../stores/transactions.js';

  let canvasElement;
  let chartInstance;

  const colors = [
    '#667eea',
    '#764ba2',
    '#f093fb',
    '#4facfe',
    '#43e97b',
    '#fa709a',
    '#fee140',
    '#30b0fe',
    '#a8edea',
    '#fed6e3'
  ];

  onMount(() => {
    const unsubscribe = summary.subscribe((data) => {
      if (canvasElement && data.byCategory && Object.keys(data.byCategory).length > 0) {
        updateChart(data);
      }
    });

    return unsubscribe;
  });

  function updateChart(data) {
    const ctx = canvasElement.getContext('2d');
    const categories = Object.keys(data.byCategory);
    const amounts = Object.values(data.byCategory);

    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categories,
        datasets: [
          {
            data: amounts,
            backgroundColor: colors.slice(0, categories.length),
            borderColor: '#fff',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 13,
                weight: 'bold'
              }
            }
          }
        }
      }
    });
  }
</script>

<style>
  .chart-container {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 30px;
  }

  .chart-title {
    font-size: 18px;
    font-weight: bold;
    color: #1f2937;
    margin-bottom: 20px;
  }

  canvas {
    max-height: 300px;
  }

  .empty-message {
    text-align: center;
    color: #9ca3af;
    padding: 40px 20px;
    font-size: 14px;
  }
</style>

<div class="chart-container">
  <div class="chart-title">Spending by Category</div>
  {#if $summary.byCategory && Object.keys($summary.byCategory).length > 0}
    <canvas bind:this={canvasElement}></canvas>
  {:else}
    <div class="empty-message">No data to display. Add transactions to see the chart.</div>
  {/if}
</div>
