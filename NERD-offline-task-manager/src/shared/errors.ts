// Custom error types shared across the backend layers. They let the service
// signal *why* an operation failed so IPC can serialise a clean, user-facing
// message instead of leaking raw SQL or stack traces to the UI.

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class SyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncError';
  }
}
