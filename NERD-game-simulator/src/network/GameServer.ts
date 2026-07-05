import * as net from 'net';
import { GameEngine } from '../engine/GameEngine';
import { GameError } from '../types';
import { seedDefaultWorld, addPlayer } from '../world';

const DEFAULT_PORT = 4090;
const SPAWN_POINTS = [
  { x: 0, y: 0 },
  { x: 9, y: 0 },
  { x: 0, y: 9 },
  { x: 9, y: 9 }
];

interface ConnectedClient {
  id: string;
  name: string;
  socket: net.Socket;
  buffer: string;
}

/**
 * Multiplayer twist: a plain TCP server (no external dependencies) that
 * lets several players join the same GameEngine instance at once. Each
 * socket connection becomes one 'player' entity. Commands typed by a
 * client are executed against the shared engine, and the resulting state
 * is broadcast as a line of JSON to every connected client so all
 * terminals stay in sync ("game state synchronization").
 */
export class GameServer {
  private server: net.Server;
  private engine: GameEngine;
  private clients: Map<string, ConnectedClient> = new Map();
  private nextClientIndex = 0;

  constructor(private port: number = DEFAULT_PORT) {
    this.engine = new GameEngine();
    seedDefaultWorld(this.engine);
    this.engine.start();

    this.server = net.createServer((socket) => this.handleConnection(socket));
  }

  listen(): void {
    this.server.listen(this.port, () => {
      console.log(`GameServer listening on port ${this.port}`);
    });
  }

  private handleConnection(socket: net.Socket): void {
    if (this.clients.size >= SPAWN_POINTS.length) {
      socket.write('Server full. Try again later.\n');
      socket.end();
      return;
    }

    const index = this.nextClientIndex++;
    const id = `player-${index}`;
    const name = `Player${index + 1}`;
    const spawn = SPAWN_POINTS[index % SPAWN_POINTS.length];

    try {
      addPlayer(this.engine, id, name, spawn.x, spawn.y);
    } catch (err) {
      socket.write(`Could not join: ${(err as Error).message}\n`);
      socket.end();
      return;
    }

    const client: ConnectedClient = { id, name, socket, buffer: '' };
    this.clients.set(id, client);

    socket.write(`Welcome, ${name}! You joined at (${spawn.x}, ${spawn.y}).\n`);
    socket.write(this.engine.input.helpText() + '\n');
    this.broadcast(`${name} has joined the game.`, id);

    socket.on('data', (data) => {
      // TCP is a byte stream: one data event may contain zero, one, or
      // several newline-terminated commands, and a command may even be
      // split across two events. Buffer per-client and only act on
      // complete lines.
      client.buffer += data.toString();
      const lines = client.buffer.split('\n');
      client.buffer = lines.pop() ?? '';
      for (const line of lines) {
        const raw = line.trim();
        if (raw === '') continue;
        this.handleCommand(client, raw);
      }
    });

    socket.on('close', () => this.handleDisconnect(id));
    socket.on('error', () => this.handleDisconnect(id));
  }

  private handleCommand(client: ConnectedClient, raw: string): void {
    try {
      const result = this.engine.processRawInput(client.id, raw);
      client.socket.write(`${result}\n`);
      this.broadcast(`[${client.name}] ${raw} -> ${result}`, client.id);
    } catch (err) {
      if (err instanceof GameError) {
        client.socket.write(`! ${err.message}\n`);
      } else {
        client.socket.write(`! Unexpected error: ${(err as Error).message}\n`);
      }
    }

    if (this.engine.getState() === 'ended') {
      this.broadcast('Game has ended.', undefined);
    }
  }

  private handleDisconnect(id: string): void {
    const client = this.clients.get(id);
    if (!client) return;
    this.clients.delete(id);
    if (this.engine.entities.has(id)) {
      this.engine.entities.remove(id);
    }
    this.broadcast(`${client.name} disconnected.`, id);
  }

  private broadcast(message: string, excludeId?: string): void {
    for (const [id, client] of this.clients.entries()) {
      if (id === excludeId) continue;
      client.socket.write(`* ${message}\n`);
    }
  }

  close(): void {
    this.server.close();
  }
}

if (require.main === module) {
  const port = process.argv[2] ? parseInt(process.argv[2], 10) : DEFAULT_PORT;
  new GameServer(port).listen();
}
