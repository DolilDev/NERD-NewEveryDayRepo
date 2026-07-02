// Pure client-side form validation.
//
// Takes the raw string values from the form (the browser gives us strings) and
// returns a per-field map of error messages. No DOM access here so it can be
// unit-tested directly (see validation.test.ts).

export interface RecordFormValues {
  type: string;
  amount: string;
  category: string;
  description: string;
  date: string;
}

export type FormErrors = Partial<Record<keyof RecordFormValues, string>>;

export interface FormValidationResult {
  valid: boolean;
  errors: FormErrors;
}

export function validateRecordForm(values: RecordFormValues): FormValidationResult {
  const errors: FormErrors = {};

  if (values.type !== 'income' && values.type !== 'expense') {
    errors.type = 'Choose a type.';
  }

  const amount = Number(values.amount);
  if (values.amount.trim() === '' || Number.isNaN(amount)) {
    errors.amount = 'Amount is required.';
  } else if (amount <= 0) {
    errors.amount = 'Amount must be greater than 0.';
  }

  if (values.category.trim() === '') {
    errors.category = 'Category is required.';
  }

  if (values.date.trim() === '') {
    errors.date = 'Date is required.';
  }

  // description is optional — nothing to validate.

  return { valid: Object.keys(errors).length === 0, errors };
}
