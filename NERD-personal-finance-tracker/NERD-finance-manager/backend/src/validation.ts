// Pure request-body validation for finance records.
//
// These functions take untrusted input (`unknown`) and return a structured
// result with a list of human-readable error messages and, when valid, a
// cleaned value ready to hand to the store. They have no Express dependency so
// they can be unit-tested directly.

import type { NewRecordInput, RecordType, UpdateRecordInput } from '@shared';

export interface ValidationResult<T> {
  valid: boolean;
  errors: string[];
  /** Present only when `valid` is true. */
  value?: T;
}

const RECORD_TYPES: readonly RecordType[] = ['income', 'expense'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidType(value: unknown): value is RecordType {
  return typeof value === 'string' && RECORD_TYPES.includes(value as RecordType);
}

function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

/** Validate a payload for creating a record: all required fields must be valid. */
export function validateNewRecord(input: unknown): ValidationResult<NewRecordInput> {
  if (!isPlainObject(input)) {
    return { valid: false, errors: ['Request body must be a JSON object.'] };
  }

  const errors: string[] = [];

  if (!isValidType(input.type)) {
    errors.push('Field "type" must be either "income" or "expense".');
  }
  if (!isValidAmount(input.amount)) {
    errors.push('Field "amount" must be a number greater than 0.');
  }
  if (!isNonEmptyString(input.category)) {
    errors.push('Field "category" is required and must be a non-empty string.');
  }
  if (input.description !== undefined && typeof input.description !== 'string') {
    errors.push('Field "description" must be a string when provided.');
  }
  if (!isValidDate(input.date)) {
    errors.push('Field "date" must be a valid ISO date string.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const value: NewRecordInput = {
    type: input.type as RecordType,
    amount: input.amount as number,
    category: (input.category as string).trim(),
    date: input.date as string,
  };
  if (typeof input.description === 'string' && input.description.trim().length > 0) {
    value.description = input.description.trim();
  }

  return { valid: true, errors: [], value };
}

/** Validate a payload for updating a record: only provided fields are checked,
 *  and at least one updatable field must be present. */
export function validateUpdateRecord(input: unknown): ValidationResult<UpdateRecordInput> {
  if (!isPlainObject(input)) {
    return { valid: false, errors: ['Request body must be a JSON object.'] };
  }

  const errors: string[] = [];
  const value: UpdateRecordInput = {};

  if (input.type !== undefined) {
    if (isValidType(input.type)) value.type = input.type;
    else errors.push('Field "type" must be either "income" or "expense".');
  }
  if (input.amount !== undefined) {
    if (isValidAmount(input.amount)) value.amount = input.amount;
    else errors.push('Field "amount" must be a number greater than 0.');
  }
  if (input.category !== undefined) {
    if (isNonEmptyString(input.category)) value.category = input.category.trim();
    else errors.push('Field "category" must be a non-empty string.');
  }
  if (input.description !== undefined) {
    if (typeof input.description === 'string') value.description = input.description.trim();
    else errors.push('Field "description" must be a string.');
  }
  if (input.date !== undefined) {
    if (isValidDate(input.date)) value.date = input.date;
    else errors.push('Field "date" must be a valid ISO date string.');
  }

  if (errors.length === 0 && Object.keys(value).length === 0) {
    errors.push('Provide at least one field to update.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], value };
}
