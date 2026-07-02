# NERD Real-Time Editor

A minimal real-time collaborative text editor built with Node.js and WebSockets.

Features
- WebSocket-based collaboration using `ws`.
- Simple username authentication handshake.
- Presence tracking of active users.
- Versioned document store with conflict detection and recovery.
- Version history and revert capability.
- Client-side basic formatting (bold, italic).
- Unit tests for auth, document store and server logic.

Running locally

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open `http://localhost:3000` in multiple browser windows and join with a username.

Testing

Run the unit tests with:

```bash
npm test
```

Project structure

- `server.js` - app entry that starts Express and the WebSocket server.
- `src/` - server-side modules (`server.js`, `documentStore.js`, `auth.js`).
- `public/` - client files (HTML, CSS, JS).
- `tests/` - Jest unit tests.

Notes

This project uses a simple version-number based conflict detection strategy: clients include the last-known document version when sending updates. If the server detects a mismatch it replies with a `sync` message containing the current document state and version for the client to reconcile.

Contributions

This is a demo project; contributions and improvements (operational transforms, CRDTs, richer formatting, per-user cursors) are welcome.
