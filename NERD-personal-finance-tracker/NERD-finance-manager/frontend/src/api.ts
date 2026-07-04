// Typed fetch wrappers for the records REST API.
//
// Every wrapper returns a Promise of the parsed response and throws an
// `ApiRequestError` (with a user-friendly message and HTTP status) on failure,
// including when the server is unreachable. The UI layer turns these into
// on-screen feedback.

import type { FinanceRecord, NewRecordInput, UpdateRecordInput } from '@shared';

/** Error thrown for any failed request. `status` is 0 for network failures. */
export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

/** Resolve the API base URL for both deployment modes:
 *  - served by the backend itself (default :3000) → same-origin "/api";
 *  - served by a separate dev server → the backend on :3000. */
function resolveApiBase(): string {
  const override = (globalThis as { __API_BASE__?: string }).__API_BASE__;
  if (override) {
    return override;
  }
  const port = typeof window !== 'undefined' ? window.location.port : '';
  if (port === '' || port === '3000') {
    return '/api';
  }
  return 'http://localhost:3000/api';
}

export const API_BASE = resolveApiBase();

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new ApiRequestError('Could not reach the server. Is the backend running?', 0);
  }

  // 204 No Content (e.g. DELETE) has no body to parse.
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Request failed with status ${response.status}.`;
    throw new ApiRequestError(message, response.status);
  }

  return body as T;
}

export function getRecords(): Promise<FinanceRecord[]> {
  return request<FinanceRecord[]>('/records');
}

export function getRecord(id: string): Promise<FinanceRecord> {
  return request<FinanceRecord>(`/records/${encodeURIComponent(id)}`);
}

export function createRecord(input: NewRecordInput): Promise<FinanceRecord> {
  return request<FinanceRecord>('/records', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateRecord(id: string, patch: UpdateRecordInput): Promise<FinanceRecord> {
  return request<FinanceRecord>(`/records/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export function deleteRecord(id: string): Promise<void> {
  return request<void>(`/records/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function resetRecords(): Promise<void> {
  return request<void>('/records/reset', { method: 'POST' });
}
