const editor = document.getElementById('editor');
const usernameInput = document.getElementById('username');
const connectButton = document.getElementById('connect');
const presenceList = document.getElementById('presence');
const historyList = document.getElementById('history');
const status = document.getElementById('status');
let socket = null;
let currentUser = '';
let reconnectAttempts = 0;
let reconnectTimer = null;
let lastKnownVersion = 0;

function setStatus(message) {
  status.textContent = message;
}

function renderPresence(users) {
  presenceList.innerHTML = users.length ? users.map((user) => `<li>${user}</li>`).join('') : '<li>No active users</li>';
}

function renderHistory(history) {
  historyList.innerHTML = history.map((entry, index) => `<li data-index="${index}"><button class="revert" data-index="${index}">Revert to v${index + 1}</button> Version ${index + 1}: ${entry.slice(0, 40)}${entry.length > 40 ? '…' : ''}</li>`).join('');
  Array.from(historyList.querySelectorAll('.revert')).forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      const idx = ev.target.getAttribute('data-index');
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'revert', index: idx }));
      }
    });
  });
}

function connect() {
  const username = usernameInput.value.trim();
  if (!username) {
    setStatus('Enter a username to join');
    return;
  }

  currentUser = username;
  socket = new WebSocket(`ws://${location.host}`);
  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ type: 'auth', username }));
    setStatus(`Connected as ${username}`);
  });

  socket.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data);

    if (payload.type === 'auth-success') {
      setStatus(`Signed in as ${payload.username}`);
        // after auth, request document state implicitly handled by server
      return;
    }

    if (payload.type === 'auth-error') {
      setStatus(payload.message);
      return;
    }

    if (payload.type === 'presence') {
      renderPresence(payload.users);
      return;
    }

    if (payload.type === 'document') {
      editor.value = payload.content;
      lastKnownVersion = payload.version || 0;
      renderPresence(payload.users);
      return;
    }

    if (payload.type === 'history') {
      renderHistory(payload.history);
      return;
    }

    if (payload.type === 'update') {
      if (payload.username !== currentUser) {
        editor.value = payload.content;
        lastKnownVersion = payload.version || lastKnownVersion;
      }
    }

    if (payload.type === 'sync') {
      // server indicates we are out of sync
      editor.value = payload.content;
      lastKnownVersion = payload.version || 0;
      setStatus('Synchronized with server');
    }

    if (payload.type === 'ack') {
      lastKnownVersion = payload.version || lastKnownVersion;
    }
  });

  socket.addEventListener('close', () => {
    setStatus('Disconnected');
    scheduleReconnect();
  });
}

connectButton.addEventListener('click', connect);
editor.addEventListener('input', () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'update', content: editor.value, version: lastKnownVersion }));
  }
});

document.getElementById('history-btn').addEventListener('click', () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'history' }));
  }
});

function scheduleReconnect() {
  if (!currentUser) return;
  reconnectAttempts += 1;
  const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts));
  setStatus(`Reconnecting in ${Math.round(delay/1000)}s...`);
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    connect();
  }, delay);
}

// Formatting helpers
function wrapSelection(wrapper) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const selected = editor.value.slice(start, end);
  const before = editor.value.slice(0, start);
  const after = editor.value.slice(end);
  const newText = before + wrapper + selected + wrapper + after;
  editor.value = newText;
  editor.focus();
}

document.getElementById('bold-btn').addEventListener('click', () => wrapSelection('**'));
document.getElementById('italic-btn').addEventListener('click', () => wrapSelection('*'));
