import { validateRecordForm, type RecordFormValues } from '../validation.ts';

function values(overrides: Partial<RecordFormValues> = {}): RecordFormValues {
  return {
    type: 'income',
    amount: '100',
    category: 'Salary',
    description: '',
    date: '2026-06-01',
    ...overrides,
  };
}

describe('validateRecordForm', () => {
  it('accepts a valid form', () => {
    const result = validateRecordForm(values());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('requires a valid type', () => {
    expect(validateRecordForm(values({ type: '' })).errors.type).toBeDefined();
    expect(validateRecordForm(values({ type: 'bogus' })).errors.type).toBeDefined();
    expect(validateRecordForm(values({ type: 'expense' })).valid).toBe(true);
  });

  it('requires an amount to be present and numeric', () => {
    expect(validateRecordForm(values({ amount: '' })).errors.amount).toMatch(/required/i);
    expect(validateRecordForm(values({ amount: 'abc' })).errors.amount).toMatch(/required/i);
  });

  it('requires a positive amount', () => {
    expect(validateRecordForm(values({ amount: '0' })).errors.amount).toMatch(/greater than 0/i);
    expect(validateRecordForm(values({ amount: '-5' })).errors.amount).toMatch(/greater than 0/i);
  });

  it('requires a non-blank category', () => {
    expect(validateRecordForm(values({ category: '   ' })).errors.category).toBeDefined();
  });

  it('requires a date', () => {
    expect(validateRecordForm(values({ date: '' })).errors.date).toBeDefined();
  });

  it('does not require a description', () => {
    expect(validateRecordForm(values({ description: '' })).valid).toBe(true);
  });

  it('reports every problem at once', () => {
    const result = validateRecordForm(values({ type: '', amount: '', category: '', date: '' }));
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors)).toHaveLength(4);
  });
});
