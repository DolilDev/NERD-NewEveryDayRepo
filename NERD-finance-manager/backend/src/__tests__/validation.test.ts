import { validateNewRecord, validateUpdateRecord } from '../validation.ts';

describe('validateNewRecord', () => {
  it('accepts a complete, valid record', () => {
    const result = validateNewRecord({
      type: 'expense',
      amount: 12.5,
      category: 'Food',
      date: '2026-06-10',
      description: 'Lunch',
    });
    expect(result.valid).toBe(true);
    expect(result.value).toEqual({
      type: 'expense',
      amount: 12.5,
      category: 'Food',
      date: '2026-06-10',
      description: 'Lunch',
    });
  });

  it('trims category and description', () => {
    const result = validateNewRecord({
      type: 'income',
      amount: 1,
      category: '  Salary  ',
      date: '2026-06-10',
      description: '  hi  ',
    });
    expect(result.value?.category).toBe('Salary');
    expect(result.value?.description).toBe('hi');
  });

  it('omits a blank description', () => {
    const result = validateNewRecord({
      type: 'income',
      amount: 1,
      category: 'X',
      date: '2026-06-10',
      description: '   ',
    });
    expect(result.valid).toBe(true);
    expect(result.value && 'description' in result.value).toBe(false);
  });

  it('rejects a non-object body', () => {
    expect(validateNewRecord(null).valid).toBe(false);
    expect(validateNewRecord([]).valid).toBe(false);
    expect(validateNewRecord('x').valid).toBe(false);
  });

  it('rejects an invalid type', () => {
    const result = validateNewRecord({ type: 'foo', amount: 1, category: 'X', date: '2026-06-10' });
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/type/);
  });

  it('rejects non-positive or non-numeric amounts', () => {
    const base = { type: 'income', category: 'X', date: '2026-06-10' };
    expect(validateNewRecord({ ...base, amount: 0 }).valid).toBe(false);
    expect(validateNewRecord({ ...base, amount: -5 }).valid).toBe(false);
    expect(validateNewRecord({ ...base, amount: '10' }).valid).toBe(false);
    expect(validateNewRecord({ ...base, amount: Infinity }).valid).toBe(false);
    expect(validateNewRecord({ ...base, amount: NaN }).valid).toBe(false);
  });

  it('rejects a missing or blank category', () => {
    expect(validateNewRecord({ type: 'income', amount: 1, category: '   ', date: '2026-06-10' }).valid).toBe(false);
    expect(validateNewRecord({ type: 'income', amount: 1, date: '2026-06-10' }).valid).toBe(false);
  });

  it('rejects an invalid date', () => {
    expect(validateNewRecord({ type: 'income', amount: 1, category: 'X', date: 'not-a-date' }).valid).toBe(false);
  });

  it('rejects a non-string description', () => {
    const result = validateNewRecord({ type: 'income', amount: 1, category: 'X', date: '2026-06-10', description: 5 });
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/description/);
  });

  it('reports every problem at once', () => {
    const result = validateNewRecord({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('validateUpdateRecord', () => {
  it('accepts a partial update', () => {
    const result = validateUpdateRecord({ amount: 5 });
    expect(result.valid).toBe(true);
    expect(result.value).toEqual({ amount: 5 });
  });

  it('validates and keeps only the provided fields', () => {
    const result = validateUpdateRecord({ type: 'income', date: '2026-01-01', category: ' Wage ' });
    expect(result.valid).toBe(true);
    expect(result.value).toEqual({ type: 'income', date: '2026-01-01', category: 'Wage' });
  });

  it('rejects an empty update', () => {
    const result = validateUpdateRecord({});
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/at least one/i);
  });

  it('rejects invalid provided fields', () => {
    expect(validateUpdateRecord({ amount: -3 }).valid).toBe(false);
    expect(validateUpdateRecord({ type: 'nope' }).valid).toBe(false);
    expect(validateUpdateRecord({ category: '' }).valid).toBe(false);
    expect(validateUpdateRecord({ date: 'bad' }).valid).toBe(false);
    expect(validateUpdateRecord({ description: 7 }).valid).toBe(false);
  });

  it('rejects a non-object body', () => {
    expect(validateUpdateRecord(42).valid).toBe(false);
  });
});
