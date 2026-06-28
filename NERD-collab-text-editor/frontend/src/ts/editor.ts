import { io, Socket } from "socket.io-client";
import { createDoc, getDoc, getDocs, getHistory, restoreSnapshot, setToken } from "./api";
import type { DocumentModel, Snapshot } from "./types";

const documentList = document.getElementById("documentList") as HTMLDivElement;
const editor = document.getElementById("editor") as HTMLDivElement;
const docTitle = document.getElementById("docTitle") as HTMLInputElement;
const saveSnapshotButton = document.getElementById("saveSnapshotButton") as HTMLButtonElement;
const createDocButton = document.getElementById("createDocButton") as HTMLButtonElement;
const toggleHistoryButton = document.getElementById("toggleHistoryButton") as HTMLButtonElement;
const historyPanel = document.getElementById("historyPanel") as HTMLDivElement;
const snapshotList = document.getElementById("snapshotList") as HTMLUListElement;
const collaboratorList = document.getElementById("collaboratorList") as HTMLUListElement;
const notification = document.getElementById("notification") as HTMLDivElement;

let token = sessionStorage.getItem("nerd-jwt") || "";
setToken(token);
let socket: Socket;
let currentDoc: DocumentModel | null = null;
let reconnectAttempts = 0;
let collaborators: Set<string> = new Set();

function showNotification(message: string) {
  notification.textContent = message;
  notification.classList.remove("hidden");
  setTimeout(() => notification.classList.add("hidden"), 4000);
}

function buildDocCard(doc: DocumentModel) {
  const card = document.createElement("button");
  card.className = "document-card";
  card.textContent = doc.title;
  card.addEventListener("click", () => openDocument(doc));
  return card;
}

async function refreshDocuments() {
  try {
    const docs = await getDocs();
    documentList.innerHTML = "";
    docs.forEach((doc) => documentList.appendChild(buildDocCard(doc)));
  } catch (error: any) {
    showNotification(error.body?.detail || "Could not load documents.");
  }
}

function updateCollaboratorList() {
  collaboratorList.innerHTML = "";
  collaborators.forEach((username) => {
    const item = document.createElement("li");
    item.textContent = username;
    collaboratorList.appendChild(item);
  });
}

function renderHistory(items: Snapshot[]) {
  snapshotList.innerHTML = "";
  items.forEach((snapshot) => {
    const item = document.createElement("li");
    item.innerHTML = `<div><strong>${snapshot.saved_by}</strong> - ${new Date(snapshot.saved_at).toLocaleString()}</div>`;
    const restoreButton = document.createElement("button");
    restoreButton.textContent = "Restore";
    restoreButton.addEventListener("click", async () => {
      if (!currentDoc) return;
      const confirmRestore = confirm("Restore this snapshot? This will replace current content.");
      if (!confirmRestore) return;
      await restoreSnapshot(currentDoc.id, snapshot.snapshot_id);
      const doc = await getDoc(currentDoc.id);
      currentDoc = doc;
      editor.textContent = doc.content;
      showNotification("Snapshot restored.");
    });
    item.appendChild(restoreButton);
    snapshotList.appendChild(item);
  });
}

async function loadHistory() {
  if (!currentDoc) return;
  const history = await getHistory(currentDoc.id);
  renderHistory(history);
}

function connectSocket() {
  socket = io("", {
    auth: { token },
    transports: ["websocket"],
    reconnectionAttempts: 5,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect_error", (error) => {
    showNotification("Socket connection failed.");
  });

  socket.on("disconnect", () => {
    reconnectAttempts += 1;
    showNotification("Disconnected. Reconnecting...");
  });

  socket.on("user_joined", (data) => {
    collaborators.add(data.user_id);
    updateCollaboratorList();
  });

  socket.on("user_left", (data) => {
    collaborators.delete(data.user_id);
    updateCollaboratorList();
  });

  socket.on("text_update", (data) => {
    if (currentDoc && data.doc_id === currentDoc.id) {
      editor.textContent = data.content;
    }
  });

  socket.on("snapshot_saved", () => {
    loadHistory();
  });
}

function debounce(fn: (...args: any[]) => void, delay: number) {
  let timer: number;
  return (...args: any[]) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

const emitTextChange = debounce(() => {
  if (!currentDoc) return;
  socket.emit("text_change", {
    doc_id: currentDoc.id,
    delta: editor.textContent || "",
    cursor_position: window.getSelection()?.focusOffset || 0,
  });
}, 50);

function sendCursorMove() {
  if (!currentDoc) return;
  socket.emit("cursor_move", {
    doc_id: currentDoc.id,
    cursor_position: window.getSelection()?.focusOffset || 0,
  });
}

async function openDocument(doc: DocumentModel) {
  currentDoc = doc;
  docTitle.value = doc.title;
  editor.textContent = doc.content;
  collaborators = new Set([doc.owner_id, ...doc.collaborators]);
  updateCollaboratorList();
  loadHistory();
  socket.emit("join_document", { doc_id: doc.id });
}

createDocButton.addEventListener("click", async () => {
  const title = prompt("Document title")?.trim();
  if (!title) {
    return;
  }
  try {
    const doc = await createDoc(title, "", []);
    await refreshDocuments();
    openDocument(doc);
  } catch (error: any) {
    showNotification(error.body?.detail || "Could not create document.");
  }
});

saveSnapshotButton.addEventListener("click", () => {
  if (!currentDoc) return;
  socket.emit("save_snapshot", { doc_id: currentDoc.id });
});

toggleHistoryButton.addEventListener("click", () => {
  historyPanel.classList.toggle("hidden");
});

editor.addEventListener("input", emitTextChange);
editor.addEventListener("keyup", sendCursorMove);

connectSocket();
refreshDocuments();
