import { EntityManager } from '../entities/EntityManager';
import { GameLogic } from '../logic/GameLogic';
import { InputHandler } from '../input/InputHandler';
import { Command, GameError, GameState } from '../types';

export interface EngineEvent {
  type: 'state-change' | 'message' | 'game-over';
  payload: string;
}

type Listener = (event: EngineEvent) => void;

const VALID_TRANSITIONS: Record<GameState, GameState[]> = {
  start: ['playing'],
  playing: ['paused', 'ended'],
  paused: ['playing', 'ended'],
  ended: []
};

/**
 * Owns the current GameState and the tick loop. GameEngine deliberately
 * knows nothing about stdin/sockets - it only exposes submitCommand() and
 * an event listener, so both the single-player CLI and the multiplayer
 * server can drive it the same way.
 */
export class GameEngine {
  private state: GameState = 'start';
  private listeners: Listener[] = [];
  public readonly entities: EntityManager;
  public readonly logic: GameLogic;
  public readonly input: InputHandler;

  constructor(
    entities: EntityManager = new EntityManager(),
    logic?: GameLogic,
    input: InputHandler = new InputHandler()
  ) {
    this.entities = entities;
    this.logic = logic ?? new GameLogic(entities);
    this.input = input;
  }

  onEvent(listener: Listener): void {
    this.listeners.push(listener);
  }

  private emit(event: EngineEvent): void {
    this.listeners.forEach((l) => l(event));
  }

  getState(): GameState {
    return this.state;
  }

  private transitionTo(next: GameState): void {
    const allowed = VALID_TRANSITIONS[this.state];
    if (!allowed.includes(next)) {
      throw new GameError(`Cannot transition from "${this.state}" to "${next}"`);
    }
    this.state = next;
    this.emit({ type: 'state-change', payload: next });
  }

  start(): void {
    this.transitionTo('playing');
  }

  pause(): void {
    this.transitionTo('paused');
  }

  resume(): void {
    this.transitionTo('playing');
  }

  end(reason: string): void {
    this.transitionTo('ended');
    this.emit({ type: 'game-over', payload: reason });
  }

  /**
   * Processes a single raw input line. Returns a human-readable result
   * message. Throws GameError/InvalidCommandError for invalid input so
   * callers (CLI or network layer) can decide how to surface it.
   */
  processRawInput(playerId: string, raw: string): string {
    const command = this.input.parse(raw);
    return this.execute(playerId, command);
  }

  execute(playerId: string, command: Command): string {
    if (command.type === 'help') {
      return this.input.helpText();
    }

    if (command.type === 'pause') {
      if (this.state !== 'playing') {
        throw new GameError('Game is not currently playing, cannot pause');
      }
      this.pause();
      return 'Game paused.';
    }

    if (command.type === 'resume') {
      if (this.state !== 'paused') {
        throw new GameError('Game is not paused, cannot resume');
      }
      this.resume();
      return 'Game resumed.';
    }

    if (command.type === 'quit') {
      this.end('Player quit the game.');
      return 'Goodbye!';
    }

    if (this.state !== 'playing') {
      throw new GameError(
        `Cannot process "${command.type}" while game state is "${this.state}"`
      );
    }

    let message = '';
    switch (command.type) {
      case 'move': {
        const entity = this.logic.moveEntity(playerId, command.args[0] as any);
        message = `${entity.name} moved ${command.args[0]} to (${entity.x}, ${entity.y})`;
        break;
      }
      case 'attack': {
        const { attacker, target, damage } = this.logic.attack(playerId, command.args[0]);
        message = `${attacker.name} hit ${target.name} for ${damage} damage (HP left: ${target.health})`;
        break;
      }
      case 'pickup': {
        const { entity, item } = this.logic.pickup(playerId, command.args[0]);
        message = `${entity.name} picked up ${item.name}`;
        break;
      }
      case 'look': {
        message = this.entities
          .getAll()
          .map((e) => e.toString())
          .join('\n');
        break;
      }
      case 'inventory': {
        const entity = this.entities.get(playerId);
        message =
          entity.inventory.length > 0
            ? `Inventory: ${entity.inventory.join(', ')}`
            : 'Inventory is empty';
        break;
      }
      default:
        throw new GameError(`Unhandled command type: ${command.type}`);
    }

    const outcome = this.logic.checkOutcome();
    this.entities.removeDead();
    if (outcome.finished) {
      this.end(outcome.reason);
      message += `\n${outcome.reason}`;
    }

    return message;
  }
}
