// In-memory data store for finance records.
//
// This is a pure module with no Express (or other framework) dependencies, so it
// can be unit-tested in isolation. State lives in module scope and survives for
// the lifetime of the running server process. `reset()` clears it — useful for
// tests and for the "reset data" feature exposed through the API.

import { randomUUID } from 'node:crypto';
import type {
  FinanceRecord,
  NewRecordInput,
  UpdateRecordInput,
} from '@shared';

let records: FinanceRecord[] = [];

/** Return a shallow copy so callers can never mutate stored state directly. */
function clone(record: FinanceRecord): FinanceRecord {
  return { ...record };
}

export const store = {
  /** Insert a new record and return the stored copy (with its generated id). */
  add(input: NewRecordInput): FinanceRecord {
    const record: FinanceRecord = { id: randomUUID(), ...input };
    records.push(record);
    return clone(record);
  },

  /** Return all records (copies), in insertion order. */
  getAll(): FinanceRecord[] {
    return records.map(clone);
  },

  /** Return a single record by id, or `undefined` if not found. */
  getById(id: string): FinanceRecord | undefined {
    const found = records.find((record) => record.id === id);
    return found ? clone(found) : undefined;
  },

  /** Apply a partial update to a record. Returns the updated copy, or
   *  `undefined` if no record has the given id. */
  update(id: string, patch: UpdateRecordInput): FinanceRecord | undefined {
    const record = records.find((entry) => entry.id === id);
    if (!record) {
      return undefined;
    }
    if (patch.type !== undefined) record.type = patch.type;
    if (patch.amount !== undefined) record.amount = patch.amount;
    if (patch.category !== undefined) record.category = patch.category;
    if (patch.description !== undefined) record.description = patch.description;
    if (patch.date !== undefined) record.date = patch.date;
    return clone(record);
  },

  /** Remove a record by id. Returns `true` if something was removed. */
  delete(id: string): boolean {
    const index = records.findIndex((record) => record.id === id);
    if (index === -1) {
      return false;
    }
    records.splice(index, 1);
    return true;
  },

  /** Drop all records. */
  reset(): void {
    records = [];
  },

  /** Current number of stored records (handy for tests and diagnostics). */
  get size(): number {
    return records.length;
  },
};

export type Store = typeof store;
