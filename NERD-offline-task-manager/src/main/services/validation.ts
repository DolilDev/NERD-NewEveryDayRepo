import { ValidationError } from '../../shared/errors';
import type { TaskStatus } from '../../shared/types';

export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'done'];

/** Validates a required title; returns the trimmed value or throws. */
export function validateTitle(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ValidationError('Title is required.');
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ValidationError('Title cannot be empty.');
  }
  if (trimmed.length > TITLE_MAX_LENGTH) {
    throw new ValidationError(`Title cannot be longer than ${TITLE_MAX_LENGTH} characters.`);
  }
  return trimmed;
}

/** Normalises an optional description; returns the trimmed value or '' or throws. */
export function normalizeDescription(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value !== 'string') {
    throw new ValidationError('Description must be text.');
  }
  const trimmed = value.trim();
  if (trimmed.length > DESCRIPTION_MAX_LENGTH) {
    throw new ValidationError(
      `Description cannot be longer than ${DESCRIPTION_MAX_LENGTH} characters.`,
    );
  }
  return trimmed;
}

/** Validates a status against the allowed set; returns it or throws. */
export function validateStatus(value: unknown): TaskStatus {
  if (typeof value !== 'string' || !TASK_STATUSES.includes(value as TaskStatus)) {
    throw new ValidationError(`Status must be one of: ${TASK_STATUSES.join(', ')}.`);
  }
  return value as TaskStatus;
}
