// Shared domain types for the NERD Finance Manager.
// Used by both the backend (Express API + store) and the frontend (TS client).
//
// The domain entity is called a "record". It is named `FinanceRecord` here to
// avoid shadowing TypeScript's built-in `Record<K, V>` utility type.

/** Whether a record adds money (income) or removes it (expense). */
export type RecordType = 'income' | 'expense';

/** A single financial record (income or expense). */
export interface FinanceRecord {
  /** Server-assigned unique id. */
  id: string;
  type: RecordType;
  /** Positive monetary amount (> 0). */
  amount: number;
  category: string;
  description?: string;
  /** ISO-8601 date string, e.g. "2026-06-18" or a full timestamp. */
  date: string;
}

/** Payload to create a record. The server assigns the `id`. */
export type NewRecordInput = Omit<FinanceRecord, 'id'>;

/** Payload to update a record. Every field is optional. */
export type UpdateRecordInput = Partial<NewRecordInput>;

/** Shape returned by the API when a request fails. */
export interface ApiErrorResponse {
  error: string;
}
