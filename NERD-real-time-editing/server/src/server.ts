import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { WebSocket, WebSocketServer } from 'ws';
import { URL } from 'url';

import { registerUser, loginUser, verifyToken, AuthError } from './auth';
import {
  applyDocumentEdit,
  createDocument,
  getDocument,
  listDocumentsForUser,
  revertDocument,
  DocumentError,
} from './documentManager';
import { ClientMessage, ServerMessage } from './types';

const PORT = Number(process.env.PORT) || 4000;

const app = express();
app.use(cors());
app.use(express.json());

// ---------- REST: auth & document listing ----------

app.post('/api/register', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body ?? {};
    const { user, token } = registerUser(username, password);
    res.status(201).json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    handleHttpError(err, res);
  }
});

app.post('/api/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body ?? {};
    const { user, token } = loginUser(username, password);
    res.status(200).json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    handleHttpError(err, res);
  }
});

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: 'Missing bearer token.' });
    return;
  }
  try {
    (req as any).user = verifyToken(token);
    next();
  } catch (err) {
    handleHttpError(err, res);
  }
}

app.get('/api/documents', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ documents: listDocumentsForUser(user.sub) });
});

app.post('/api/documents', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { title } = req.body ?? {};
  const doc = createDocument(user.sub, title);
  res.status(201).json({ document: doc });
});

function handleHttpError(err: unknown, res: Response) {
  if (err instanceof AuthError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof DocumentError) {
    res.status(404).json({ error: err.message });
    return;
  }
  // eslint-disable-next-line no-console
  console.error('Unexpected server error:', err);
  res.status(500).json({ error: 'Internal server error.' });
}

// ---------- WebSocket: real-time collaboration ----------

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface Client {
  socket: WebSocket;
  username: string;
  userId: string;
  docId?: string;
}

const clients = new Set<Client>();

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function broadcastToDoc(docId: string, message: ServerMessage, exclude?: WebSocket) {
  for (const client of clients) {
    if (client.docId === docId && client.socket !== exclude) {
      send(client.socket, message);
    }
  }
}

wss.on('connection', (socket: WebSocket, req) => {
  let client: Client;

  try {
    const url = new URL(req.url || '', 'http://localhost');
    const token = url.searchParams.get('token') || '';
    const payload = verifyToken(token);
    client = { socket, username: payload.username, userId: payload.sub };
    clients.add(client);
  } catch {
    send(socket, { type: 'error', message: 'Authentication failed. Please log in again.' });
    socket.close();
    return;
  }

  socket.on('message', (raw) => {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(socket, { type: 'error', message: 'Malformed message: expected JSON.' });
      return;
    }

    try {
      handleClientMessage(client, message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown server error.';
      send(socket, { type: 'error', message: msg });
    }
  });

  socket.on('close', () => {
    clients.delete(client);
    if (client.docId) {
      broadcastToDoc(client.docId, { type: 'peer-left', username: client.username });
    }
  });

  socket.on('error', () => {
    // Ensure a broken socket doesn't linger in the client set.
    clients.delete(client);
  });
});

function handleClientMessage(client: Client, message: ClientMessage) {
  switch (message.type) {
    case 'join': {
      const doc = getDocument(message.docId);
      client.docId = doc.id;
      send(client.socket, {
        type: 'joined',
        docId: doc.id,
        content: doc.content,
        version: doc.version,
        history: doc.history,
      });
      broadcastToDoc(doc.id, { type: 'peer-joined', username: client.username }, client.socket);
      break;
    }
    case 'edit': {
      if (client.docId !== message.docId) {
        throw new DocumentError('You must join a document before editing it.');
      }
      const doc = applyDocumentEdit(message.docId, message.baseVersion, message.changes, client.username);
      broadcastToDoc(
        doc.id,
        { type: 'remote-edit', docId: doc.id, changes: message.changes, version: doc.version, author: client.username },
        client.socket
      );
      break;
    }
    case 'revert': {
      if (client.docId !== message.docId) {
        throw new DocumentError('You must join a document before reverting it.');
      }
      const doc = revertDocument(message.docId, message.toVersion, client.username);
      broadcastToDoc(doc.id, {
        type: 'reverted',
        docId: doc.id,
        content: doc.content,
        version: doc.version,
        history: doc.history,
      });
      break;
    }
    default:
      throw new DocumentError('Unknown message type.');
  }
}

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Collab editor server listening on http://localhost:${PORT}`);
});

export { app, server };
