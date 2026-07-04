// Shared domain types used across the frontend modules.

export type TxType = 'income' | 'expense';

export interface Transaction {
  id: number;
  user_id: number;
  type: TxType;
  amount: number;
  category: string;
  date: string; // ISO YYYY-MM-DD
  description: string | null;
}

export interface TransactionInput {
  type: TxType;
  amount: number;
  category: string;
  date: string;
  description?: string | null;
}

export interface Budget {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
}

export interface Summary {
  total_income: number;
  total_expenses: number;
  balance: number;
}

export interface User {
  id: number;
  username: string;
}
