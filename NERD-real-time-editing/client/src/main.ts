import { EditorState, Transaction } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { ApiClient, ApiError } from './api';
import { CollabSession, WebSocketFactory } from './collab';
import { DocumentSnapshot, TextChange } from './types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
const WS_URL = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:4000/ws';

const api = new ApiClient(API_BASE_URL);

let session: CollabSession | null = null;
let editorView: EditorView | null = null;
let authToken: string | null = null;
let currentDocId: string | null = null;
let localVersion = 0;

const app = document.getElementById('app')!;

function renderAuthScreen(): void {
  app.innerHTML = `
    <div class="auth-card">
      <h1>Collaborative Editor</h1>
      <form id="auth-form">
        <input id="username" placeholder="Username" autocomplete="username" required />
        <input id="password" type="password" placeholder="Password" autocomplete="current-password" required />
        <div class="auth-actions">
          <button type="submit" id="login-btn">Log in</button>
          <button type="button" id="register-btn">Register</button>
        </div>
        <p id="auth-error" class="error"></p>
      </form>
    </div>
  `;

  const form = document.getElementById('auth-form') as HTMLFormElement;
  const errorEl = document.getElementById('auth-error')!;

  const submit = async (mode: 'login' | 'register') => {
    errorEl.textContent = '';
    const username = (document.getElementById('username') as HTMLInputElement).value.trim();
    const password = (document.getElementById('password') as HTMLInputElement).value;
    try {
      const result = mode === 'login' ? await api.login(username, password) : await api.register(username, password);
      authToken = result.token;
      await renderDocumentList();
    } catch (err) {
      errorEl.textContent = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
    }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submit('login');
  });
  document.getElementById('register-btn')!.addEventListener('click', () => submit('register'));
}

async function renderDocumentList(): Promise<void> {
  if (!authToken) return renderAuthScreen();

  let docs;
  try {
    docs = await api.listDocuments(authToken);
  } catch {
    authToken = null;
    return renderAuthScreen();
  }

  app.innerHTML = `
    <div class="doc-list">
      <h1>Your documents</h1>
      <ul id="docs"></ul>
      <form id="new-doc-form">
        <input id="new-doc-title" placeholder="New document title" required />
        <button type="submit">Create</button>
      </form>
    </div>
  `;

  const list = document.getElementById('docs')!;
  for (const doc of docs) {
    const li = document.createElement('li');
    li.textContent = `${doc.title} (v${doc.version})`;
    li.addEventListener('click', () => openDocument(doc.id));
    list.appendChild(li);
  }

  document.getElementById('new-doc-form')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = (document.getElementById('new-doc-title') as HTMLInputElement).value.trim();
    if (!authToken) return;
    const doc = await api.createDocument(authToken, title);
    openDocument(doc.id);
  });
}

function openDocument(docId: string): void {
  if (!authToken) return;
  currentDocId = docId;
  localVersion = 0;

  app.innerHTML = `
    <div class="editor-page">
      <div class="toolbar">
        <button id="back-btn">&larr; Documents</button>
        <span id="status" class="status">Connecting...</span>
        <select id="history-select"><option value="">Version history</option></select>
        <button id="revert-btn" disabled>Revert to selected</button>
      </div>
      <div id="editor"></div>
    </div>
  `;

  document.getElementById('back-btn')!.addEventListener('click', () => {
    session?.disconnect();
    session = null;
    editorView?.destroy();
    editorView = null;
    renderDocumentList();
  });

  const wsFactory: WebSocketFactory = (url) => new WebSocket(url) as unknown as any;
  session = new CollabSession(WS_URL, authToken, wsFactory, {
    onConnectionStateChange: (state) => setStatus(state),
    onJoined: (content, version, history) => {
      localVersion = version;
      mountEditor(content);
      populateHistory(history);
    },
    onRemoteEdit: (changes, version) => {
      localVersion = version;
      applyRemoteChanges(changes);
    },
    onReverted: (content, version, history) => {
      localVersion = version;
      replaceEditorContent(content);
      populateHistory(history);
    },
    onError: (message) => setStatus(`Error: ${message}`),
    onPeerJoined: (username) => setStatus(`${username} joined`),
    onPeerLeft: (username) => setStatus(`${username} left`),
  });

  session.connect(docId);

  document.getElementById('revert-btn')!.addEventListener('click', () => {
    const select = document.getElementById('history-select') as HTMLSelectElement;
    const version = Number(select.value);
    if (!Number.isNaN(version) && select.value !== '') {
      session?.sendRevert(version);
    }
  });

  document.getElementById('history-select')!.addEventListener('change', (e) => {
    const revertBtn = document.getElementById('revert-btn') as HTMLButtonElement;
    revertBtn.disabled = (e.target as HTMLSelectElement).value === '';
  });
}

function setStatus(text: string): void {
  const el = document.getElementById('status');
  if (el) el.textContent = text;
}

function populateHistory(history: DocumentSnapshot[]): void {
  const select = document.getElementById('history-select') as HTMLSelectElement | null;
  if (!select) return;
  select.innerHTML = '<option value="">Version history</option>';
  for (const snapshot of [...history].reverse()) {
    const opt = document.createElement('option');
    opt.value = String(snapshot.version);
    opt.textContent = `v${snapshot.version} — ${snapshot.author} — ${new Date(snapshot.timestamp).toLocaleTimeString()}`;
    select.appendChild(opt);
  }
}

function mountEditor(initialContent: string): void {
  const parent = document.getElementById('editor')!;
  parent.innerHTML = '';

  const state = EditorState.create({
    doc: initialContent,
    extensions: [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        // Skip re-broadcasting changes that originated remotely.
        const isRemote = update.transactions.some((tr) => tr.annotation(Transaction.userEvent) === 'remote');
        if (isRemote) return;

        const changes: TextChange[] = [];
        update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
          changes.push({ from: fromA, to: toA, insert: inserted.toString() });
        });
        if (changes.length > 0) {
          session?.sendEdit(localVersion, changes);
        }
      }),
    ],
  });

  editorView = new EditorView({ state, parent });
}

function applyRemoteChanges(changes: TextChange[]): void {
  if (!editorView) return;
  editorView.dispatch({
    changes: changes.map((c) => ({ from: c.from, to: c.to, insert: c.insert })),
    annotations: Transaction.userEvent.of('remote'),
  });
}

function replaceEditorContent(content: string): void {
  if (!editorView) return;
  editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: content },
    annotations: Transaction.userEvent.of('remote'),
  });
}

renderAuthScreen();
