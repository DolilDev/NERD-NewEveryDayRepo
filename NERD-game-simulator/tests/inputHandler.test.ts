import { InputHandler } from '../src/input/InputHandler';
import { InvalidCommandError } from '../src/types';

describe('InputHandler', () => {
  let handler: InputHandler;

  beforeEach(() => {
    handler = new InputHandler();
  });

  it('parses a simple no-arg command', () => {
    expect(handler.parse('look')).toEqual({ type: 'look', args: [] });
  });

  it('parses a command with one argument, case-insensitively', () => {
    expect(handler.parse('MOVE up')).toEqual({ type: 'move', args: ['up'] });
  });

  it('trims surrounding whitespace and collapses internal spaces', () => {
    expect(handler.parse('  attack    goblin  ')).toEqual({ type: 'attack', args: ['goblin'] });
  });

  it('throws on empty input', () => {
    expect(() => handler.parse('')).toThrow(InvalidCommandError);
    expect(() => handler.parse('   ')).toThrow(InvalidCommandError);
  });

  it('throws on unknown command', () => {
    expect(() => handler.parse('dance')).toThrow(InvalidCommandError);
  });

  it('throws when wrong number of arguments is given', () => {
    expect(() => handler.parse('move')).toThrow(InvalidCommandError);
    expect(() => handler.parse('look extra')).toThrow(InvalidCommandError);
  });

  it('throws on invalid move direction', () => {
    expect(() => handler.parse('move sideways')).toThrow(InvalidCommandError);
  });

  it('accepts all valid directions', () => {
    for (const dir of ['up', 'down', 'left', 'right']) {
      expect(() => handler.parse(`move ${dir}`)).not.toThrow();
    }
  });

  it('returns non-empty help text', () => {
    expect(handler.helpText().length).toBeGreaterThan(0);
  });
});
