const { WebSocketServer } = require('ws');
const { authenticateUsername } = require('./auth');
const DocumentStore = require('./documentStore');

class EditorServer {
  constructor(server) {
    this.server = server;
    this.wss = new WebSocketServer({ server });
    this.documentStore = new DocumentStore();
    this.clients = new Map();
    this.heartbeatInterval = null;
    this.setup();
  }

  setup() {
    this.wss.on('connection', (ws) => {
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // start heartbeat interval if not already
      if (!this.heartbeatInterval) {
        this.heartbeatInterval = setInterval(() => {
          this.wss.clients.forEach((client) => {
            if (client.isAlive === false) return client.terminate();
            client.isAlive = false;
            client.ping();
          });
        }, 30000);
      }
      ws.on('message', (message) => this.handleMessage(ws, message));
      ws.on('close', () => this.handleClose(ws));
      ws.on('error', () => this.handleClose(ws));
    });
  }

  handleMessage(ws, message) {
    const payload = JSON.parse(message.toString());

    if (payload.type === 'auth') {
      try {
        const { username, sessionId } = authenticateUsername(payload.username);
        this.clients.set(ws, { username, sessionId });
        ws.send(JSON.stringify({ type: 'auth-success', username, sessionId }));
        this.broadcastPresence();
        this.broadcastDocumentState(ws);
      } catch (error) {
        ws.send(JSON.stringify({ type: 'auth-error', message: error.message }));
      }
      return;
    }

    const client = this.clients.get(ws);
    if (!client) {
      ws.send(JSON.stringify({ type: 'auth-error', message: 'Please authenticate first' }));
      return;
    }

    if (payload.type === 'update') {
      this.documentStore.setDocument('main', payload.content);
      this.broadcastToOthers(ws, JSON.stringify({ type: 'update', content: payload.content, username: client.username }));
      this.broadcastPresence();
      return;
    }

    if (payload.type === 'history') {
      ws.send(JSON.stringify({ type: 'history', history: this.documentStore.getHistory('main') }));
    }

    if (payload.type === 'revert') {
      try {
        const newContent = this.documentStore.revertToVersion('main', Number(payload.index));
        // broadcast updated document to everyone
        this.wss.clients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({ type: 'document', content: newContent, users: this.getPresence() }));
          }
        });
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    }
  }

  broadcastDocumentState(ws) {
    const content = this.documentStore.getDocument('main');
    ws.send(JSON.stringify({ type: 'document', content, users: this.getPresence() }));
  }

  broadcastPresence() {
    const presence = this.getPresence();
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: 'presence', users: presence }));
      }
    });
  }

  getPresence() {
    return Array.from(this.clients.values()).map((client) => client.username);
  }

  broadcastToOthers(ws, message) {
    this.wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === 1) {
        client.send(message);
      }
    });
  }

  handleClose(ws) {
    this.clients.delete(ws);
    this.broadcastPresence();
  }
}

module.exports = EditorServer;
