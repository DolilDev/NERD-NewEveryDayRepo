const DocumentStore = require('../src/documentStore');

describe('DocumentStore', () => {
  test('initial document exists and history updated on set', () => {
    const ds = new DocumentStore();
    const initial = ds.getDocument('main');
    expect(typeof initial).toBe('string');

    ds.setDocument('main', 'Hello world');
    expect(ds.getDocument('main')).toBe('Hello world');
    const history = ds.getHistory('main');
    expect(history[history.length - 1]).toBe('Hello world');
  });

  test('revert to previous version', () => {
    const ds = new DocumentStore();
    ds.setDocument('main', 'v1');
    ds.setDocument('main', 'v2');
    const history = ds.getHistory('main');
    const reverted = ds.revertToVersion('main', 1);
    expect(reverted).toBe(history[1]);
    expect(ds.getDocument('main')).toBe(history[1]);
  });
});
