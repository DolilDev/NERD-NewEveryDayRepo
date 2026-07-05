import { EntityManager } from '../entities/EntityManager';
import { Entity } from '../entities/Entity';
import { Direction, GameError, GameOutcome, InvalidEntityError } from '../types';

const DELTA: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

/**
 * Encapsulates the rules of the game: movement, combat, item pickup and
 * the win/loss check. Keeping this separate from EntityManager means the
 * "what is allowed to happen" logic doesn't leak into "how entities are
 * stored" logic.
 */
export class GameLogic {
  constructor(private entities: EntityManager) {}

  moveEntity(entityId: string, direction: Direction): Entity {
    const entity = this.entities.get(entityId);
    if (!entity.alive) {
      throw new GameError(`${entity.name} is dead and cannot move`);
    }
    const delta = DELTA[direction];
    if (!delta) {
      throw new GameError(`Unknown direction: ${direction}`);
    }
    const targetX = entity.x + delta.dx;
    const targetY = entity.y + delta.dy;

    const occupant = this.entities.findAtPosition(targetX, targetY);
    if (occupant && occupant.type !== 'item' && occupant.id !== entity.id) {
      throw new GameError(
        `Cannot move there: ${occupant.name} is blocking the way`
      );
    }
    entity.moveTo(targetX, targetY);
    return entity;
  }

  attack(attackerId: string, targetName: string): { attacker: Entity; target: Entity; damage: number } {
    const attacker = this.entities.get(attackerId);
    if (!attacker.alive) {
      throw new GameError(`${attacker.name} is dead and cannot attack`);
    }
    const target = this.entities.findByName(targetName);
    if (target.type === 'item') {
      throw new GameError(`${target.name} is an item and cannot be attacked`);
    }
    if (!target.alive) {
      throw new GameError(`${target.name} is already dead`);
    }
    if (!attacker.isAdjacentTo(target)) {
      throw new GameError(`${target.name} is too far away to attack`);
    }

    target.takeDamage(attacker.attack);
    return { attacker, target, damage: attacker.attack };
  }

  pickup(entityId: string, itemName: string): { entity: Entity; item: Entity } {
    const entity = this.entities.get(entityId);
    const item = this.entities.findByName(itemName);
    if (item.type !== 'item') {
      throw new GameError(`${item.name} is not an item`);
    }
    if (entity.x !== item.x || entity.y !== item.y) {
      throw new GameError(`${item.name} is not at your current position`);
    }
    entity.inventory.push(item.name);
    this.entities.remove(item.id);
    return { entity, item };
  }

  /**
   * Win condition: all enemies are defeated and at least one player survives.
   * Loss condition: all players are dead.
   */
  checkOutcome(): GameOutcome {
    const players = this.entities.getByType('player');
    const enemies = this.entities.getByType('enemy');

    const alivePlayers = players.filter((p) => p.alive);
    const aliveEnemies = enemies.filter((e) => e.alive);

    if (alivePlayers.length === 0 && players.length > 0) {
      return { finished: true, won: false, reason: 'All players have fallen.' };
    }
    if (aliveEnemies.length === 0 && enemies.length > 0) {
      return { finished: true, won: true, reason: 'All enemies defeated!' };
    }
    return { finished: false, won: false, reason: 'Game in progress' };
  }
}
