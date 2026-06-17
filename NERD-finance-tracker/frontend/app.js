"use strict";

/* ============================================================
 * Personal Finance Tracker — frontend logic
 * All requests go to the same origin with credentials so the
 * Flask session cookie is sent automatically (no CORS).
 * ============================================================ */

const API = "/api";

/** In-memory copy of the current user's transactions (drives the charts). */
const state = { transactions: [] };

/** Id of the transaction currently being edited, or null when adding. */
let editingId = null;

/** Error carrying an HTTP status so callers can react to it. */
class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/**
 * Thin fetch wrapper: always sends the session cookie, parses JSON,
 * and turns non-2xx responses / network failures into ApiError.
 */
async function api(path, { method = "GET", body } = {}) {
  const options = { method, credentials: "include", headers: {} };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(API + path, options);
  } catch (err) {
    throw new ApiError("Could not connect to the server.", 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  if (!res.ok) {
    const message = (data && data.error) || "Something went wrong.";
    throw new ApiError(message, res.status);
  }
  return data;
}

/* ---------- Message helpers ---------- */
function showMessage(el, text, type = "error") {
  el.textContent = text;
  el.className = `message ${type}`;
  el.classList.remove("hidden");
}

function hideMessage(el) {
  el.classList.add("hidden");
}

/* ---------- Element references ---------- */
const els = {};

function cacheElements() {
  const ids = [
    "auth-section", "app-section", "user-bar", "current-username",
    "tab-login", "tab-register", "login-form", "register-form",
    "login-username", "login-password", "register-username",
    "register-password", "auth-message", "app-message", "logout-btn",
    "transaction-form", "form-title", "tx-id", "tx-type", "tx-amount",
    "tx-category", "tx-date", "tx-description", "tx-submit", "tx-cancel",
    "form-error", "transactions-body", "empty-state",
  ];
  ids.forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

/* ---------- View toggling ---------- */
function showApp(user) {
  els["current-username"].textContent = user.username;
  els["auth-section"].classList.add("hidden");
  els["app-section"].classList.remove("hidden");
  els["user-bar"].classList.remove("hidden");
  refresh();
}

function showAuth() {
  els["app-section"].classList.add("hidden");
  els["user-bar"].classList.add("hidden");
  els["auth-section"].classList.remove("hidden");
}

/**
 * Reload all user data. Summary and charts are added in later steps.
 */
async function refresh() {
  try {
    await loadTransactions();
  } catch (err) {
    showMessage(els["app-message"], err.message);
  }
}

/* ---------- Transactions: load & render ---------- */
function formatMoney(value) {
  return Number(value).toFixed(2);
}

function makeCell(text, className) {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

async function loadTransactions() {
  const transactions = await api("/transactions");
  state.transactions = transactions;
  renderTransactions(transactions);
}

function renderTransactions(transactions) {
  const tbody = els["transactions-body"];
  tbody.innerHTML = "";

  if (!transactions.length) {
    els["empty-state"].classList.remove("hidden");
    return;
  }
  els["empty-state"].classList.add("hidden");

  for (const tx of transactions) {
    const tr = document.createElement("tr");

    tr.appendChild(makeCell(tx.date));

    const typeTd = document.createElement("td");
    const pill = document.createElement("span");
    pill.className = `type-pill ${tx.type}`;
    pill.textContent = tx.type;
    typeTd.appendChild(pill);
    tr.appendChild(typeTd);

    tr.appendChild(makeCell(tx.category));

    const sign = tx.type === "income" ? "+" : "-";
    const amountClass =
      tx.type === "income" ? "amount-income" : "amount-expense";
    tr.appendChild(makeCell(`${sign}${formatMoney(tx.amount)}`, `num ${amountClass}`));

    const actionsTd = document.createElement("td");
    actionsTd.className = "num";
    const actions = document.createElement("div");
    actions.className = "row-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-link";
    editBtn.textContent = "Edit";
    editBtn.dataset.action = "edit";
    editBtn.dataset.id = tx.id;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-danger";
    deleteBtn.textContent = "Delete";
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.id = tx.id;

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    actionsTd.appendChild(actions);
    tr.appendChild(actionsTd);

    tbody.appendChild(tr);
  }
}

/* ---------- Transactions: form (create / update) ---------- */
function validateTransactionForm() {
  const type = els["tx-type"].value;
  const amount = els["tx-amount"].value;
  const category = els["tx-category"].value.trim();
  const date = els["tx-date"].value;

  if (type !== "income" && type !== "expense") {
    return "Please choose a transaction type.";
  }
  if (amount === "" || isNaN(Number(amount)) || Number(amount) <= 0) {
    return "Amount must be a number greater than 0.";
  }
  if (!category) {
    return "Category is required.";
  }
  if (!date) {
    return "Please choose a date.";
  }
  return null;
}

function showFormError(text) {
  els["form-error"].textContent = text;
  els["form-error"].className = "form-error";
  els["form-error"].classList.remove("hidden");
}

function resetForm() {
  editingId = null;
  els["transaction-form"].reset();
  els["tx-id"].value = "";
  els["form-title"].textContent = "Add transaction";
  els["tx-submit"].textContent = "Add";
  els["tx-cancel"].classList.add("hidden");
  hideMessage(els["form-error"]);
}

function startEdit(tx) {
  editingId = tx.id;
  els["tx-id"].value = tx.id;
  els["tx-type"].value = tx.type;
  els["tx-amount"].value = tx.amount;
  els["tx-category"].value = tx.category;
  els["tx-date"].value = tx.date;
  els["tx-description"].value = tx.description || "";
  els["form-title"].textContent = "Edit transaction";
  els["tx-submit"].textContent = "Save changes";
  els["tx-cancel"].classList.remove("hidden");
  hideMessage(els["form-error"]);
  els["tx-amount"].focus();
}

async function submitTransaction(event) {
  event.preventDefault();
  hideMessage(els["form-error"]);

  const error = validateTransactionForm();
  if (error) {
    showFormError(error);
    return;
  }

  const payload = {
    type: els["tx-type"].value,
    amount: Number(els["tx-amount"].value),
    category: els["tx-category"].value.trim(),
    date: els["tx-date"].value,
    description: els["tx-description"].value.trim() || null,
  };

  try {
    if (editingId) {
      await api(`/transactions/${editingId}`, { method: "PUT", body: payload });
    } else {
      await api("/transactions", { method: "POST", body: payload });
    }
    resetForm();
    await refresh();
  } catch (err) {
    showFormError(err.message);
  }
}

async function deleteTransaction(id) {
  if (!window.confirm("Delete this transaction?")) return;
  try {
    await api(`/transactions/${id}`, { method: "DELETE" });
    if (editingId === id) resetForm();
    await refresh();
  } catch (err) {
    showMessage(els["app-message"], err.message);
  }
}

/* ---------- Transactions UI wiring ---------- */
function wireTransactions() {
  els["transaction-form"].addEventListener("submit", submitTransaction);
  els["tx-cancel"].addEventListener("click", resetForm);

  els["transactions-body"].addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.action === "edit") {
      const tx = state.transactions.find((t) => t.id === id);
      if (tx) startEdit(tx);
    } else if (btn.dataset.action === "delete") {
      deleteTransaction(id);
    }
  });
}

/* ---------- Auth actions ---------- */
async function checkSession() {
  try {
    const user = await api("/me");
    showApp(user);
  } catch (err) {
    // 401 simply means "not logged in" — show the auth screen.
    showAuth();
  }
}

async function login(username, password) {
  hideMessage(els["auth-message"]);
  try {
    const user = await api("/login", {
      method: "POST",
      body: { username, password },
    });
    showApp(user);
  } catch (err) {
    showMessage(els["auth-message"], err.message);
  }
}

async function register(username, password) {
  hideMessage(els["auth-message"]);
  try {
    const user = await api("/register", {
      method: "POST",
      body: { username, password },
    });
    showApp(user);
  } catch (err) {
    showMessage(els["auth-message"], err.message);
  }
}

async function logout() {
  try {
    await api("/logout", { method: "POST" });
  } catch (err) {
    /* ignore — we clear the UI regardless */
  }
  showAuth();
}

/* ---------- Auth UI wiring ---------- */
function switchTab(toRegister) {
  els["tab-login"].classList.toggle("active", !toRegister);
  els["tab-register"].classList.toggle("active", toRegister);
  els["login-form"].classList.toggle("hidden", toRegister);
  els["register-form"].classList.toggle("hidden", !toRegister);
  hideMessage(els["auth-message"]);
}

function wireAuth() {
  els["tab-login"].addEventListener("click", () => switchTab(false));
  els["tab-register"].addEventListener("click", () => switchTab(true));

  els["login-form"].addEventListener("submit", (e) => {
    e.preventDefault();
    const username = els["login-username"].value.trim();
    const password = els["login-password"].value;
    if (!username || !password) {
      showMessage(els["auth-message"], "Username and password are required.");
      return;
    }
    login(username, password);
  });

  els["register-form"].addEventListener("submit", (e) => {
    e.preventDefault();
    const username = els["register-username"].value.trim();
    const password = els["register-password"].value;
    if (!username || !password) {
      showMessage(els["auth-message"], "Username and password are required.");
      return;
    }
    register(username, password);
  });

  els["logout-btn"].addEventListener("click", logout);
}

/* ---------- Bootstrap ---------- */
function init() {
  cacheElements();
  wireAuth();
  wireTransactions();
  checkSession();
}

document.addEventListener("DOMContentLoaded", init);
