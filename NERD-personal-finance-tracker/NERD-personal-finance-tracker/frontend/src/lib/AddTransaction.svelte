<script>
  import { addTransaction, loading, error } from '../stores/transactions.js';

  let type = 'expense';
  let amount = '';
  let category = '';
  let description = '';
  let date = new Date().toISOString().split('T')[0];
  let formError = '';

  const categories = ['food', 'utilities', 'entertainment', 'transportation', 'healthcare', 'shopping', 'salary', 'freelance', 'bonus', 'other'];

  async function handleSubmit(e) {
    e.preventDefault();
    formError = '';

    // Validation
    if (!type) {
      formError = 'Please select a type';
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      formError = 'Amount must be greater than 0';
      return;
    }
    if (!category) {
      formError = 'Please select a category';
      return;
    }
    if (!date) {
      formError = 'Please select a date';
      return;
    }

    try {
      await addTransaction({
        type,
        amount: parseFloat(amount),
        category,
        description,
        date
      });

      // Reset form
      type = 'expense';
      amount = '';
      category = '';
      description = '';
      date = new Date().toISOString().split('T')[0];
      formError = '';
    } catch (err) {
      formError = err.message;
    }
  }
</script>

<style>
  .form-container {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 30px;
  }

  .form-title {
    font-size: 18px;
    font-weight: bold;
    color: #1f2937;
    margin-bottom: 20px;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 15px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  label {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  input,
  select,
  textarea {
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-family: inherit;
    font-size: 14px;
    transition: border-color 0.2s;
  }

  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  textarea {
    resize: vertical;
    min-height: 80px;
  }

  .form-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }

  button {
    flex: 1;
    padding: 12px 20px;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .submit-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .reset-btn {
    background: #e5e7eb;
    color: #374151;
  }

  .reset-btn:hover {
    background: #d1d5db;
  }

  .error-message {
    color: #ef4444;
    font-size: 14px;
    padding: 10px;
    background: #fee2e2;
    border-radius: 6px;
    margin-bottom: 15px;
    border-left: 3px solid #ef4444;
  }

  .full-width {
    grid-column: 1 / -1;
  }
</style>

<div class="form-container">
  <div class="form-title">Add Transaction</div>

  {#if formError}
    <div class="error-message">{formError}</div>
  {/if}

  {#if $error}
    <div class="error-message">{$error}</div>
  {/if}

  <form on:submit={handleSubmit}>
    <div class="form-grid">
      <div class="form-group">
        <label for="type">Type</label>
        <select id="type" bind:value={type} disabled={$loading}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>

      <div class="form-group">
        <label for="amount">Amount</label>
        <input
          id="amount"
          type="number"
          bind:value={amount}
          placeholder="0.00"
          step="0.01"
          min="0"
          disabled={$loading}
        />
      </div>

      <div class="form-group">
        <label for="category">Category</label>
        <select id="category" bind:value={category} disabled={$loading}>
          <option value="">Select a category</option>
          {#each categories as cat}
            <option value={cat}>{cat}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label for="date">Date</label>
        <input
          id="date"
          type="date"
          bind:value={date}
          disabled={$loading}
        />
      </div>

      <div class="form-group full-width">
        <label for="description">Description (optional)</label>
        <textarea
          id="description"
          bind:value={description}
          placeholder="Enter transaction description"
          disabled={$loading}
        ></textarea>
      </div>
    </div>

    <div class="form-actions">
      <button
        type="submit"
        class="submit-btn"
        disabled={$loading}
      >
        {$loading ? 'Adding...' : 'Add Transaction'}
      </button>
      <button
        type="reset"
        class="reset-btn"
        disabled={$loading}
        on:click={() => formError = ''}
      >
        Clear
      </button>
    </div>
  </form>
</div>
