import { ClientMessage, ServerMessage, TextChange, DocumentSnapshot } from './types';

export interface CollabHandlers {
  onJoined?: (content: string, version: number, history: DocumentSnapshot[]) => void;
  onRemoteEdit?: (changes: TextChange[], version: number, author: string) => void;
  onReverted?: (content: string, version: number, history: DocumentSnapshot[]) => void;
  onError?: (message: string) => void;
  onPeerJoined?: (username: string) => void;
  onPeerLeft?: (username: string) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
}

export type ConnectionState = 'connecting' | 'open' | 'closed' | 'reconnecting';

/** Minimal shape of the WebSocket API this module depends on, so tests can inject a fake. */
export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

const OPEN_STATE = 1;
const MAX_RECONNECT_DELAY_MS = 10_000;

export class CollabSession {
  private socket: WebSocketLike | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosed = false;
  private currentDocId: string | null = null;

  constructor(
    private readonly wsUrl: string,
    private readonly token: string,
    private readonly createSocket: WebSocketFactory,
    private readonly handlers: CollabHandlers = {}
  ) {}

  connect(docId: string): void {
    this.manuallyClosed = false;
    this.currentDocId = docId;
    this.openSocket();
  }

  private openSocket(): void {
    this.handlers.onConnectionStateChange?.(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');
    const url = `${this.wsUrl}?token=${encodeURIComponent(this.token)}`;
    const socket = this.createSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.handlers.onConnectionStateChange?.('open');
      if (this.currentDocId) {
        this.sendRaw({ type: 'join', docId: this.currentDocId });
      }
    };

    socket.onmessage = (event) => {
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data);
      } catch {
        this.handlers.onError?.('Received a malformed message from the server.');
        return;
      }
      this.dispatch(message);
    };

    socket.onerror = () => {
      this.handlers.onError?.('WebSocket connection error.');
    };

    socket.onclose = () => {
      this.handlers.onConnectionStateChange?.('closed');
      if (!this.manuallyClosed) {
        this.scheduleReconnect();
      }
    };
  }

  private dispatch(message: ServerMessage): void {
    switch (message.type) {
      case 'joined':
        this.handlers.onJoined?.(message.content, message.version, message.history);
        break;
      case 'remote-edit':
        this.handlers.onRemoteEdit?.(message.changes, message.version, message.author);
        break;
      case 'reverted':
        this.handlers.onReverted?.(message.content, message.version, message.history);
        break;
      case 'error':
        this.handlers.onError?.(message.message);
        break;
      case 'peer-joined':
        this.handlers.onPeerJoined?.(message.username);
        break;
      case 'peer-left':
        this.handlers.onPeerLeft?.(message.username);
        break;
      default:
        this.handlers.onError?.('Received an unknown message type from the server.');
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, MAX_RECONNECT_DELAY_MS);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manuallyClosed) this.openSocket();
    }, delay);
  }

  sendEdit(baseVersion: number, changes: TextChange[]): void {
    if (!this.currentDocId) {
      this.handlers.onError?.('Cannot send an edit before joining a document.');
      return;
    }
    this.sendRaw({ type: 'edit', docId: this.currentDocId, baseVersion, changes });
  }

  sendRevert(toVersion: number): void {
    if (!this.currentDocId) {
      this.handlers.onError?.('Cannot revert before joining a document.');
      return;
    }
    this.sendRaw({ type: 'revert', docId: this.currentDocId, toVersion });
  }

  private sendRaw(message: ClientMessage): void {
    if (this.socket && this.socket.readyState === OPEN_STATE) {
      this.socket.send(JSON.stringify(message));
    } else {
      this.handlers.onError?.('Cannot send message: connection is not open.');
    }
  }

  disconnect(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
  }
}
