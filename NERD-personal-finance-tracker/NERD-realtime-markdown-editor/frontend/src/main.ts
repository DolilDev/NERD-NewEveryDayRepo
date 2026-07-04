// Client entry point: renders Markdown locally and keeps the document in sync
// with other clients over Socket.IO using a cursor-safe, typing-locked strategy,
// with connection-loss feedback, offline editing and localStorage persistence.
import { io } from "socket.io-client";

import { renderMarkdown } from "./markdown";
import { loadDocument, saveDocument } from "./storage";
import { applyRemote, debounce, RemoteBuffer } from "./sync";

const ROOM = "main";
const STORAGE_KEY = `nerd-md:${ROOM}`;
const USERNAME_KEY = "nerd-md:username";
const DEBOUNCE_MS = 150; // throttle outgoing edits
const TYPING_LOCK_MS = 400; // hold remote updates while actively typing

const textarea = document.getElementById("markdown-input") as HTMLTextAreaElement;
const preview = document.getElementById("preview") as HTMLElement;
const statusEl = document.getElementById("status") as HTMLElement;
const collaboratorsEl = document.getElementById("collaborators") as HTMLElement;

function updatePreview(): void {
  preview.innerHTML = renderMarkdown(textarea.value);
}

/** Resolve (and remember) a display name, prompting once if needed. */
function resolveUsername(): string {
  const saved = loadDocument(USERNAME_KEY);
  if (saved !== null && saved.trim() !== "") return saved;
  const entered =
    typeof window !== "undefined" && typeof window.prompt === "function"
      ? window.prompt("Choose a display name", "")
      : null;
  const name = (entered ?? "").trim() || "Anonymous";
  saveDocument(USERNAME_KEY, name);
  return name;
}

/** Render the active collaborator roster (textContent — no HTML injection). */
function renderCollaborators(names: string[]): void {
  collaboratorsEl.innerHTML = "";
  for (const name of names) {
    const item = document.createElement("li");
    item.className = "collaborators__item";
    item.textContent = name;
    collaboratorsEl.appendChild(item);
  }
}

const username = resolveUsername();

/** Persist the current document locally (best-effort). */
function persist(): void {
  saveDocument(STORAGE_KEY, textarea.value);
}

// Restore any locally-persisted document before connecting.
const restored = loadDocument(STORAGE_KEY);
if (restored !== null) {
  textarea.value = restored;
}

// --- connection status banner --------------------------------------------
type ConnState = "connected" | "reconnecting" | "offline";
const STATUS_LABEL: Record<ConnState, string> = {
  connected: "Connected",
  reconnecting: "Reconnecting…",
  offline: "Offline",
};
function setStatus(state: ConnState): void {
  statusEl.className = `status status--${state}`;
  statusEl.textContent = STATUS_LABEL[state];
}

const socket = io();

// --- cursor-safe remote application --------------------------------------
function applyRemoteContent(content: string): void {
  if (content === textarea.value) return;
  const next = applyRemote(
    textarea.value,
    textarea.selectionStart ?? 0,
    textarea.selectionEnd ?? 0,
    content,
  );
  textarea.value = next.value;
  textarea.setSelectionRange(next.selStart, next.selEnd);
  updatePreview();
  persist();
}

const remoteBuffer = new RemoteBuffer({
  lockMs: TYPING_LOCK_MS,
  onApply: applyRemoteContent,
});

// Track edits made while disconnected so we can flush them once back online.
let editedWhileOffline = false;
// The first server snapshot after load is reconciled against restored content.
let initialSyncPending = true;

const emitUpdate = debounce((content: string) => {
  if (socket.connected) {
    socket.emit("doc:update", { room: ROOM, content });
  } else {
    // The textarea already holds the latest content; flush it on reconnect.
    editedWhileOffline = true;
  }
}, DEBOUNCE_MS);

textarea.addEventListener("input", () => {
  updatePreview();
  persist();
  remoteBuffer.keystroke(); // engage typing lock
  emitUpdate(textarea.value); // debounced broadcast (or queue while offline)
});

// --- connection lifecycle -------------------------------------------------
socket.on("connect", () => {
  setStatus("connected");
  socket.emit("join", { room: ROOM, name: username }); // (re)join with identity
});

socket.on("users", (data: { users?: string[] }) => {
  if (Array.isArray(data?.users)) renderCollaborators(data.users);
});

socket.on("doc:sync", (data: { content?: string }) => {
  if (typeof data?.content !== "string") return;
  const server = data.content;

  if (initialSyncPending) {
    // First snapshot after load: reconcile restored content with the server.
    initialSyncPending = false;
    editedWhileOffline = false;
    if (server.length > 0) {
      // Server holds the shared document -> adopt it (cursor-safe).
      remoteBuffer.receive(server);
    } else if (textarea.value.length > 0) {
      // Fresh server, but we restored a local doc -> repopulate the server.
      socket.emit("doc:update", { room: ROOM, content: textarea.value });
      persist();
    }
    return;
  }

  if (editedWhileOffline && server !== textarea.value) {
    // We edited while offline; our content is newer (last-write-wins). Push it
    // so the server catches up, and keep the local text on screen.
    editedWhileOffline = false;
    socket.emit("doc:update", { room: ROOM, content: textarea.value });
    updatePreview();
  } else {
    editedWhileOffline = false;
    remoteBuffer.receive(server); // accept server content via cursor-safe path
  }
});

socket.on("disconnect", () => {
  setStatus("reconnecting"); // socket.io retries automatically
});

socket.on("connect_error", () => {
  setStatus("reconnecting");
});

socket.io.on("reconnect_failed", () => {
  setStatus("offline");
});

// Initial paint (handles restored / pre-filled content).
updatePreview();
