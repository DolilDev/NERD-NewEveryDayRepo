export type EntityType = 'player' | 'enemy' | 'item';

export type GameState = 'start' | 'playing' | 'paused' | 'ended';

export type CommandType =
  | 'move'
  | 'attack'
  | 'pickup'
  | 'look'
  | 'inventory'
  | 'pause'
  | 'resume'
  | 'help'
  | 'quit';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Command {
  type: CommandType;
  args: string[];
}

export interface Position {
  x: number;
  y: number;
}

export interface EntityInit {
  id: string;
  name: string;
  type: EntityType;
  x: number;
  y: number;
  health?: number;
  attack?: number;
}

export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameError';
  }
}

export class InvalidEntityError extends GameError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEntityError';
  }
}

export class InvalidCommandError extends GameError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCommandError';
  }
}

export interface GameOutcome {
  finished: boolean;
  won: boolean;
  reason: string;
}
