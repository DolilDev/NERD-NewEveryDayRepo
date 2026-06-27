<script>
  import { onMount } from 'svelte';
  import { loadTransactions, loadSummary } from '../stores/transactions.js';
  import Summary from './Summary.svelte';
  import Chart from './Chart.svelte';
  import AddTransaction from './AddTransaction.svelte';
  import TransactionList from './TransactionList.svelte';

  let loading = true;

  onMount(async () => {
    try {
      await Promise.all([
        loadTransactions(),
        loadSummary()
      ]);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      loading = false;
    }
  });
</script>

<style>
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  .dashboard-header {
    margin-bottom: 30px;
  }

  .dashboard-title {
    font-size: 32px;
    font-weight: bold;
    color: white;
    margin-bottom: 10px;
  }

  .dashboard-subtitle {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.8);
  }

  .loading {
    text-align: center;
    color: white;
    padding: 40px;
    font-size: 18px;
  }

  .dashboard-content {
    animation: fadeIn 0.3s ease-in;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

<div class="dashboard">
  <div class="dashboard-header">
    <h1 class="dashboard-title">💰 Personal Finance Tracker</h1>
    <p class="dashboard-subtitle">Track your income and expenses with ease</p>
  </div>

  {#if loading}
    <div class="loading">Loading your data...</div>
  {:else}
    <div class="dashboard-content">
      <Summary />
      <Chart />
      <AddTransaction />
      <TransactionList />
    </div>
  {/if}
</div>
