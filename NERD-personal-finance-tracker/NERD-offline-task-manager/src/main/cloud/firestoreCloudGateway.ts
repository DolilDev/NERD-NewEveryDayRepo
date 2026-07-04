import type { Firestore } from 'firebase/firestore';
import type { Task } from '../../shared/types';
import type { FirebaseConfig } from '../config';
import type { CloudGateway } from './cloudGateway';

/**
 * Firestore-backed CloudGateway. The Firebase SDK is imported lazily so that
 * simply constructing this class (or starting the app) never loads Firebase —
 * it only happens on the first real push/pull, behind valid credentials.
 */
export class FirestoreCloudGateway implements CloudGateway {
  private db?: Firestore;

  constructor(
    private readonly config: FirebaseConfig,
    private readonly collectionName: string,
  ) {}

  private async getDb(): Promise<Firestore> {
    if (this.db) {
      return this.db;
    }
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getFirestore } = await import('firebase/firestore');
    const app = getApps().length > 0 ? getApp() : initializeApp(this.config);
    this.db = getFirestore(app);
    return this.db;
  }

  async push(tasks: Task[]): Promise<void> {
    const { doc, setDoc } = await import('firebase/firestore');
    const db = await this.getDb();
    for (const task of tasks) {
      await setDoc(doc(db, this.collectionName, task.id), task);
    }
  }

  async pull(): Promise<Task[]> {
    const { collection, getDocs } = await import('firebase/firestore');
    const db = await this.getDb();
    const snapshot = await getDocs(collection(db, this.collectionName));
    return snapshot.docs.map((entry) => entry.data() as Task);
  }
}
