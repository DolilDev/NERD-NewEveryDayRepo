import { writable } from 'svelte/store';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getSummary } from '../api/client.js';

// Transaction store
export const transactions = writable([]);
export const summary = writable({
  totalIncome: 0,
  totalExpenses: 0,
  balance: 0,
  byCategory: {}
});

export const loading = writable(false);
export const error = writable(null);

// Load transactions from API
export const loadTransactions = async (filters = {}) => {
  loading.set(true);
  error.set(null);
  try {
    const data = await getTransactions(filters);
    transactions.set(data);
  } catch (err) {
    error.set(err.message);
  } finally {
    loading.set(false);
  }
};

// Load summary from API
export const loadSummary = async () => {
  loading.set(true);
  error.set(null);
  try {
    const data = await getSummary();
    summary.set(data);
  } catch (err) {
    error.set(err.message);
  } finally {
    loading.set(false);
  }
};

// Add transaction
export const addTransaction = async (transaction) => {
  loading.set(true);
  error.set(null);
  try {
    const newTransaction = await createTransaction(transaction);
    transactions.update(t => [newTransaction, ...t]);
    await loadSummary();
    return newTransaction;
  } catch (err) {
    error.set(err.message);
    throw err;
  } finally {
    loading.set(false);
  }
};

// Update transaction
export const updateTransactionItem = async (id, updates) => {
  loading.set(true);
  error.set(null);
  try {
    const updated = await updateTransaction(id, updates);
    transactions.update(t => t.map(item => item.id === id ? updated : item));
    await loadSummary();
    return updated;
  } catch (err) {
    error.set(err.message);
    throw err;
  } finally {
    loading.set(false);
  }
};

// Delete transaction
export const deleteTransactionItem = async (id) => {
  loading.set(true);
  error.set(null);
  try {
    await deleteTransaction(id);
    transactions.update(t => t.filter(item => item.id !== id));
    await loadSummary();
  } catch (err) {
    error.set(err.message);
    throw err;
  } finally {
    loading.set(false);
  }
};

// Clear all stores
export const clearStores = () => {
  transactions.set([]);
  summary.set({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    byCategory: {}
  });
  error.set(null);
};
