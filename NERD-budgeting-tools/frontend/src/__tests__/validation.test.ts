import {
  isValidDate,
  validateBudget,
  validateTransaction,
} from '../validation';

describe('isValidDate', () => {
  it('accepts valid ISO dates', () => {
    expect(isValidDate('2026-06-23')).toBe(true);
    expect(isValidDate('2024-02-29')).toBe(true); // leap year
  });

  it('rejects malformed or impossible dates', () => {
    expect(isValidDate('2026-6-3')).toBe(false);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('not-a-date')).toBe(false);
  });
});

describe('validateTransaction', () => {
  const valid = {
    amount: 10,
    type: 'expense' as const,
    category: 'food',
    date: '2026-06-01',
  };

  it('passes a well-formed transaction', () => {
    expect(validateTransaction(valid).valid).toBe(true);
  });

  it('flags non-positive amounts', () => {
    expect(validateTransaction({ ...valid, amount: 0 }).valid).toBe(false);
    expect(validateTransaction({ ...valid, amount: -3 }).valid).toBe(false);
  });

  it('flags a bad type, empty category and bad date', () => {
    expect(
      validateTransaction({ ...valid, type: 'x' as never }).valid,
    ).toBe(false);
    expect(validateTransaction({ ...valid, category: '  ' }).valid).toBe(false);
    expect(validateTransaction({ ...valid, date: '2026/06/01' }).valid).toBe(
      false,
    );
  });
});

describe('validateBudget', () => {
  it('accepts a non-negative limit with a category', () => {
    expect(validateBudget('food', 100).valid).toBe(true);
    expect(validateBudget('food', 0).valid).toBe(true);
  });

  it('rejects an empty category and negative/NaN limit', () => {
    expect(validateBudget('', 100).valid).toBe(false);
    expect(validateBudget('food', -1).valid).toBe(false);
    expect(validateBudget('food', NaN).valid).toBe(false);
  });
});
