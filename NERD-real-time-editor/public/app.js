const editor = document.getElementById('editor');
const usernameInput = document.getElementById('username');
const connectButton = document.getElementById('connect');
const presenceList = document.getElementById('presence');
const historyList = document.getElementById('history');
const status = document.getElementById('status');
let socket = null;
let currentUser = '';

function setStatus(message) {
  status.textContent = message;
}

function renderPresence(users) {
  presenceList.innerHTML = users.length ? users.map((user) => `<li>${user}</li>`).join('') : '<li>No active users</li>';
}

function renderHistory(history) {
  historyList.innerHTML = history.map((entry, index) => `<li>Version ${index + 1}: ${entry.slice(0, 40)}${entry.length > 40 ? '…' : ''}</li>`).join('');
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
      }
    }
  });

  socket.addEventListener('close', () => {
    setStatus('Disconnected');
  });
}

connectButton.addEventListener('click', connect);
editor.addEventListener('input', () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'update', content: editor.value }));
  }
});

document.getElementById('history-btn').addEventListener('click', () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'history' }));
  }
});
