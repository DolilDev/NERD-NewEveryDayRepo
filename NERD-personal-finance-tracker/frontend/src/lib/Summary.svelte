<script>
  import { summary } from '../stores/transactions.js';

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
</script>

<style>
  .summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
  }

  .card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .card.income {
    border-left: 5px solid #10b981;
  }

  .card.expense {
    border-left: 5px solid #ef4444;
  }

  .card.balance {
    border-left: 5px solid #667eea;
  }

  .label {
    font-size: 14px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .amount {
    font-size: 28px;
    font-weight: bold;
    color: #1f2937;
  }

  .card.income .amount {
    color: #10b981;
  }

  .card.expense .amount {
    color: #ef4444;
  }

  .card.balance .amount {
    color: #667eea;
  }
</style>

<div class="summary">
  <div class="card income">
    <span class="label">Total Income</span>
    <span class="amount">{formatCurrency($summary.totalIncome)}</span>
  </div>

  <div class="card expense">
    <span class="label">Total Expenses</span>
    <span class="amount">{formatCurrency($summary.totalExpenses)}</span>
  </div>

  <div class="card balance">
    <span class="label">Balance</span>
    <span class="amount">{formatCurrency($summary.balance)}</span>
  </div>
</div>
