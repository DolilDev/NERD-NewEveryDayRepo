import { EntityInit, EntityType, InvalidEntityError } from '../types';

const BOARD_MIN = 0;
const BOARD_MAX = 9; // 10x10 board, coordinates 0..9

/**
 * Represents any object that lives on the game board: a player, an enemy
 * or an item. Items are stationary and have no health/attack relevance
 * but share the same shape for simplicity of storage and lookup.
 */
export class Entity {
  public readonly id: string;
  public name: string;
  public readonly type: EntityType;
  public x: number;
  public y: number;
  public health: number;
  public attack: number;
  public alive: boolean;
  public inventory: string[];

  constructor(init: EntityInit) {
    if (!init.id || init.id.trim() === '') {
      throw new InvalidEntityError('Entity id must be a non-empty string');
    }
    if (!init.name || init.name.trim() === '') {
      throw new InvalidEntityError('Entity name must be a non-empty string');
    }
    if (!['player', 'enemy', 'item'].includes(init.type)) {
      throw new InvalidEntityError(`Unknown entity type: ${init.type}`);
    }
    if (!Entity.isWithinBounds(init.x, init.y)) {
      throw new InvalidEntityError(
        `Entity position out of bounds: (${init.x}, ${init.y})`
      );
    }

    this.id = init.id;
    this.name = init.name;
    this.type = init.type;
    this.x = init.x;
    this.y = init.y;
    this.health = init.health ?? (init.type === 'item' ? 0 : 10);
    this.attack = init.attack ?? (init.type === 'item' ? 0 : 2);
    this.alive = true;
    this.inventory = [];
  }

  static isWithinBounds(x: number, y: number): boolean {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= BOARD_MIN &&
      x <= BOARD_MAX &&
      y >= BOARD_MIN &&
      y <= BOARD_MAX
    );
  }

  static get bounds() {
    return { min: BOARD_MIN, max: BOARD_MAX };
  }

  moveTo(x: number, y: number): void {
    if (!Entity.isWithinBounds(x, y)) {
      throw new InvalidEntityError(
        `Cannot move ${this.name}: position (${x}, ${y}) is out of bounds`
      );
    }
    this.x = x;
    this.y = y;
  }

  takeDamage(amount: number): void {
    if (amount < 0) {
      throw new InvalidEntityError('Damage amount cannot be negative');
    }
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) {
      this.alive = false;
    }
  }

  heal(amount: number): void {
    if (amount < 0) {
      throw new InvalidEntityError('Heal amount cannot be negative');
    }
    this.health += amount;
  }

  isAdjacentTo(other: Entity): boolean {
    const dx = Math.abs(this.x - other.x);
    const dy = Math.abs(this.y - other.y);
    return dx + dy === 1;
  }

  toString(): string {
    return `${this.name}[${this.type}] @ (${this.x},${this.y}) HP:${this.health}`;
  }
}
