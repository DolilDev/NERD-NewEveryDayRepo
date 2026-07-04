import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollabSession, WebSocketLike } from '../src/collab';

class FakeWebSocket implements WebSocketLike {
  static instances: FakeWebSocket[] = [];
  readyState = 0; // CONNECTING
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  sent: string[] = [];

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3; // CLOSED
    this.onclose?.();
  }

  simulateOpen(): void {
    this.readyState = 1; // OPEN
    this.onopen?.();
  }

  simulateMessage(payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  simulateAbruptClose(): void {
    this.readyState = 3;
    this.onclose?.();
  }
}

function makeSession(handlers: Record<string, any>) {
  FakeWebSocket.instances = [];
  const factory = (url: string) => new FakeWebSocket(url);
  const session = new CollabSession('ws://localhost:4000/ws', 'fake-token', factory, handlers);
  return session;
}

beforeEach(() => {
  vi.useFakeTimers();
});

describe('CollabSession', () => {
  it('joins a document once the socket opens', () => {
    const session = makeSession({});
    session.connect('doc-1');
    const socket = FakeWebSocket.instances[0];
    socket.simulateOpen();

    expect(socket.sent).toHaveLength(1);
    expect(JSON.parse(socket.sent[0])).toEqual({ type: 'join', docId: 'doc-1' });
  });

  it('invokes onJoined with the server-provided content and version', () => {
    const onJoined = vi.fn();
    const session = makeSession({ onJoined });
    session.connect('doc-1');
    const socket = FakeWebSocket.instances[0];
    socket.simulateOpen();
    socket.simulateMessage({ type: 'joined', docId: 'doc-1', content: 'hello', version: 3, history: [] });

    expect(onJoined).toHaveBeenCalledWith('hello', 3, []);
  });

  it('forwards remote edits to onRemoteEdit', () => {
    const onRemoteEdit = vi.fn();
    const session = makeSession({ onRemoteEdit });
    session.connect('doc-1');
    const socket = FakeWebSocket.instances[0];
    socket.simulateOpen();
    socket.simulateMessage({
      type: 'remote-edit',
      docId: 'doc-1',
      changes: [{ from: 0, to: 0, insert: 'x' }],
      version: 2,
      author: 'bob',
    });

    expect(onRemoteEdit).toHaveBeenCalledWith([{ from: 0, to: 0, insert: 'x' }], 2, 'bob');
  });

  it('sends edits as JSON with the current document id', () => {
    const session = makeSession({});
    session.connect('doc-1');
    const socket = FakeWebSocket.instances[0];
    socket.simulateOpen();
    socket.sent = [];

    session.sendEdit(1, [{ from: 0, to: 0, insert: 'a' }]);

    expect(JSON.parse(socket.sent[0])).toEqual({
      type: 'edit',
      docId: 'doc-1',
      baseVersion: 1,
      changes: [{ from: 0, to: 0, insert: 'a' }],
    });
  });

  it('reports an error instead of throwing when sending before the socket is open', () => {
    const onError = vi.fn();
    const session = makeSession({ onError });
    session.connect('doc-1');
    // Socket has not opened yet.
    session.sendEdit(0, [{ from: 0, to: 0, insert: 'a' }]);

    expect(onError).toHaveBeenCalledWith('Cannot send message: connection is not open.');
  });

  it('reports an error when sending an edit before joining any document', () => {
    const onError = vi.fn();
    const factory = (url: string) => new FakeWebSocket(url);
    const session = new CollabSession('ws://localhost:4000/ws', 'token', factory, { onError });

    session.sendEdit(0, []);

    expect(onError).toHaveBeenCalledWith('Cannot send an edit before joining a document.');
  });

  it('surfaces server-sent error messages via onError', () => {
    const onError = vi.fn();
    const session = makeSession({ onError });
    session.connect('doc-1');
    const socket = FakeWebSocket.instances[0];
    socket.simulateOpen();
    socket.simulateMessage({ type: 'error', message: 'Document not found.' });

    expect(onError).toHaveBeenCalledWith('Document not found.');
  });

  it('handles reverted messages by delivering the restored content and history', () => {
    const onReverted = vi.fn();
    const session = makeSession({ onReverted });
    session.connect('doc-1');
    const socket = FakeWebSocket.instances[0];
    socket.simulateOpen();
    const history = [{ version: 1, content: 'hi', timestamp: 1, author: 'alice' }];
    socket.simulateMessage({ type: 'reverted', docId: 'doc-1', content: 'hi', version: 5, history });

    expect(onReverted).toHaveBeenCalledWith('hi', 5, history);
  });

  it('attempts to reconnect automatically after an unexpected close', () => {
    const onConnectionStateChange = vi.fn();
    const session = makeSession({ onConnectionStateChange });
    session.connect('doc-1');
    const firstSocket = FakeWebSocket.instances[0];
    firstSocket.simulateOpen();

    firstSocket.simulateAbruptClose();
    expect(onConnectionStateChange).toHaveBeenCalledWith('closed');

    vi.advanceTimersByTime(1500);
    expect(FakeWebSocket.instances.length).toBe(2);
  });

  it('does not reconnect after an explicit disconnect', () => {
    const session = makeSession({});
    session.connect('doc-1');
    const socket = FakeWebSocket.instances[0];
    socket.simulateOpen();

    session.disconnect();
    vi.advanceTimersByTime(5000);

    expect(FakeWebSocket.instances.length).toBe(1);
  });

  it('gracefully reports malformed JSON messages instead of throwing', () => {
    const onError = vi.fn();
    const session = makeSession({ onError });
    session.connect('doc-1');
    const socket = FakeWebSocket.instances[0];
    socket.simulateOpen();
    socket.onmessage?.({ data: 'not json' });

    expect(onError).toHaveBeenCalledWith('Received a malformed message from the server.');
  });
});
