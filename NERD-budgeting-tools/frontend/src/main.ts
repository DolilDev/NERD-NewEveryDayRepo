// Application bootstrap and DOM glue. Pure logic (validation, aggregation,
// formatting) lives in dedicated modules; this file only wires the API, the
// DOM and Chart.js together.

import { budgetUsage } from './aggregate';
import { api } from './api';
import {
  renderBudgetChart,
  renderCategoryChart,
  renderMonthlyChart,
} from './chart';
import { capitalize, formatCurrency, formatDate } from './format';
import type { Budget, Transaction, TransactionInput, TxType } from './types';
import { validateBudget, validateTransaction } from './validation';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
};

const els = {
  authSection: $('auth-section'),
  appSection: $('app-section'),
  userBar: $('user-bar'),
  currentUsername: $('current-username'),
  logoutBtn: $<HTMLButtonElement>('logout-btn'),

  tabLogin: $<HTMLButtonElement>('tab-login'),
  tabRegister: $<HTMLButtonElement>('tab-register'),
  loginForm: $<HTMLFormElement>('login-form'),
  registerForm: $<HTMLFormElement>('register-form'),
  loginUsername: $<HTMLInputElement>('login-username'),
  loginPassword: $<HTMLInputElement>('login-password'),
  registerUsername: $<HTMLInputElement>('register-username'),
  registerPassword: $<HTMLInputElement>('register-password'),
  authMessage: $('auth-message'),

  summaryIncome: $('summary-income'),
  summaryExpenses: $('summary-expenses'),
  summaryBalance: $('summary-balance'),

  txForm: $<HTMLFormElement>('transaction-form'),
  txType: $<HTMLSelectElement>('tx-type'),
  txAmount: $<HTMLInputElement>('tx-amount'),
  txCategory: $<HTMLInputElement>('tx-category'),
  txDate: $<HTMLInputElement>('tx-date'),
  txDescription: $<HTMLInputElement>('tx-description'),
  txSubmit: $<HTMLButtonElement>('tx-submit'),
  txCancel: $<HTMLButtonElement>('tx-cancel'),
  formTitle: $('form-title'),
  formError: $('form-error'),

  budgetForm: $<HTMLFormElement>('budget-form'),
  budgetCategory: $<HTMLInputElement>('budget-category'),
  budgetLimit: $<HTMLInputElement>('budget-limit'),
  budgetError: $('budget-error'),
  budgetsList: $('budgets-list'),

  txBody: $('transactions-body'),
  emptyState: $('empty-state'),
  appMessage: $('app-message'),

  monthlyChart: $<HTMLCanvasElement>('monthly-chart'),
  categoryChart: $<HTMLCanvasElement>('category-chart'),
  budgetChart: $<HTMLCanvasElement>('budget-chart'),
};

let editingId: number | null = null;
let transactions: Transaction[] = [];

function show(el: HTMLElement): void {
  el.classList.remove('hidden');
}

function hide(el: HTMLElement): void {
  el.classList.add('hidden');
}

function flash(
  el: HTMLElement,
  message: string,
  kind: 'error' | 'success' = 'error',
): void {
  el.textContent = message;
  el.classList.remove('hidden', 'message--error', 'message--success');
  el.classList.add(`message--${kind}`);
  if (kind === 'success') {
    window.setTimeout(() => hide(el), 2500);
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---- auth ------------------------------------------------------------------
function setActiveTab(which: 'login' | 'register'): void {
  const loginActive = which === 'login';
  els.tabLogin.classList.toggle('active', loginActive);
  els.tabRegister.classList.toggle('active', !loginActive);
  els.loginForm.classList.toggle('hidden', !loginActive);
  els.registerForm.classList.toggle('hidden', loginActive);
  hide(els.authMessage);
}

async function enterApp(username: string): Promise<void> {
  els.currentUsername.textContent = username;
  hide(els.authSection);
  show(els.appSection);
  show(els.userBar);
  resetTxForm();
  await refresh();
}

function leaveApp(): void {
  hide(els.appSection);
  hide(els.userBar);
  show(els.authSection);
  els.loginForm.reset();
  els.registerForm.reset();
  transactions = [];
}

els.tabLogin.addEventListener('click', () => setActiveTab('login'));
els.tabRegister.addEventListener('click', () => setActiveTab('register'));

els.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const user = await api.login(
      els.loginUsername.value.trim(),
      els.loginPassword.value,
    );
    await enterApp(user.username);
  } catch (err) {
    flash(els.authMessage, (err as Error).message);
  }
});

els.registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const username = els.registerUsername.value.trim();
    const password = els.registerPassword.value;
    await api.register(username, password);
    await api.login(username, password); // auto-login after registering
    await enterApp(username);
  } catch (err) {
    flash(els.authMessage, (err as Error).message);
  }
});

els.logoutBtn.addEventListener('click', async () => {
  try {
    await api.logout();
  } finally {
    leaveApp();
  }
});

// ---- transactions ----------------------------------------------------------
function readTxForm(): TransactionInput {
  return {
    type: els.txType.value as TxType,
    amount: Number(els.txAmount.value),
    category: els.txCategory.value.trim(),
    date: els.txDate.value,
    description: els.txDescription.value.trim() || null,
  };
}

function resetTxForm(): void {
  editingId = null;
  els.txForm.reset();
  els.txDate.value = todayIso();
  els.formTitle.textContent = 'Add transaction';
  els.txSubmit.textContent = 'Add';
  hide(els.txCancel);
  hide(els.formError);
}

function startEdit(t: Transaction): void {
  editingId = t.id;
  els.txType.value = t.type;
  els.txAmount.value = String(t.amount);
  els.txCategory.value = t.category;
  els.txDate.value = t.date;
  els.txDescription.value = t.description ?? '';
  els.formTitle.textContent = 'Edit transaction';
  els.txSubmit.textContent = 'Save';
  show(els.txCancel);
  hide(els.formError);
  els.txForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function deleteTx(id: number): Promise<void> {
  try {
    await api.deleteTransaction(id);
    if (editingId === id) resetTxForm();
    await refresh();
  } catch (err) {
    flash(els.appMessage, (err as Error).message);
  }
}

els.txForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = readTxForm();
  const check = validateTransaction(input);
  if (!check.valid) {
    flash(els.formError, check.errors.join('. '));
    return;
  }
  try {
    if (editingId === null) await api.createTransaction(input);
    else await api.updateTransaction(editingId, input);
    resetTxForm();
    await refresh();
  } catch (err) {
    flash(els.formError, (err as Error).message);
  }
});

els.txCancel.addEventListener('click', resetTxForm);

function renderTransactions(): void {
  els.txBody.replaceChildren();
  if (transactions.length === 0) {
    show(els.emptyState);
    return;
  }
  hide(els.emptyState);

  for (const t of transactions) {
    const row = document.createElement('tr');

    const date = document.createElement('td');
    date.textContent = formatDate(t.date);

    const type = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge badge--${t.type}`;
    badge.textContent = capitalize(t.type);
    type.appendChild(badge);

    const category = document.createElement('td');
    category.textContent = t.category;
    if (t.description) {
      const note = document.createElement('span');
      note.className = 'tx-note';
      note.textContent = t.description;
      category.appendChild(note);
    }

    const amount = document.createElement('td');
    amount.className = `num amount--${t.type}`;
    amount.textContent =
      (t.type === 'expense' ? '-' : '+') + formatCurrency(t.amount);

    const actions = document.createElement('td');
    actions.className = 'row-actions';
    actions.appendChild(iconButton('✏️', 'Edit', () => startEdit(t)));
    actions.appendChild(iconButton('🗑️', 'Delete', () => deleteTx(t.id)));

    row.append(date, type, category, amount, actions);
    els.txBody.appendChild(row);
  }
}

function iconButton(
  glyph: string,
  title: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-btn';
  button.textContent = glyph;
  button.title = title;
  button.setAttribute('aria-label', title);
  button.addEventListener('click', onClick);
  return button;
}

// ---- budgets ---------------------------------------------------------------
els.budgetForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const category = els.budgetCategory.value.trim();
  const limit = Number(els.budgetLimit.value);
  const check = validateBudget(category, limit);
  if (!check.valid) {
    flash(els.budgetError, check.errors.join('. '));
    return;
  }
  try {
    await api.setBudget(category, limit);
    els.budgetForm.reset();
    hide(els.budgetError);
    await refresh();
  } catch (err) {
    flash(els.budgetError, (err as Error).message);
  }
});

function renderBudgets(budgets: Budget[]): void {
  els.budgetsList.replaceChildren();
  if (budgets.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No budgets set yet.';
    els.budgetsList.appendChild(empty);
    return;
  }

  for (const b of budgets) {
    const used = budgetUsage(b.limit, b.spent);
    const over = b.spent > b.limit;

    const row = document.createElement('div');
    row.className = 'budget-row';

    const head = document.createElement('div');
    head.className = 'budget-head';

    const name = document.createElement('span');
    name.className = 'budget-name';
    name.textContent = b.category;

    const figures = document.createElement('span');
    figures.className = 'budget-figures';
    figures.textContent = `${formatCurrency(b.spent)} / ${formatCurrency(b.limit)}`;

    head.append(
      name,
      figures,
      iconButton('🗑️', 'Remove budget', async () => {
        await api.deleteBudget(b.category);
        await refresh();
      }),
    );

    const bar = document.createElement('div');
    bar.className = 'progress';
    const fill = document.createElement('div');
    fill.className = `progress-fill${over ? ' progress-fill--over' : ''}`;
    fill.style.width = `${Math.min(used, 100)}%`;
    bar.appendChild(fill);

    const label = document.createElement('span');
    label.className = 'budget-pct';
    label.textContent = over
      ? `Over budget by ${formatCurrency(b.spent - b.limit)}`
      : `${used}% used`;

    row.append(head, bar, label);
    els.budgetsList.appendChild(row);
  }
}

// ---- refresh ---------------------------------------------------------------
async function refresh(): Promise<void> {
  try {
    const [txs, summary, budgets] = await Promise.all([
      api.listTransactions(),
      api.summary(),
      api.listBudgets(),
    ]);
    transactions = txs;

    els.summaryIncome.textContent = formatCurrency(summary.total_income);
    els.summaryExpenses.textContent = formatCurrency(summary.total_expenses);
    els.summaryBalance.textContent = formatCurrency(summary.balance);
    els.summaryBalance.classList.toggle('negative', summary.balance < 0);

    renderTransactions();
    renderBudgets(budgets);
    renderMonthlyChart(els.monthlyChart, transactions);
    renderCategoryChart(els.categoryChart, transactions);
    renderBudgetChart(els.budgetChart, budgets);
  } catch (err) {
    flash(els.appMessage, (err as Error).message);
  }
}

// ---- bootstrap -------------------------------------------------------------
async function init(): Promise<void> {
  setActiveTab('login');
  resetTxForm();
  try {
    const user = await api.me();
    await enterApp(user.username);
  } catch {
    // Not logged in — stay on the auth screen.
  }
}

void init();
