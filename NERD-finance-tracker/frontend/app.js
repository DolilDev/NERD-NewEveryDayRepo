"use strict";

/* ============================================================
 * Personal Finance Tracker — frontend logic
 * All requests go to the same origin with credentials so the
 * Flask session cookie is sent automatically (no CORS).
 * ============================================================ */

const API = "/api";

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
 * Reload all user data. Expanded in later steps (transactions, summary,
 * charts); defined here so the auth flow has something to call.
 */
async function refresh() {
  /* populated in later steps */
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
  checkSession();
}

document.addEventListener("DOMContentLoaded", init);
