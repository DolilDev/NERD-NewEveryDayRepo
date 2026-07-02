const http = require('http');
const EditorServer = require('../src/server');

function createMockWs() {
  const sends = [];
  return {
    send: (m) => sends.push(m),
    getSends: () => sends,
    readyState: 1,
    isAlive: true,
    ping: () => {},
  };
}

describe('EditorServer handleMessage', () => {
  let server;
  beforeEach(() => {
    const appServer = http.createServer();
    server = new EditorServer(appServer);
  });

  test('auth then update broadcasts to others (simulated)', () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();
    // simulate two clients
    server.clients.set(ws1, { username: 'Alice', sessionId: 's1' });
    server.clients.set(ws2, { username: 'Bob', sessionId: 's2' });
    // also register them in the wss clients set so broadcastToOthers sees them
    server.wss.clients.add(ws1);
    server.wss.clients.add(ws2);

    // ws1 updates document using current server version
    const currentVersion = server.documentStore.getVersion('main');
    server.handleMessage(ws1, JSON.stringify({ type: 'update', content: 'Hello from Alice', version: currentVersion }));

    // ws2 should have received an update message when server.broadcastToOthers is used
    const sends = ws2.getSends();
    const found = sends.some((m) => m.includes('Hello from Alice'));
    expect(found).toBe(true);
  });

  test('handles history request', () => {
    const ws = createMockWs();
    server.clients.set(ws, { username: 'Alice', sessionId: 's1' });
    server.handleMessage(ws, JSON.stringify({ type: 'history' }));
    const sends = ws.getSends();
    expect(sends.some((m) => m.includes('history'))).toBe(true);
  });
});
