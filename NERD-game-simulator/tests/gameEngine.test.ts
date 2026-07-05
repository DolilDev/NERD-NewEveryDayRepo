import { GameEngine } from '../src/engine/GameEngine';
import { GameError, InvalidCommandError } from '../src/types';

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
    engine.entities.add({ id: 'p1', name: 'Hero', type: 'player', x: 5, y: 5, attack: 100 });
  });

  describe('state machine', () => {
    it('starts in the "start" state', () => {
      expect(engine.getState()).toBe('start');
    });

    it('transitions start -> playing', () => {
      engine.start();
      expect(engine.getState()).toBe('playing');
    });

    it('transitions playing -> paused -> playing', () => {
      engine.start();
      engine.pause();
      expect(engine.getState()).toBe('paused');
      engine.resume();
      expect(engine.getState()).toBe('playing');
    });

    it('throws on invalid transition', () => {
      expect(() => engine.pause()).toThrow(GameError);
    });

    it('emits state-change events', () => {
      const events: string[] = [];
      engine.onEvent((e) => {
        if (e.type === 'state-change') events.push(e.payload);
      });
      engine.start();
      engine.pause();
      expect(events).toEqual(['playing', 'paused']);
    });
  });

  describe('command execution', () => {
    it('rejects gameplay commands before the game has started', () => {
      expect(() => engine.execute('p1', { type: 'look', args: [] })).toThrow(GameError);
    });

    it('handles help regardless of state', () => {
      expect(engine.execute('p1', { type: 'help', args: [] })).toContain('Available commands');
    });

    it('processes a move command once playing', () => {
      engine.start();
      const result = engine.execute('p1', { type: 'move', args: ['up'] });
      expect(result).toContain('moved up');
    });

    it('processes raw input strings end-to-end', () => {
      engine.start();
      const result = engine.processRawInput('p1', 'move down');
      expect(result).toContain('moved down');
    });

    it('throws InvalidCommandError for malformed raw input', () => {
      engine.start();
      expect(() => engine.processRawInput('p1', 'fly')).toThrow(InvalidCommandError);
    });

    it('pauses and resumes via commands', () => {
      engine.start();
      expect(engine.execute('p1', { type: 'pause', args: [] })).toBe('Game paused.');
      expect(engine.getState()).toBe('paused');
      expect(engine.execute('p1', { type: 'resume', args: [] })).toBe('Game resumed.');
      expect(engine.getState()).toBe('playing');
    });

    it('ends the game on quit', () => {
      engine.start();
      engine.execute('p1', { type: 'quit', args: [] });
      expect(engine.getState()).toBe('ended');
    });

    it('throws when pausing while not playing', () => {
      expect(() => engine.execute('p1', { type: 'pause', args: [] })).toThrow(GameError);
    });

    it('throws when resuming while not paused', () => {
      engine.start();
      expect(() => engine.execute('p1', { type: 'resume', args: [] })).toThrow(GameError);
    });

    it('shows nearby entities with look', () => {
      engine.start();
      const result = engine.execute('p1', { type: 'look', args: [] });
      expect(result).toContain('Hero');
    });

    it('reports an empty inventory, then shows picked-up items', () => {
      engine.entities.add({ id: 'i1', name: 'Potion', type: 'item', x: 5, y: 5 });
      engine.start();
      expect(engine.execute('p1', { type: 'inventory', args: [] })).toBe('Inventory is empty');
      engine.execute('p1', { type: 'pickup', args: ['potion'] });
      expect(engine.execute('p1', { type: 'inventory', args: [] })).toBe('Inventory: Potion');
    });

    it('ends the game and reports a win once all enemies are dead', () => {
      engine.entities.add({ id: 'e1', name: 'Goblin', type: 'enemy', x: 5, y: 6, health: 1 });
      engine.start();
      const result = engine.execute('p1', { type: 'attack', args: ['goblin'] });
      expect(result).toContain('All enemies defeated');
      expect(engine.getState()).toBe('ended');
    });
  });
});
