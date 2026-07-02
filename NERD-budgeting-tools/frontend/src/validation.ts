// Pure, framework-free input validation. Mirrors the backend rules so the user
// gets immediate feedback before a request is ever sent. No DOM or network
// access here, which keeps these functions trivial to unit test.

import type { TransactionInput, TxType } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const TYPES: readonly TxType[] = ['income', 'expense'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True if ``value`` is a real calendar date in strict ``YYYY-MM-DD`` form. */
export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  // Build the date in UTC and check the parts survived (rejects e.g. 02-30).
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateTransaction(
  input: Partial<TransactionInput>,
): ValidationResult {
  const errors: string[] = [];

  if (typeof input.amount !== 'number' || !Number.isFinite(input.amount)) {
    errors.push('Amount must be a number');
  } else if (input.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (!input.type || !TYPES.includes(input.type)) {
    errors.push("Type must be 'income' or 'expense'");
  }

  if (!input.category || !input.category.trim()) {
    errors.push('Category is required');
  }

  if (!input.date || !isValidDate(input.date)) {
    errors.push('Date must be in YYYY-MM-DD format');
  }

  return { valid: errors.length === 0, errors };
}

export function validateBudget(
  category: string,
  limit: number,
): ValidationResult {
  const errors: string[] = [];

  if (!category || !category.trim()) {
    errors.push('Category is required');
  }

  if (typeof limit !== 'number' || !Number.isFinite(limit)) {
    errors.push('Limit must be a number');
  } else if (limit < 0) {
    errors.push('Limit must be 0 or greater');
  }

  return { valid: errors.length === 0, errors };
}
