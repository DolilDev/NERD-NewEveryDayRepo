import type { Task } from '../../shared/types';

/**
 * Seam over the cloud backend. SyncService depends on this interface, not on
 * Firestore directly, which keeps the cloud logic testable with a fake.
 */
export interface CloudGateway {
  /** Upserts every task into the cloud store. */
  push(tasks: Task[]): Promise<void>;
  /** Fetches all tasks currently stored in the cloud. */
  pull(): Promise<Task[]>;
}
