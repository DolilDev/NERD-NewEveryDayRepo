import { Entity } from './Entity';
import { EntityInit, InvalidEntityError } from '../types';

/**
 * Owns the collection of live entities on the board and provides the only
 * sanctioned way to mutate it. All lookups that fail throw
 * InvalidEntityError rather than returning undefined, so callers can rely
 * on try/catch instead of null checks scattered through the codebase.
 */
export class EntityManager {
  private entities: Map<string, Entity> = new Map();

  add(init: EntityInit): Entity {
    if (this.entities.has(init.id)) {
      throw new InvalidEntityError(`Entity with id "${init.id}" already exists`);
    }
    const occupant = this.findAtPosition(init.x, init.y);
    if (occupant && occupant.type !== 'item' && init.type !== 'item') {
      throw new InvalidEntityError(
        `Position (${init.x}, ${init.y}) is already occupied by ${occupant.name}`
      );
    }
    const entity = new Entity(init);
    this.entities.set(entity.id, entity);
    return entity;
  }

  remove(id: string): void {
    if (!this.entities.has(id)) {
      throw new InvalidEntityError(`Cannot remove: entity "${id}" does not exist`);
    }
    this.entities.delete(id);
  }

  get(id: string): Entity {
    const entity = this.entities.get(id);
    if (!entity) {
      throw new InvalidEntityError(`Entity "${id}" does not exist`);
    }
    return entity;
  }

  has(id: string): boolean {
    return this.entities.has(id);
  }

  getAll(): Entity[] {
    return Array.from(this.entities.values());
  }

  getByType(type: Entity['type']): Entity[] {
    return this.getAll().filter((e) => e.type === type);
  }

  findByName(name: string): Entity {
    const found = this.getAll().find(
      (e) => e.name.toLowerCase() === name.toLowerCase()
    );
    if (!found) {
      throw new InvalidEntityError(`No entity named "${name}" was found`);
    }
    return found;
  }

  findAtPosition(x: number, y: number): Entity | undefined {
    return this.getAll().find((e) => e.x === x && e.y === y);
  }

  removeDead(): Entity[] {
    const dead = this.getAll().filter((e) => e.type !== 'item' && !e.alive);
    dead.forEach((e) => this.entities.delete(e.id));
    return dead;
  }

  count(): number {
    return this.entities.size;
  }

  clear(): void {
    this.entities.clear();
  }
}
