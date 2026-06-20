// Client entry point: renders Markdown locally and keeps the document in sync
// with other clients over Socket.IO using a cursor-safe, typing-locked strategy.
import { io } from "socket.io-client";

import { renderMarkdown } from "./markdown";
import { applyRemote, debounce, RemoteBuffer } from "./sync";

const ROOM = "main";
const DEBOUNCE_MS = 150; // throttle outgoing edits
const TYPING_LOCK_MS = 400; // hold remote updates while actively typing

const textarea = document.getElementById("markdown-input") as HTMLTextAreaElement;
const preview = document.getElementById("preview") as HTMLElement;

function updatePreview(): void {
  preview.innerHTML = renderMarkdown(textarea.value);
}

const socket = io();

/** Apply remote content to the textarea without jumping the caret. */
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

const emitUpdate = debounce((content: string) => {
  socket.emit("doc:update", { room: ROOM, content });
}, DEBOUNCE_MS);

textarea.addEventListener("input", () => {
  updatePreview();
  remoteBuffer.keystroke(); // engage typing lock
  emitUpdate(textarea.value); // debounced broadcast
});

socket.on("connect", () => {
  socket.emit("join", { room: ROOM });
});

socket.on("doc:sync", (data: { content?: string }) => {
  if (typeof data?.content === "string") {
    remoteBuffer.receive(data.content);
  }
});

// Initial paint (handles any pre-filled content).
updatePreview();
