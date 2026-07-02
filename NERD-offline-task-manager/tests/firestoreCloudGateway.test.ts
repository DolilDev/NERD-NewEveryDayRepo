import type { Task } from '../src/shared/types';

// Replace the lazily-imported Firebase SDK with controllable fakes so the
// adapter can be exercised without real credentials or a live Firestore.
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: 'app' })),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({ name: 'app' })),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ name: 'db' })),
  doc: jest.fn((db, collectionName, id) => ({ db, collectionName, id })),
  setDoc: jest.fn(async () => undefined),
  collection: jest.fn((db, collectionName) => ({ db, collectionName })),
  getDocs: jest.fn(async () => ({ docs: [] })),
}));

import * as firebaseApp from 'firebase/app';
import * as firestore from 'firebase/firestore';
import { FirestoreCloudGateway } from '../src/main/cloud/firestoreCloudGateway';

const config = { apiKey: 'k', projectId: 'p', appId: 'a' };

function task(id: string): Task {
  return {
    id,
    title: `Task ${id}`,
    description: '',
    status: 'todo',
    createdAt: 'x',
    updatedAt: 'x',
    syncedAt: null,
  };
}

describe('FirestoreCloudGateway', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the app and writes one document per task on push', async () => {
    const gateway = new FirestoreCloudGateway(config, 'tasks');

    await gateway.push([task('1'), task('2')]);

    expect(firebaseApp.initializeApp).toHaveBeenCalledWith(config);
    expect(firestore.setDoc).toHaveBeenCalledTimes(2);
    expect(firestore.doc).toHaveBeenCalledWith(expect.anything(), 'tasks', '1');
    expect(firestore.doc).toHaveBeenCalledWith(expect.anything(), 'tasks', '2');
  });

  it('reads the collection and maps document data to tasks on pull', async () => {
    (firestore.getDocs as jest.Mock).mockResolvedValueOnce({
      docs: [{ data: () => task('9') }, { data: () => task('10') }],
    });
    const gateway = new FirestoreCloudGateway(config, 'tasks');

    const result = await gateway.pull();

    expect(firestore.collection).toHaveBeenCalledWith(expect.anything(), 'tasks');
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(['9', '10']);
  });

  it('reuses an already-initialized Firebase app', async () => {
    (firebaseApp.getApps as jest.Mock).mockReturnValue([{ name: 'app' }]);
    const gateway = new FirestoreCloudGateway(config, 'tasks');

    await gateway.push([task('1')]);

    expect(firebaseApp.initializeApp).not.toHaveBeenCalled();
    expect(firebaseApp.getApp).toHaveBeenCalled();
  });
});
