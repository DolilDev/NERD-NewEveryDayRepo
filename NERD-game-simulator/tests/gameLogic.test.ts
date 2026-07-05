import { EntityManager } from '../src/entities/EntityManager';
import { GameLogic } from '../src/logic/GameLogic';
import { GameError } from '../src/types';

describe('GameLogic', () => {
  let manager: EntityManager;
  let logic: GameLogic;

  beforeEach(() => {
    manager = new EntityManager();
    logic = new GameLogic(manager);
  });

  describe('movement', () => {
    it('moves an entity in a direction', () => {
      manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 5, y: 5 });
      const entity = logic.moveEntity('p1', 'up');
      expect(entity.y).toBe(4);
    });

    it('throws when moving a dead entity', () => {
      const enemy = manager.add({ id: 'e1', name: 'Goblin', type: 'enemy', x: 5, y: 5, health: 1 });
      enemy.takeDamage(1);
      expect(() => logic.moveEntity('e1', 'up')).toThrow(GameError);
    });

    it('throws when blocked by another entity', () => {
      manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 5, y: 5 });
      manager.add({ id: 'e1', name: 'Goblin', type: 'enemy', x: 5, y: 4 });
      expect(() => logic.moveEntity('p1', 'up')).toThrow(GameError);
    });

    it('allows moving onto an item tile', () => {
      manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 5, y: 5 });
      manager.add({ id: 'i1', name: 'Potion', type: 'item', x: 5, y: 4 });
      expect(() => logic.moveEntity('p1', 'up')).not.toThrow();
    });
  });

  describe('attack', () => {
    it('deals damage to an adjacent target', () => {
      manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 5, y: 5, attack: 3 });
      manager.add({ id: 'e1', name: 'Goblin', type: 'enemy', x: 5, y: 6, health: 10 });
      const result = logic.attack('p1', 'Goblin');
      expect(result.damage).toBe(3);
      expect(result.target.health).toBe(7);
    });

    it('throws when target is out of range', () => {
      manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 0, y: 0 });
      manager.add({ id: 'e1', name: 'Goblin', type: 'enemy', x: 9, y: 9 });
      expect(() => logic.attack('p1', 'Goblin')).toThrow(GameError);
    });

    it('throws when target is an item', () => {
      manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 5, y: 5 });
      manager.add({ id: 'i1', name: 'Potion', type: 'item', x: 5, y: 6 });
      expect(() => logic.attack('p1', 'Potion')).toThrow(GameError);
    });

    it('throws when target is already dead', () => {
      manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 5, y: 5 });
      const enemy = manager.add({ id: 'e1', name: 'Goblin', type: 'enemy', x: 5, y: 6, health: 1 });
      enemy.takeDamage(1);
      expect(() => logic.attack('p1', 'Goblin')).toThrow(GameError);
    });

    it('throws when attacker is dead', () => {
      const hero = manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 5, y: 5, health: 1 });
      manager.add({ id: 'e1', name: 'Goblin', type: 'enemy', x: 5, y: 6 });
      hero.takeDamage(1);
      expect(() => logic.attack('p1', 'Goblin')).toThrow(GameError);
    });
  });

  describe('pickup', () => {
    it('picks up an item on the same tile', () => {
      manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 5, y: 5 });
      manager.add({ id: 'i1', name: 'Potion', type: 'item', x: 5, y: 5 });
      const { entity } = logic.pickup('p1', 'Potion');
      expect(entity.inventory).toContain('Potion');
      expect(manager.has('i1')).toBe(false);
    });

    it('throws when item is not on the same tile', () => {
      manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 5, y: 5 });
      manager.add({ id: 'i1', name: 'Potion', type: 'item', x: 1, y: 1 });
      expect(() => logic.pickup('p1', 'Potion')).toThrow(GameError);
    });

    it('throws when target is not an item', () => {
      const hero = manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 5, y: 5 });
      manager.add({ id: 'e1', name: 'Goblin', type: 'enemy', x: 8, y: 8 });
      // Move the hero onto the goblin's tile directly (bypassing the
      // manager's occupancy check, which only applies at creation time)
      // so we can isolate the "target is not an item" rule in pickup().
      hero.x = 8;
      hero.y = 8;
      expect(() => logic.pickup('p1', 'Goblin')).toThrow(GameError);
    });
  });

  describe('checkOutcome', () => {
    it('reports in-progress when both sides are alive', () => {
      manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 0, y: 0 });
      manager.add({ id: 'e1', name: 'Goblin', type: 'enemy', x: 1, y: 1 });
      expect(logic.checkOutcome().finished).toBe(false);
    });

    it('reports a win when all enemies are dead', () => {
      manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 0, y: 0 });
      const enemy = manager.add({ id: 'e1', name: 'Goblin', type: 'enemy', x: 1, y: 1, health: 1 });
      enemy.takeDamage(1);
      const outcome = logic.checkOutcome();
      expect(outcome.finished).toBe(true);
      expect(outcome.won).toBe(true);
    });

    it('reports a loss when all players are dead', () => {
      const hero = manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 0, y: 0, health: 1 });
      manager.add({ id: 'e1', name: 'Goblin', type: 'enemy', x: 1, y: 1 });
      hero.takeDamage(1);
      const outcome = logic.checkOutcome();
      expect(outcome.finished).toBe(true);
      expect(outcome.won).toBe(false);
    });
  });
});
