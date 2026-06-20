// Client entry point: renders Markdown locally and keeps the document in sync
// with other clients over Socket.IO using a cursor-safe, typing-locked strategy,
// with explicit connection-loss feedback and offline editing.
import { io } from "socket.io-client";

import { renderMarkdown } from "./markdown";
import { applyRemote, debounce, RemoteBuffer } from "./sync";

const ROOM = "main";
const DEBOUNCE_MS = 150; // throttle outgoing edits
const TYPING_LOCK_MS = 400; // hold remote updates while actively typing

const textarea = document.getElementById("markdown-input") as HTMLTextAreaElement;
const preview = document.getElementById("preview") as HTMLElement;
const statusEl = document.getElementById("status") as HTMLElement;

function updatePreview(): void {
  preview.innerHTML = renderMarkdown(textarea.value);
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
}

const remoteBuffer = new RemoteBuffer({
  lockMs: TYPING_LOCK_MS,
  onApply: applyRemoteContent,
});

// Track edits made while disconnected so we can flush them once back online.
let editedWhileOffline = false;

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
  remoteBuffer.keystroke(); // engage typing lock
  emitUpdate(textarea.value); // debounced broadcast (or queue while offline)
});

// --- connection lifecycle -------------------------------------------------
socket.on("connect", () => {
  setStatus("connected");
  socket.emit("join", { room: ROOM }); // (re)join after connect or reconnect
});

socket.on("doc:sync", (data: { content?: string }) => {
  if (typeof data?.content !== "string") return;
  const server = data.content;
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

// Initial paint (handles any pre-filled content).
updatePreview();
