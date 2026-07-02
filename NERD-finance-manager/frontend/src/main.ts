// Frontend entry point: wires the dashboard, the records table and the
// add/edit/delete form together. Every mutation re-fetches and re-renders so the
// dashboard totals always match the list.

import {
  ApiRequestError,
  createRecord,
  deleteRecord,
  getRecords,
  resetRecords,
  updateRecord,
} from './api.ts';
import { computeTotals, formatCurrency } from './calc.ts';
import { renderChart } from './chart.ts';
import {
  validateRecordForm,
  type FormValidationResult,
  type RecordFormValues,
} from './validation.ts';
import type { FinanceRecord, NewRecordInput, RecordType } from '@shared';

let records: FinanceRecord[] = [];
let editingId: string | null = null;

// --- DOM helpers ----------------------------------------------------------

function byId(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element #${id}`);
  }
  return element;
}

function getValue(id: string): string {
  return (byId(id) as HTMLInputElement | HTMLSelectElement).value;
}

function setValue(id: string, value: string): void {
  (byId(id) as HTMLInputElement | HTMLSelectElement).value = value;
}

function setText(id: string, text: string): void {
  byId(id).textContent = text;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Show only the date portion (YYYY-MM-DD) of an ISO string. */
function formatDate(value: string): string {
  return value.length >= 10 ? value.slice(0, 10) : value;
}

// --- Toast feedback -------------------------------------------------------

type ToastVariant = 'success' | 'error';

function showToast(message: string, variant: ToastVariant): void {
  const container = document.getElementById('toast');
  if (!container) {
    return;
  }
  const toast = document.createElement('div');
  toast.className = `toast__item toast__item--${variant}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast__item--visible'));
  window.setTimeout(() => {
    toast.classList.remove('toast__item--visible');
    window.setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/** Pull a user-friendly message out of any thrown value. */
function getErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError || error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

// --- Rendering ------------------------------------------------------------

function renderDashboard(): void {
  const totals = computeTotals(records);
  setText('total-income', formatCurrency(totals.income));
  setText('total-expense', formatCurrency(totals.expense));
  setText('balance', formatCurrency(totals.balance));
}

function makeButton(
  label: string,
  action: 'edit' | 'delete',
  id: string,
  className: string,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.className = className;
  button.dataset.action = action;
  button.dataset.id = id;
  return button;
}

function renderRecords(): void {
  const tbody = byId('records-body');
  const emptyState = byId('empty-state');
  tbody.replaceChildren();

  if (records.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  // Most recent first.
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));

  for (const record of sorted) {
    const row = document.createElement('tr');

    const typeCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `type-badge type-badge--${record.type}`;
    badge.textContent = record.type === 'income' ? 'Income' : 'Expense';
    typeCell.appendChild(badge);

    const amountCell = document.createElement('td');
    amountCell.className = `amount-${record.type}`;
    const sign = record.type === 'expense' ? '−' : '+';
    amountCell.textContent = `${sign}${formatCurrency(record.amount)}`;

    const categoryCell = document.createElement('td');
    categoryCell.textContent = record.category;

    const descriptionCell = document.createElement('td');
    descriptionCell.textContent = record.description ?? '';

    const dateCell = document.createElement('td');
    dateCell.textContent = formatDate(record.date);

    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.appendChild(makeButton('Edit', 'edit', record.id, 'btn-secondary'));
    actions.appendChild(makeButton('Delete', 'delete', record.id, 'btn-danger'));
    actionsCell.appendChild(actions);

    row.append(typeCell, amountCell, categoryCell, descriptionCell, dateCell, actionsCell);
    tbody.appendChild(row);
  }
}

function render(): void {
  renderDashboard();
  renderRecords();
  renderChart(byId('over-time-chart') as HTMLCanvasElement, records);
}

// --- Form state -----------------------------------------------------------

function readFormValues(): RecordFormValues {
  return {
    type: getValue('type'),
    amount: getValue('amount'),
    category: getValue('category'),
    description: getValue('description'),
    date: getValue('date'),
  };
}

function toRecordInput(values: RecordFormValues): NewRecordInput {
  const input: NewRecordInput = {
    type: values.type as RecordType,
    amount: Number(values.amount),
    category: values.category.trim(),
    date: values.date,
  };
  const description = values.description.trim();
  if (description) {
    input.description = description;
  }
  return input;
}

const VALIDATED_FIELDS: (keyof RecordFormValues)[] = ['type', 'amount', 'category', 'date'];

function showFieldErrors(result: FormValidationResult): void {
  for (const field of VALIDATED_FIELDS) {
    const message = result.errors[field] ?? '';
    const errorEl = document.getElementById(`err-${field}`);
    if (errorEl) {
      errorEl.textContent = message;
    }
    const fieldEl = document.getElementById(field);
    if (fieldEl) {
      fieldEl.classList.toggle('invalid', message !== '');
    }
  }
}

function clearFieldErrors(): void {
  showFieldErrors({ valid: true, errors: {} });
}

function resetForm(): void {
  editingId = null;
  (byId('record-form') as HTMLFormElement).reset();
  setValue('record-id', '');
  setValue('date', today());
  setText('form-title', 'Add a record');
  setText('submit-btn', 'Add record');
  setText('form-error', '');
  clearFieldErrors();
  byId('cancel-btn').classList.add('hidden');
}

function startEdit(id: string): void {
  const record = records.find((entry) => entry.id === id);
  if (!record) {
    return;
  }
  editingId = id;
  setValue('type', record.type);
  setValue('amount', String(record.amount));
  setValue('category', record.category);
  setValue('description', record.description ?? '');
  setValue('date', formatDate(record.date));
  setText('form-title', 'Edit record');
  setText('submit-btn', 'Save changes');
  byId('cancel-btn').classList.remove('hidden');
  byId('amount').focus();
}

// --- Actions --------------------------------------------------------------

async function refresh(): Promise<void> {
  records = await getRecords();
  render();
}

async function handleSubmit(event: Event): Promise<void> {
  event.preventDefault();

  const values = readFormValues();
  const result = validateRecordForm(values);
  showFieldErrors(result);
  if (!result.valid) {
    return;
  }

  const input = toRecordInput(values);
  const successMessage = editingId ? 'Record updated.' : 'Record added.';
  try {
    if (editingId) {
      await updateRecord(editingId, input);
    } else {
      await createRecord(input);
    }
    resetForm();
    await refresh();
    showToast(successMessage, 'success');
  } catch (error) {
    const message = getErrorMessage(error);
    setText('form-error', message);
    showToast(message, 'error');
  }
}

async function handleDelete(id: string): Promise<void> {
  if (!window.confirm('Delete this record?')) {
    return;
  }
  try {
    await deleteRecord(id);
    if (editingId === id) {
      resetForm();
    }
    await refresh();
    showToast('Record deleted.', 'success');
  } catch (error) {
    showToast(getErrorMessage(error), 'error');
  }
}

async function handleReset(): Promise<void> {
  if (!window.confirm('Delete ALL records? This cannot be undone.')) {
    return;
  }
  try {
    await resetRecords();
    resetForm();
    await refresh();
    showToast('All records cleared.', 'success');
  } catch (error) {
    showToast(getErrorMessage(error), 'error');
  }
}

// --- Wiring ---------------------------------------------------------------

function init(): void {
  setValue('date', today());
  render();

  (byId('record-form') as HTMLFormElement).addEventListener('submit', (event) => {
    void handleSubmit(event);
  });
  byId('cancel-btn').addEventListener('click', resetForm);
  byId('reset-btn').addEventListener('click', () => void handleReset());
  byId('records-body').addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest('button');
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    const { action, id } = button.dataset;
    if (!id) {
      return;
    }
    if (action === 'edit') {
      startEdit(id);
    } else if (action === 'delete') {
      void handleDelete(id);
    }
  });

  void refresh().catch((error) => showToast(getErrorMessage(error), 'error'));
}

document.addEventListener('DOMContentLoaded', init);
