import { Command, CommandType, Direction, InvalidCommandError } from '../types';

const VALID_COMMANDS: CommandType[] = [
  'move',
  'attack',
  'pickup',
  'look',
  'inventory',
  'pause',
  'resume',
  'help',
  'quit'
];

const VALID_DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

const ARG_COUNTS: Record<CommandType, number> = {
  move: 1,
  attack: 1,
  pickup: 1,
  look: 0,
  inventory: 0,
  pause: 0,
  resume: 0,
  help: 0,
  quit: 0
};

/**
 * Turns raw user text (from stdin or a network socket) into a validated
 * Command object. Nothing downstream ever has to worry about malformed
 * input: if parse() returns, the command is well-formed.
 */
export class InputHandler {
  parse(raw: string): Command {
    if (typeof raw !== 'string' || raw.trim() === '') {
      throw new InvalidCommandError('Command cannot be empty');
    }

    const tokens = raw.trim().toLowerCase().split(/\s+/);
    const [verb, ...args] = tokens;

    if (!this.isValidCommandType(verb)) {
      throw new InvalidCommandError(
        `Unknown command "${verb}". Type "help" to see the list of commands.`
      );
    }

    const expected = ARG_COUNTS[verb];
    if (args.length !== expected) {
      throw new InvalidCommandError(
        `Command "${verb}" expects ${expected} argument(s), got ${args.length}`
      );
    }

    if (verb === 'move' && !VALID_DIRECTIONS.includes(args[0] as Direction)) {
      throw new InvalidCommandError(
        `Invalid direction "${args[0]}". Use one of: ${VALID_DIRECTIONS.join(', ')}`
      );
    }

    return { type: verb, args };
  }

  isValidCommandType(value: string): value is CommandType {
    return (VALID_COMMANDS as string[]).includes(value);
  }

  helpText(): string {
    return [
      'Available commands:',
      '  move <up|down|left|right>  - move your character one tile',
      '  attack <entity name>       - attack an adjacent entity',
      '  pickup <item name>         - pick up an item on your tile',
      '  look                       - show nearby entities',
      '  inventory                  - show your collected items',
      '  pause / resume             - pause or resume the game',
      '  help                       - show this message',
      '  quit                       - exit the game'
    ].join('\n');
  }
}
