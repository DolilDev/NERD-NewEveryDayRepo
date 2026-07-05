import * as net from 'net';
import * as readline from 'readline';

const DEFAULT_PORT = 4090;
const DEFAULT_HOST = '127.0.0.1';

/**
 * Thin client for GameServer: forwards stdin lines to the server and
 * prints whatever the server sends back. Run one of these per player.
 */
function main() {
  const port = process.argv[2] ? parseInt(process.argv[2], 10) : DEFAULT_PORT;
  const host = process.argv[3] ?? DEFAULT_HOST;

  const socket = net.createConnection({ port, host }, () => {
    console.log(`Connected to game server at ${host}:${port}`);
  });

  socket.on('data', (data) => {
    process.stdout.write(data.toString());
  });

  socket.on('close', () => {
    console.log('Disconnected from server.');
    process.exit(0);
  });

  socket.on('error', (err) => {
    console.error('Connection error:', err.message);
    process.exit(1);
  });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('line', (line) => {
    socket.write(line + '\n');
  });
}

if (require.main === module) {
  main();
}
