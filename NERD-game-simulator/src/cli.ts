import * as readline from 'readline';
import { GameEngine } from './engine/GameEngine';
import { GameError } from './types';
import { seedDefaultWorld, addPlayer } from './world';

function main() {
  const engine = new GameEngine();
  seedDefaultWorld(engine);
  addPlayer(engine, 'hero-1', 'Hero', 0, 0);
  engine.start();

  console.log('=== NERD Game Simulator ===');
  console.log('You are Hero. Defeat the Goblin and the Orc to win.');
  console.log(engine.input.helpText());
  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.setPrompt('> ');
  rl.prompt();

  rl.on('line', (line) => {
    try {
      const result = engine.processRawInput('hero-1', line);
      console.log(result);
    } catch (err) {
      if (err instanceof GameError) {
        console.log(`! ${err.message}`);
      } else {
        console.log('! Unexpected error:', (err as Error).message);
      }
    }

    if (engine.getState() === 'ended') {
      rl.close();
      return;
    }
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('Simulation ended.');
    process.exit(0);
  });
}

if (require.main === module) {
  main();
}
