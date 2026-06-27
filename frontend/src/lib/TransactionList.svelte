<script>
  import { transactions, loading, deleteTransactionItem } from '../stores/transactions.js';

  let filterType = '';
  let filterCategory = '';
  let editingId = null;
  let editData = {};

  $: filteredTransactions = $transactions.filter(t => {
    if (filterType && t.type !== filterType) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    return true;
  });

  const categories = ['food', 'utilities', 'entertainment', 'transportation', 'healthcare', 'shopping', 'salary', 'freelance', 'bonus', 'other'];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  async function handleDelete(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteTransactionItem(id);
      } catch (err) {
        alert('Error deleting transaction: ' + err.message);
      }
    }
  }

  function startEdit(transaction) {
    editingId = transaction.id;
    editData = { ...transaction };
  }

  function cancelEdit() {
    editingId = null;
    editData = {};
  }
</script>

<style>
  .list-container {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 15px;
  }

  .list-title {
    font-size: 18px;
    font-weight: bold;
    color: #1f2937;
  }

  .filters {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  select {
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 14px;
    background: white;
    cursor: pointer;
  }

  select:focus {
    outline: none;
    border-color: #667eea;
  }

  .empty-message {
    text-align: center;
    color: #9ca3af;
    padding: 40px 20px;
    font-size: 14px;
  }

  .transactions-table {
    width: 100%;
    border-collapse: collapse;
  }

  .transactions-table thead {
    background: #f9fafb;
    border-bottom: 2px solid #e5e7eb;
  }

  .transactions-table th {
    padding: 12px;
    text-align: left;
    font-weight: 600;
    color: #374151;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .transactions-table td {
    padding: 12px;
    border-bottom: 1px solid #e5e7eb;
  }

  .transactions-table tbody tr:hover {
    background: #f9fafb;
  }

  .type-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .type-badge.income {
    background: #d1fae5;
    color: #065f46;
  }

  .type-badge.expense {
    background: #fee2e2;
    color: #991b1b;
  }

  .amount {
    font-weight: 600;
    color: #1f2937;
  }

  .amount.income {
    color: #10b981;
  }

  .amount.expense {
    color: #ef4444;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  button {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .delete-btn {
    background: #fee2e2;
    color: #991b1b;
  }

  .delete-btn:hover {
    background: #fecaca;
  }

  .delete-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    .list-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .transactions-table {
      font-size: 12px;
    }

    .transactions-table th,
    .transactions-table td {
      padding: 8px;
    }
  }
</style>

<div class="list-container">
  <div class="list-header">
    <div class="list-title">Transactions</div>
    <div class="filters">
      <select bind:value={filterType}>
        <option value="">All Types</option>
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </select>
      <select bind:value={filterCategory}>
        <option value="">All Categories</option>
        {#each categories as cat}
          <option value={cat}>{cat}</option>
        {/each}
      </select>
    </div>
  </div>

  {#if filteredTransactions.length === 0}
    <div class="empty-message">
      No transactions found. Add a transaction to get started!
    </div>
  {:else}
    <table class="transactions-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Category</th>
          <th>Description</th>
          <th>Amount</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredTransactions as transaction (transaction.id)}
          <tr>
            <td>{formatDate(transaction.date)}</td>
            <td>
              <span class="type-badge {transaction.type}">
                {transaction.type}
              </span>
            </td>
            <td>{transaction.category}</td>
            <td>{transaction.description}</td>
            <td>
              <span class="amount {transaction.type}">
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </span>
            </td>
            <td>
              <div class="actions">
                <button
                  class="delete-btn"
                  on:click={() => handleDelete(transaction.id)}
                  disabled={$loading}
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
