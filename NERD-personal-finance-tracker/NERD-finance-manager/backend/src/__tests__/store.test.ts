import { store } from '../store.ts';
import type { NewRecordInput } from '@shared';

const sample: NewRecordInput = {
  type: 'income',
  amount: 100,
  category: 'Salary',
  date: '2026-06-01',
};

describe('store', () => {
  beforeEach(() => store.reset());

  it('starts empty', () => {
    expect(store.getAll()).toEqual([]);
    expect(store.size).toBe(0);
  });

  it('adds a record and assigns a string id', () => {
    const record = store.add(sample);
    expect(record.id).toEqual(expect.any(String));
    expect(record).toMatchObject(sample);
    expect(store.size).toBe(1);
  });

  it('assigns a unique id to each record', () => {
    const a = store.add(sample);
    const b = store.add(sample);
    expect(a.id).not.toBe(b.id);
  });

  it('getAll returns copies that cannot mutate internal state', () => {
    store.add(sample);
    const all = store.getAll();
    all[0].amount = 9999;
    expect(store.getAll()[0].amount).toBe(100);
  });

  it('getById returns the record or undefined', () => {
    const record = store.add(sample);
    expect(store.getById(record.id)).toMatchObject(sample);
    expect(store.getById('missing')).toBeUndefined();
  });

  it('update changes only the provided fields', () => {
    const record = store.add(sample);
    const updated = store.update(record.id, { amount: 250, category: 'Bonus' });
    expect(updated).toMatchObject({ amount: 250, category: 'Bonus', type: 'income' });
    expect(store.getById(record.id)?.amount).toBe(250);
  });

  it('update can set description and date', () => {
    const record = store.add(sample);
    const updated = store.update(record.id, { description: 'note', date: '2026-07-01' });
    expect(updated?.description).toBe('note');
    expect(updated?.date).toBe('2026-07-01');
  });

  it('update returns undefined for a missing id', () => {
    expect(store.update('missing', { amount: 1 })).toBeUndefined();
  });

  it('delete removes a record and reports whether it existed', () => {
    const record = store.add(sample);
    expect(store.delete(record.id)).toBe(true);
    expect(store.size).toBe(0);
    expect(store.delete(record.id)).toBe(false);
  });

  it('reset clears all records', () => {
    store.add(sample);
    store.add(sample);
    store.reset();
    expect(store.size).toBe(0);
    expect(store.getAll()).toEqual([]);
  });
});
