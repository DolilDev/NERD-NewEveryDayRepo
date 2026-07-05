import { GameEngine } from './engine/GameEngine';

/**
 * Populates a fresh engine with a small default scenario: one goblin,
 * one orc and a healing potion. Used by both the single-player CLI and
 * the multiplayer server so they share the exact same starting world.
 */
export function seedDefaultWorld(engine: GameEngine): void {
  engine.entities.add({ id: 'goblin-1', name: 'Goblin', type: 'enemy', x: 3, y: 2, health: 6, attack: 2 });
  engine.entities.add({ id: 'orc-1', name: 'Orc', type: 'enemy', x: 6, y: 6, health: 12, attack: 4 });
  engine.entities.add({ id: 'potion-1', name: 'Potion', type: 'item', x: 1, y: 1 });
}

export function addPlayer(engine: GameEngine, id: string, name: string, x = 0, y = 0) {
  return engine.entities.add({ id, name, type: 'player', x, y, health: 20, attack: 3 });
}
