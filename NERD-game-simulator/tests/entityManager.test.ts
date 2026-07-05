import { EntityManager } from '../src/entities/EntityManager';
import { InvalidEntityError } from '../src/types';

describe('EntityManager', () => {
  let manager: EntityManager;

  beforeEach(() => {
    manager = new EntityManager();
  });

  it('adds an entity', () => {
    const e = manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 0, y: 0 });
    expect(manager.count()).toBe(1);
    expect(e.name).toBe('Hero');
  });

  it('throws when adding a duplicate id', () => {
    manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 0, y: 0 });
    expect(() =>
      manager.add({ id: 'p1', name: 'Hero2', type: 'player', x: 1, y: 1 })
    ).toThrow(InvalidEntityError);
  });

  it('throws when adding two non-item entities at the same position', () => {
    manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 0, y: 0 });
    expect(() =>
      manager.add({ id: 'e1', name: 'Goblin', type: 'enemy', x: 0, y: 0 })
    ).toThrow(InvalidEntityError);
  });

  it('allows an item to share a tile with a player', () => {
    manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 0, y: 0 });
    expect(() =>
      manager.add({ id: 'i1', name: 'Potion', type: 'item', x: 0, y: 0 })
    ).not.toThrow();
  });

  it('gets an existing entity', () => {
    manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 0, y: 0 });
    expect(manager.get('p1').name).toBe('Hero');
  });

  it('throws when getting a non-existent entity', () => {
    expect(() => manager.get('nope')).toThrow(InvalidEntityError);
  });

  it('removes an entity', () => {
    manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 0, y: 0 });
    manager.remove('p1');
    expect(manager.count()).toBe(0);
  });

  it('throws when removing a non-existent entity', () => {
    expect(() => manager.remove('ghost')).toThrow(InvalidEntityError);
  });

  it('finds entity by name case-insensitively', () => {
    manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 0, y: 0 });
    expect(manager.findByName('hero').id).toBe('p1');
  });

  it('throws when finding a non-existent name', () => {
    expect(() => manager.findByName('ghost')).toThrow(InvalidEntityError);
  });

  it('finds entity at a position', () => {
    manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 2, y: 3 });
    expect(manager.findAtPosition(2, 3)?.id).toBe('p1');
    expect(manager.findAtPosition(5, 5)).toBeUndefined();
  });

  it('filters by type', () => {
    manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 0, y: 0 });
    manager.add({ id: 'e1', name: 'Goblin', type: 'enemy', x: 1, y: 1 });
    expect(manager.getByType('enemy')).toHaveLength(1);
    expect(manager.getByType('player')).toHaveLength(1);
  });

  it('removes dead non-item entities and keeps items', () => {
    const enemy = manager.add({ id: 'e1', name: 'Goblin', type: 'enemy', x: 1, y: 1, health: 1 });
    manager.add({ id: 'i1', name: 'Potion', type: 'item', x: 2, y: 2 });
    enemy.takeDamage(1);
    const removed = manager.removeDead();
    expect(removed).toHaveLength(1);
    expect(manager.count()).toBe(1);
    expect(manager.has('i1')).toBe(true);
  });

  it('clears all entities', () => {
    manager.add({ id: 'p1', name: 'Hero', type: 'player', x: 0, y: 0 });
    manager.clear();
    expect(manager.count()).toBe(0);
  });
});
