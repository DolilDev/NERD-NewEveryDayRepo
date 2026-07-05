import { Entity } from '../src/entities/Entity';
import { InvalidEntityError } from '../src/types';

describe('Entity', () => {
  it('creates a valid entity with default health and attack', () => {
    const e = new Entity({ id: 'p1', name: 'Hero', type: 'player', x: 0, y: 0 });
    expect(e.health).toBe(10);
    expect(e.attack).toBe(2);
    expect(e.alive).toBe(true);
  });

  it('throws for empty id', () => {
    expect(() => new Entity({ id: '', name: 'Hero', type: 'player', x: 0, y: 0 })).toThrow(
      InvalidEntityError
    );
  });

  it('throws for empty name', () => {
    expect(() => new Entity({ id: 'p1', name: '', type: 'player', x: 0, y: 0 })).toThrow(
      InvalidEntityError
    );
  });

  it('throws for invalid type', () => {
    expect(
      () => new Entity({ id: 'p1', name: 'Hero', type: 'dragon' as any, x: 0, y: 0 })
    ).toThrow(InvalidEntityError);
  });

  it('throws for out-of-bounds position', () => {
    expect(() => new Entity({ id: 'p1', name: 'Hero', type: 'player', x: -1, y: 0 })).toThrow(
      InvalidEntityError
    );
    expect(() => new Entity({ id: 'p1', name: 'Hero', type: 'player', x: 10, y: 0 })).toThrow(
      InvalidEntityError
    );
  });

  it('moves within bounds', () => {
    const e = new Entity({ id: 'p1', name: 'Hero', type: 'player', x: 0, y: 0 });
    e.moveTo(1, 1);
    expect(e.x).toBe(1);
    expect(e.y).toBe(1);
  });

  it('throws when moving out of bounds', () => {
    const e = new Entity({ id: 'p1', name: 'Hero', type: 'player', x: 0, y: 0 });
    expect(() => e.moveTo(-1, 0)).toThrow(InvalidEntityError);
  });

  it('takes damage and dies at zero health', () => {
    const e = new Entity({ id: 'e1', name: 'Goblin', type: 'enemy', x: 0, y: 0, health: 5 });
    e.takeDamage(5);
    expect(e.health).toBe(0);
    expect(e.alive).toBe(false);
  });

  it('does not go below zero health', () => {
    const e = new Entity({ id: 'e1', name: 'Goblin', type: 'enemy', x: 0, y: 0, health: 5 });
    e.takeDamage(50);
    expect(e.health).toBe(0);
  });

  it('throws on negative damage', () => {
    const e = new Entity({ id: 'e1', name: 'Goblin', type: 'enemy', x: 0, y: 0 });
    expect(() => e.takeDamage(-1)).toThrow(InvalidEntityError);
  });

  it('heals correctly and rejects negative heal', () => {
    const e = new Entity({ id: 'e1', name: 'Goblin', type: 'enemy', x: 0, y: 0, health: 5 });
    e.heal(3);
    expect(e.health).toBe(8);
    expect(() => e.heal(-1)).toThrow(InvalidEntityError);
  });

  it('detects adjacency correctly', () => {
    const a = new Entity({ id: 'a', name: 'A', type: 'player', x: 1, y: 1 });
    const b = new Entity({ id: 'b', name: 'B', type: 'enemy', x: 1, y: 2 });
    const c = new Entity({ id: 'c', name: 'C', type: 'enemy', x: 3, y: 3 });
    expect(a.isAdjacentTo(b)).toBe(true);
    expect(a.isAdjacentTo(c)).toBe(false);
  });
});
