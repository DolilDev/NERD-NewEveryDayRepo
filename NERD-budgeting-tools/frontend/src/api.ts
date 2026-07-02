// Thin fetch wrapper around the JSON API. Every method returns parsed JSON or
// throws an Error carrying the server's message, so callers can surface it in
// the UI with a single catch.

import type {
  Budget,
  Summary,
  Transaction,
  TransactionInput,
  User,
} from './types';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body && body.error) message = body.error;
    } catch {
      // Non-JSON error body — keep the default message.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  register: (username: string, password: string) =>
    request<User>('/api/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  login: (username: string, password: string) =>
    request<User>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<{ message: string }>('/api/logout', { method: 'POST' }),
  me: () => request<User>('/api/me'),

  listTransactions: () => request<Transaction[]>('/api/transactions'),
  createTransaction: (input: TransactionInput) =>
    request<Transaction>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateTransaction: (id: number, input: TransactionInput) =>
    request<Transaction>(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteTransaction: (id: number) =>
    request<{ message: string }>(`/api/transactions/${id}`, {
      method: 'DELETE',
    }),
  summary: () => request<Summary>('/api/summary'),

  listBudgets: () => request<Budget[]>('/api/budgets'),
  setBudget: (category: string, limit: number) =>
    request<Budget>('/api/budgets', {
      method: 'PUT',
      body: JSON.stringify({ category, limit }),
    }),
  deleteBudget: (category: string) =>
    request<{ message: string }>(
      `/api/budgets/${encodeURIComponent(category)}`,
      { method: 'DELETE' },
    ),
};
